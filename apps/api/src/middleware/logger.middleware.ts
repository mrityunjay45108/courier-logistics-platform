import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

export function requestLogger(req: RequestWithId, res: Response, next: NextFunction): void {
  req.id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.startTime = Date.now();
  res.setHeader('x-request-id', req.id);

  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
    };

    // Safe logging: no authorization headers, no passwords, no tokens logged
    if (process.env.NODE_ENV !== 'test') {
      const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
      console.log(`[${level}] ${logData.timestamp} - [${logData.requestId}] ${logData.method} ${logData.path} ${logData.statusCode} (${logData.durationMs}ms)`);
    }
  });

  next();
}
