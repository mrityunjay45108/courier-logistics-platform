import { Request, Response, NextFunction } from 'express';
import { webhookDispatcherService } from './webhook-dispatcher.service';
import { sendSuccess } from '../../../utils/response';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware';
import { BadRequestError } from '../../../utils/errors';

export async function createSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const clientId = authReq.apiClient?.id || authReq.user?.userId;

    if (!clientId) {
      throw new BadRequestError('API Client context is required to configure webhooks');
    }

    const { url, subscribedEvents, secretKey } = req.body;
    const result = await webhookDispatcherService.createSubscription({
      clientId,
      url,
      subscribedEvents,
      secretKey,
    });

    sendSuccess(res, result, 'Webhook subscription created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function listSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const clientId = authReq.apiClient?.id || authReq.user?.userId;

    if (!clientId) {
      throw new BadRequestError('API Client context is required');
    }

    const subscriptions = await webhookDispatcherService.listSubscriptions(clientId);
    sendSuccess(res, subscriptions, 'Webhook subscriptions retrieved');
  } catch (error) {
    next(error);
  }
}

export async function deleteSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const clientId = authReq.apiClient?.id || authReq.user?.userId;

    if (!clientId) {
      throw new BadRequestError('API Client context is required');
    }

    const result = await webhookDispatcherService.deleteSubscription(req.params.id, clientId);
    sendSuccess(res, result, 'Webhook subscription deleted');
  } catch (error) {
    next(error);
  }
}

export async function sendTestWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const sellerId = authReq.apiClient?.sellerId || authReq.user?.userId;

    await webhookDispatcherService.recordAndDispatch('webhook.test_ping', {
      message: 'Courier Platform outbound webhook integration test ping',
      timestamp: new Date().toISOString(),
      test: true,
    }, sellerId);

    sendSuccess(res, { dispatched: true }, 'Test webhook triggered');
  } catch (error) {
    next(error);
  }
}
