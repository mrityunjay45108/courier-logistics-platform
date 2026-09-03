import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
} from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { authLimiter } from '../../middleware/rate-limiter.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '@courier/shared';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshTokenSchema), refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
