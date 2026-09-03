import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';

// Strict limiter for authentication endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 attempts per window
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
  max: 500, // max 500 requests per window
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

// Public tracking lookup limiter
export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      429,
      'Too many tracking requests. Please wait a moment.',
      'RATE_LIMIT_EXCEEDED'
    );
  },
});
