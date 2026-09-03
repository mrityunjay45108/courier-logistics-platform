import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../utils/errors';
import type { AddressInput } from '@courier/shared';
import type { AddressDto, UserProfile, UserRole } from '@courier/types';
import { Role, AddressType, AuditAction } from '@prisma/client';

export class UsersService {
  async getProfile(userId: string): Promise<UserProfile> {
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

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; companyName?: string; avatarUrl?: string }
  ): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.companyName !== undefined ? { companyName: data.companyName || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      },
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

    return {
      ...user,
      role: user.role as UserRole,
    };
  }

  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await verifyPassword(currentPass, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Current password is incorrect');
    }

    const newHash = await hashPassword(newPass);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      // Revoke other active sessions for security
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          action: AuditAction.PASSWORD_CHANGED,
          userId,
        },
      }),
    ]);
  }

  // --- ADDRESS MANAGEMENT (Strict IDOR Protected) ---

  async getAddresses(userId: string): Promise<AddressDto[]> {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: a.name,
      phone: a.phone,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2,
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      landmark: a.landmark,
      type: a.type as any,
      isDefault: a.isDefault,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  async getAddressById(userId: string, addressId: string): Promise<AddressDto> {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found');
    }

    return {
      ...address,
      type: address.type as any,
    };
  }

  async createAddress(userId: string, input: AddressInput): Promise<AddressDto> {
    return await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const count = await tx.address.count({ where: { userId } });
      const isDefault = input.isDefault || count === 0;

      const created = await tx.address.create({
        data: {
          userId,
          name: input.name,
          phone: input.phone,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country || 'India',
          landmark: input.landmark,
          type: (input.type as AddressType) || AddressType.HOME,
          isDefault,
        },
      });

      return {
        ...created,
        type: created.type as any,
      };
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    input: Partial<AddressInput>
  ): Promise<AddressDto> {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Address not found');
    }

    return await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      const updated = await tx.address.update({
        where: { id: addressId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.phone ? { phone: input.phone } : {}),
          ...(input.addressLine1 ? { addressLine1: input.addressLine1 } : {}),
          ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 } : {}),
          ...(input.city ? { city: input.city } : {}),
          ...(input.state ? { state: input.state } : {}),
          ...(input.postalCode ? { postalCode: input.postalCode } : {}),
          ...(input.country ? { country: input.country } : {}),
          ...(input.landmark !== undefined ? { landmark: input.landmark } : {}),
          ...(input.type ? { type: input.type as AddressType } : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        },
      });

      return {
        ...updated,
        type: updated.type as any,
      };
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Address not found');
    }

    await prisma.address.delete({ where: { id: addressId } });
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<AddressDto> {
    return await this.updateAddress(userId, addressId, { isDefault: true });
  }

  // --- ADMIN USER MANAGEMENT ---

  async listUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          companyName: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              customerShipments: true,
              sellerShipments: true,
              addresses: true,
            },
          },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetails(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
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
        addresses: true,
        deliveryPartner: true,
        _count: {
          select: {
            customerShipments: true,
            sellerShipments: true,
            paymentOrders: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async updateUserStatus(targetUserId: string, isActive: boolean, adminUserId: string): Promise<void> {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Safeguard: Do not allow deactivating the last active ADMIN
    if (targetUser.role === Role.ADMIN && !isActive) {
      const activeAdminCount = await prisma.user.count({
        where: { role: Role.ADMIN, isActive: true },
      });

      if (activeAdminCount <= 1) {
        throw new ForbiddenError('Cannot deactivate the last active administrator.');
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUserId },
        data: { isActive },
      }),
      prisma.auditLog.create({
        data: {
          action: isActive ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
          userId: adminUserId,
          details: { targetUserId, targetEmail: targetUser.email },
        },
      }),
    ]);
  }
}

export const usersService = new UsersService();
