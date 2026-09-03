import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';

// Strict limiter for authentication endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      429,
      'Too many authentication attempts. Please try again after 15 minutes.',
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // max 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      429,
      'Too many requests from this IP. Please slow down.',
      'RATE_LIMIT_EXCEEDED'
    );
  },
});
