import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashRefreshToken,
} from '../../lib/tokens';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../utils/errors';
import type { RegisterInput, LoginInput } from '@courier/shared';
import type { UserProfile, UserRole, AuthResponseData } from '@courier/types';
import { Role, AuditAction } from '@prisma/client';
import { sendPasswordResetEmail, sendEmailVerification } from '../../services/email.service';

export class AuthService {
  /**
   * Helper to write structured audit logs
   */
  private async logAudit(
    action: AuditAction,
    userId?: string | null,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          userId: userId || null,
          details: details ? (details as any) : undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (e) {
      console.error('[Audit Log Error]', e);
    }
  }

  /**
   * Register a new user (Default CUSTOMER; SELLER allowed with verification)
   * Public registration strictly rejects privileged roles (ADMIN, OPERATIONS)
   */
  async register(input: RegisterInput, ipAddress?: string, userAgent?: string): Promise<AuthResponseData> {
    const email = input.email.toLowerCase().trim();

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictError('An account with this email address already exists');
    }

    if (input.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: input.phone },
      });
      if (existingPhone) {
        throw new ConflictError('An account with this phone number already exists');
      }
    }

    // Role enforcement: public registration cannot elevate to ADMIN or OPERATIONS
    const assignedRole = input.role === 'SELLER' ? Role.SELLER : Role.CUSTOMER;
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone || null,
        passwordHash,
        role: assignedRole,
        isActive: true,
        emailVerified: false,
      },
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

    const userProfile: UserProfile = {
      ...user,
      role: user.role as UserRole,
    };

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: userProfile.role,
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    await this.logAudit(AuditAction.LOGIN, user.id, { reason: 'User Registration' }, ipAddress, userAgent);

    return {
      user: userProfile,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login(
    input: LoginInput,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponseData> {
    const email = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Generic error to prevent account enumeration
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const userProfile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role as UserRole,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      companyName: user.companyName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: userProfile.role,
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    await this.logAudit(AuditAction.LOGIN, user.id, { email: user.email }, ipAddress, userAgent);

    return {
      user: userProfile,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Refresh access token with rotation and reuse detection
   */
  async refresh(
    rawRefreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResponseData> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);

    const session = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError('Invalid session. Please log in again.');
    }

    // Reuse detection: if token was already revoked, revoke ALL tokens for this user
    if (session.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.logAudit(AuditAction.SESSION_REVOKED, session.userId, { reason: 'Token reuse detected' });
      throw new UnauthorizedError('Invalid session. Token reuse detected. Please log in again.');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedError('Session has expired. Please log in again.');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedError('Account has been deactivated.');
    }

    // Rotate: Revoke current token and issue new token pair
    await prisma.refreshToken.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const newRawRefreshToken = generateRefreshTokenString();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: session.userId,
        expiresAt: newExpiresAt,
        userAgent: userAgent || session.userAgent,
        ipAddress: ipAddress || session.ipAddress,
      },
    });

    const userProfile: UserProfile = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      phone: session.user.phone,
      role: session.user.role as UserRole,
      isActive: session.user.isActive,
      emailVerified: session.user.emailVerified,
      companyName: session.user.companyName,
      avatarUrl: session.user.avatarUrl,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
    };

    const accessToken = generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: userProfile.role,
    });

    return {
      user: userProfile,
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Logout: revoke current refresh token session
   */
  async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (userId) {
      await this.logAudit(AuditAction.LOGOUT, userId);
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.logAudit(AuditAction.LOGOUT_ALL, userId);
  }

  /**
   * List active sessions for user
   */
  async listSessions(userId: string) {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions;
  }

  /**
   * Revoke specific session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.logAudit(AuditAction.SESSION_REVOKED, userId, { sessionId });
  }

  /**
   * Forgot password: creates unguessable token and emails reset link
   */
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // To prevent account enumeration, always return successfully
    if (!user || !user.isActive) {
      return;
    }

    // Generate single-use secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    await this.logAudit(AuditAction.PASSWORD_RESET_REQUESTED, user.id);

    // Send email via Resend
    await sendPasswordResetEmail(user.email, user.name, rawToken);
  }

  /**
   * Reset password with valid, unexpired token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || new Date() > resetRecord.expiresAt) {
      throw new BadRequestError('Password reset link is invalid or has expired.');
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all active sessions
      prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.logAudit(AuditAction.PASSWORD_RESET_COMPLETED, resetRecord.userId);
  }

  /**
   * Get current authenticated user profile
   */
  async getMe(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        phoneVerified: true,
        companyName: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      ...user,
      role: user.role as UserRole,
    };
  }
}

export const authService = new AuthService();
