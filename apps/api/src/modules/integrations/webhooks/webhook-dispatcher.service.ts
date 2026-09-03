import crypto from 'crypto';
import { prisma } from '../../../lib/prisma';
import { OutboundWebhookStatus, Prisma } from '@prisma/client';
import { signWebhookPayload } from './webhook-signer';
import { validateWebhookUrl } from './ssrf.validator';
import { BadRequestError, NotFoundError } from '../../../utils/errors';

// Exponential backoff intervals in milliseconds
const RETRY_DELAYS_MS = [
  30 * 1000,        // Attempt 1 -> 30 seconds
  2 * 60 * 1000,     // Attempt 2 -> 2 minutes
  10 * 60 * 1000,   // Attempt 3 -> 10 minutes
  30 * 60 * 1000,   // Attempt 4 -> 30 minutes
];

const DEFAULT_TIMEOUT_MS = 8000;

export class WebhookDispatcherService {
  /**
   * Register a new webhook subscription for an API Client
   */
  async createSubscription(params: {
    clientId: string;
    url: string;
    subscribedEvents?: string[];
    secretKey?: string;
  }) {
    validateWebhookUrl(params.url);

    const generatedSecret = params.secretKey || `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const secretHash = crypto.createHash('sha256').update(generatedSecret).digest('hex');

    const subscription = await prisma.webhookSubscription.create({
      data: {
        clientId: params.clientId,
        url: params.url,
        secretHash,
        secretKey: generatedSecret,
        subscribedEvents: params.subscribedEvents || ['shipment.*'],
        isActive: true,
      },
      select: {
        id: true,
        clientId: true,
        url: true,
        isActive: true,
        subscribedEvents: true,
        createdAt: true,
      },
    });

    return {
      ...subscription,
      secretKey: generatedSecret, // Returned once during registration
    };
  }

  /**
   * List subscriptions for a client
   */
  async listSubscriptions(clientId: string) {
    return prisma.webhookSubscription.findMany({
      where: { clientId },
      select: {
        id: true,
        clientId: true,
        url: true,
        isActive: true,
        subscribedEvents: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete subscription
   */
  async deleteSubscription(id: string, clientId: string) {
    const existing = await prisma.webhookSubscription.findFirst({
      where: { id, clientId },
    });
    if (!existing) throw new NotFoundError('Webhook subscription not found');

    await prisma.webhookSubscription.delete({ where: { id } });
    return { success: true, message: 'Subscription removed' };
  }

  /**
   * Record and asynchronously dispatch an outbound integration event
   */
  async recordAndDispatch(event: string, payload: Record<string, unknown>, sellerId?: string | null): Promise<void> {
    try {
      // Find all subscriptions that listen to this event pattern
      const subscriptions = await prisma.webhookSubscription.findMany({
        where: {
          isActive: true,
          client: sellerId ? { sellerId } : undefined,
        },
      });

      for (const sub of subscriptions) {
        if (!this.matchesEventFilter(event, sub.subscribedEvents)) {
          continue;
        }

        const eventId = `evt_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        const webhookEvent = await prisma.outboundWebhookEvent.create({
          data: {
            subscriptionId: sub.id,
            eventId,
            event,
            payload: payload as Prisma.InputJsonValue,
            status: OutboundWebhookStatus.PENDING,
            attempts: 0,
            maxAttempts: 5,
          },
        });

        // Trigger immediate background delivery attempt
        this.deliverEvent(webhookEvent.id).catch((err) => {
          console.error(`[Webhook Dispatcher] Failed delivery for ${eventId}:`, err);
        });
      }
    } catch (error) {
      console.error('[Webhook Dispatcher] Failed to record outbound event:', error);
    }
  }

  /**
   * Attempt delivery of a specific OutboundWebhookEvent
   */
  async deliverEvent(eventId: string): Promise<boolean> {
    const record = await prisma.outboundWebhookEvent.findUnique({
      where: { id: eventId },
      include: { subscription: true },
    });

    if (!record || !record.subscription || !record.subscription.isActive) {
      return false;
    }

    const { subscription } = record;
    const timestamp = new Date().toISOString();
    const rawPayload = JSON.stringify({
      id: record.eventId,
      event: record.event,
      version: '1.0',
      createdAt: timestamp,
      data: record.payload,
    });

    const secret = subscription.secretKey || 'default_secret';
    const signature = signWebhookPayload(secret, timestamp, rawPayload);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const attemptNumber = record.attempts + 1;

    try {
      // Validate destination URL once more before dispatch
      validateWebhookUrl(subscription.url);

      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Courier-Event-Id': record.eventId,
          'X-Courier-Timestamp': timestamp,
          'X-Courier-Signature': signature,
          'X-Request-Id': record.eventId,
          'User-Agent': 'CourierPlatform-WebhookDispatcher/1.0',
        },
        body: rawPayload,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        await prisma.outboundWebhookEvent.update({
          where: { id: record.id },
          data: {
            status: OutboundWebhookStatus.DELIVERED,
            attempts: attemptNumber,
            lastAttemptAt: new Date(),
            responseStatus: response.status,
            lastError: null,
          },
        });
        return true;
      }

      // Permanent client errors (400, 401, 403, 404, 422) except rate limiting (429)
      const isPermanentFailure = response.status >= 400 && response.status < 500 && response.status !== 429;
      if (isPermanentFailure) {
        await prisma.outboundWebhookEvent.update({
          where: { id: record.id },
          data: {
            status: OutboundWebhookStatus.FAILED,
            attempts: attemptNumber,
            lastAttemptAt: new Date(),
            responseStatus: response.status,
            lastError: `HTTP ${response.status} Client Error (Permanent)`,
          },
        });
        return false;
      }

      // Transient failure (5xx or 429)
      await this.handleTransientFailure(record, attemptNumber, `HTTP ${response.status} Server Error`);
      return false;
    } catch (error: any) {
      clearTimeout(timeout);
      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out after 8s' : error.message || 'Network connection failure';
      await this.handleTransientFailure(record, attemptNumber, errorMessage);
      return false;
    }
  }

  /**
   * Handle transient failures with exponential backoff or dead letter
   */
  private async handleTransientFailure(
    record: { id: string; maxAttempts: number },
    attemptNumber: number,
    errorMessage: string
  ) {
    if (attemptNumber >= record.maxAttempts) {
      await prisma.outboundWebhookEvent.update({
        where: { id: record.id },
        data: {
          status: OutboundWebhookStatus.DEAD_LETTER,
          attempts: attemptNumber,
          lastAttemptAt: new Date(),
          lastError: `Exhausted ${record.maxAttempts} attempts: ${errorMessage}`,
        },
      });
    } else {
      const delayMs = RETRY_DELAYS_MS[attemptNumber - 1] || 30 * 60 * 1000;
      const nextAttemptAt = new Date(Date.now() + delayMs);

      await prisma.outboundWebhookEvent.update({
        where: { id: record.id },
        data: {
          status: OutboundWebhookStatus.PENDING,
          attempts: attemptNumber,
          nextAttemptAt,
          lastAttemptAt: new Date(),
          lastError: errorMessage,
        },
      });
    }
  }

  /**
   * Check wildcard event filter (e.g. "shipment.*" matches "shipment.delivered")
   */
  private matchesEventFilter(event: string, subscribedEvents: string[]): boolean {
    if (subscribedEvents.includes('*') || subscribedEvents.includes(event)) {
      return true;
    }

    const [eventDomain] = event.split('.');
    return subscribedEvents.some((pattern) => {
      if (pattern.endsWith('.*')) {
        const [domain] = pattern.split('.');
        return domain === eventDomain;
      }
      return false;
    });
  }
}

export const webhookDispatcherService = new WebhookDispatcherService();
