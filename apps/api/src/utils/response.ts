import { Response } from 'express';
import type { ApiResponse } from '@courier/types';

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message = 'Request successful',
  statusCode = 200
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code = 'ERROR',
  details?: unknown
): Response {
  const payload: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      ...(details ? { details } : {}),
    },
  };
  return res.status(statusCode).json(payload);
}
