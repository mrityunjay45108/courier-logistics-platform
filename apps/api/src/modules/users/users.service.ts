import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import type { AddressInput } from '@courier/shared';
import type { AddressDto, UserProfile, UserRole } from '@courier/types';

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
    data: { name?: string; phone?: string }
  ): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
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

    return {
      ...user,
      role: user.role as UserRole,
    };
  }

  async getAddresses(userId: string): Promise<AddressDto[]> {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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
      isDefault: a.isDefault,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  async createAddress(userId: string, input: AddressInput): Promise<AddressDto> {
    if (input.isDefault) {
      // Unset previous defaults
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await prisma.address.create({
      data: {
        userId,
        name: input.name,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        landmark: input.landmark,
        isDefault: input.isDefault,
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      name: created.name,
      phone: created.phone,
      addressLine1: created.addressLine1,
      addressLine2: created.addressLine2,
      city: created.city,
      state: created.state,
      postalCode: created.postalCode,
      country: created.country,
      landmark: created.landmark,
      isDefault: created.isDefault,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundError('Address not found or does not belong to user');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });
  }
}

export const usersService = new UsersService();
