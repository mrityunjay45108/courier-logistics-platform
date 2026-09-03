import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for an outbound webhook payload
 * Formula: HMAC_SHA256(secret, timestamp + "." + rawBody)
 */
export function signWebhookPayload(secret: string, timestamp: string, rawBody: string): string {
  const message = `${timestamp}.${rawBody}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Verify HMAC-SHA256 signature with timingSafeEqual to prevent timing attacks
 */
export function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  providedSignature: string
): boolean {
  if (!secret || !timestamp || !rawBody || !providedSignature) {
    return false;
  }

  const expectedSignature = signWebhookPayload(secret, timestamp, rawBody);

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(providedSignature, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Validate that timestamp is within acceptable tolerance window (replay attack mitigation)
 */
export function isTimestampValid(timestampStr: string, toleranceSeconds: number = 300): boolean {
  if (!timestampStr) return false;

  let eventEpochMs: number;
  const trimmed = timestampStr.trim();

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    eventEpochMs = numeric > 1e11 ? numeric : numeric * 1000;
  } else {
    eventEpochMs = Date.parse(trimmed);
    if (isNaN(eventEpochMs)) {
      return false;
    }
  }

  const now = Date.now();
  return Math.abs(now - eventEpochMs) <= toleranceSeconds * 1000;
}
