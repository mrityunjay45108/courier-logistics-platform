import { Request, Response, NextFunction } from 'express';
import { trackingService } from './tracking.service';
import { trackingPublisher, TRACKING_EVENT } from './tracking-publisher';
import { sendSuccess } from '../../utils/response';

export async function getTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { trackingNumber } = req.params;
    const result = await trackingService.getPublicTracking(trackingNumber);
    sendSuccess(res, result, 'Tracking information retrieved');
  } catch (error) {
    next(error);
  }
}

/**
 * Server-Sent Events (SSE) stream for real-time tracking updates
 */
export async function streamTracking(req: Request, res: Response): Promise<void> {
  const { trackingNumber } = req.params;

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  res.flushHeaders();

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', trackingNumber })}\n\n`);

  // Event listener
  const listener = (data: { trackingNumber: string; event: unknown }) => {
    if (data.trackingNumber.toUpperCase() === trackingNumber.toUpperCase()) {
      res.write(`data: ${JSON.stringify({ type: 'UPDATE', payload: data.event })}\n\n`);
    }
  };

  trackingPublisher.on(TRACKING_EVENT, listener);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 20000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    trackingPublisher.off(TRACKING_EVENT, listener);
    res.end();
  });
}
