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
    const result = await authService.register(req.body);

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
    // Check both cookie and body/header
    const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    const tokenFromBody = req.body?.refreshToken;
    const refreshToken = tokenFromCookie || tokenFromBody;

    const userAgent = req.get('user-agent');
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await authService.refresh(refreshToken, userAgent, ipAddress);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

    sendSuccess(
      res,
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
      'Token refreshed successfully'
    );
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tokenFromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
    const tokenFromBody = req.body?.refreshToken;
    const refreshToken = tokenFromCookie || tokenFromBody;

    await authService.logout(refreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, {
      ...cookieOptions,
      maxAge: 0,
    });

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.id) {
      throw new Error('User not attached to request');
    }

    const profile = await authService.getProfile(req.user.id);
    sendSuccess(res, { user: profile }, 'Profile retrieved');
  } catch (error) {
    next(error);
  }
}
