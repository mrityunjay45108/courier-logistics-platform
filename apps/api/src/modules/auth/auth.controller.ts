import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { config } from '../../config';

const REFRESH_COOKIE_NAME = 'courier_refresh_token';

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: (config.isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userAgent = req.get('user-agent');
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await authService.register(req.body, ipAddress, userAgent);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userAgent = req.get('user-agent');
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await authService.login(req.body, userAgent, ipAddress);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    const tokenFromBody = req.body?.refreshToken;
    const token = tokenFromCookie || tokenFromBody;

    const userAgent = req.get('user-agent');
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await authService.refresh(token, userAgent, ipAddress);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      'Token refreshed successfully'
    );
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const userId = (req as AuthenticatedRequest).user?.userId;

    await authService.logout(token, userId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    await authService.logoutAll(userId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    sendSuccess(res, null, 'Logged out from all devices successfully');
  } catch (error) {
    next(error);
  }
}

export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const sessions = await authService.listSessions(userId);

    sendSuccess(res, sessions, 'Sessions retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const sessionId = req.params.id;

    await authService.revokeSession(userId, sessionId);
    sendSuccess(res, null, 'Session revoked successfully');
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, null, 'If an account exists with this email, a reset link has been sent.');
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    sendSuccess(res, null, 'Password reset successfully. You can now log in with your new password.');
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const user = await authService.getMe(userId);

    sendSuccess(res, user, 'Current user profile retrieved successfully');
  } catch (error) {
    next(error);
  }
}
