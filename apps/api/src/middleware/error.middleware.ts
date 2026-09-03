import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { config } from '../config';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Handle Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 422, 'Validation error occurred', 'VALIDATION_ERROR', formattedErrors);
    return;
  }

  // Handle Known Application Error
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  // Handle Prisma Known Request Errors
  if ('code' in err && typeof (err as { code: unknown }).code === 'string') {
    const prismaCode = (err as { code: string }).code;
    if (prismaCode === 'P2002') {
      sendError(res, 409, 'A unique constraint was violated on this resource', 'UNIQUE_CONSTRAINT_ERROR');
      return;
    }
    if (prismaCode === 'P2025') {
      sendError(res, 404, 'Record not found in database', 'RECORD_NOT_FOUND');
      return;
    }
  }

  // Handle Unexpected Server Errors
  if (!config.isTest) {
    console.error('Unhandled Server Error:', err);
  }

  const message = config.isProduction ? 'An unexpected internal server error occurred' : err.message;
  const details = config.isProduction ? undefined : { stack: err.stack };

  sendError(res, 500, message, 'INTERNAL_SERVER_ERROR', details);
};
