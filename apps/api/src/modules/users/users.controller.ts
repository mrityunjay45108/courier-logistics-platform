import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const profile = await usersService.getProfile(userId);
    sendSuccess(res, profile, 'User profile retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const updated = await usersService.updateProfile(userId, req.body);
    sendSuccess(res, updated, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    await usersService.changePassword(userId, req.body.currentPassword, req.body.newPassword);
    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}

export async function getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const addresses = await usersService.getAddresses(userId);
    sendSuccess(res, addresses, 'Addresses retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getAddressById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const address = await usersService.getAddressById(userId, req.params.id);
    sendSuccess(res, address, 'Address retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function createAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const created = await usersService.createAddress(userId, req.body);
    sendSuccess(res, created, 'Address created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const updated = await usersService.updateAddress(userId, req.params.id, req.body);
    sendSuccess(res, updated, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    await usersService.deleteAddress(userId, req.params.id);
    sendSuccess(res, null, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
}

export async function setDefaultAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const updated = await usersService.setDefaultAddress(userId, req.params.id);
    sendSuccess(res, updated, 'Default address set successfully');
  } catch (error) {
    next(error);
  }
}

// Admin controllers
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search, role, isActive, sortBy, sortOrder } = req.query;
    const result = await usersService.listUsers({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: search as string,
      role: role as any,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as any,
    });
    sendSuccess(res, result, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getUserDetails(req.params.id);
    sendSuccess(res, user, 'User details retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = (req as AuthenticatedRequest).user!.userId;
    await usersService.updateUserStatus(req.params.id, req.body.isActive, adminUserId);
    sendSuccess(res, null, 'User status updated successfully');
  } catch (error) {
    next(error);
  }
}
