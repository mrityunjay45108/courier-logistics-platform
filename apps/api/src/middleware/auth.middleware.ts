import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyAccessToken } from '../lib/tokens';
import { prisma } from '../lib/prisma';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import type { UserProfile, UserRole } from '@courier/types';

export interface AuthUser extends UserProfile {
  userId: string;
}

export interface ApiClientContext {
  id: string;
  name: string;
  sellerId?: string | null;
  scopes: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  apiClient?: ApiClientContext;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Malformed authorization header');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Token is invalid or expired');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isActive) {
      throw new ForbiddenError('User account has been deactivated');
    }

    req.user = {
      ...user,
      userId: user.id,
      role: user.role as UserRole,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) return next();

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user && user.isActive) {
      req.user = {
        ...user,
        userId: user.id,
        role: user.role as UserRole,
      };
    }

    next();
  } catch {
    // Silently continue for optional authentication
    next();
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}

/**
 * Server-to-server API Key authentication via X-Api-Key header
 */
export async function authenticateApiClient(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawApiKey = req.headers['x-api-key'] as string;
    if (!rawApiKey) {
      throw new UnauthorizedError('API key is required in X-Api-Key header');
    }

    const trimmedKey = rawApiKey.trim();
    const keyHash = crypto.createHash('sha256').update(trimmedKey).digest('hex');

    const client = await prisma.apiClient.findUnique({
      where: { keyHash },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!client || !client.isActive) {
      throw new UnauthorizedError('Invalid or inactive API key');
    }

    if (client.expiresAt && client.expiresAt < new Date()) {
      throw new UnauthorizedError('API key has expired');
    }

    // Update lastUsedAt asynchronously without blocking
    prisma.apiClient.update({
      where: { id: client.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    req.apiClient = {
      id: client.id,
      name: client.name,
      sellerId: client.sellerId,
      scopes: client.scopes,
    };

    // Attach user representation linked to seller account
    if (client.seller && client.seller.isActive) {
      req.user = {
        ...client.seller,
        userId: client.seller.id,
        role: 'SELLER' as UserRole,
      };
    } else {
      req.user = {
        id: client.id,
        userId: client.id,
        name: client.name,
        email: `${client.keyPrefix}@api-client.local`,
        role: 'SELLER' as UserRole,
        isActive: true,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Dual authentication: accepts either Bearer JWT or X-Api-Key
 */
export async function authenticateUserOrApiClient(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;

  if (apiKey) {
    return authenticateApiClient(req, res, next);
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }

  return next(new UnauthorizedError('Authentication required (provide Bearer token or X-Api-Key)'));
}

/**
 * Optional dual authentication
 */
export async function optionalAuthenticateUserOrApiClient(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;

  if (apiKey) {
    return authenticateApiClient(req, res, (err) => {
      // If error, continue without client
      next();
    });
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return optionalAuthenticate(req, res, next);
  }

  next();
}

/**
 * Scope authorization check for API Clients
 */
export function requireScope(scope: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // If it's a human user (JWT), skip API client scope check
    if (!req.apiClient) {
      return next();
    }

    if (!req.apiClient.scopes.includes(scope) && !req.apiClient.scopes.includes('*')) {
      return next(
        new ForbiddenError(`Forbidden: API client lacks required scope '${scope}'`)
      );
    }

    next();
  };
}

