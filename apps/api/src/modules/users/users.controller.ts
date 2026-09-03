import { Response, NextFunction } from 'express';
import { usersService } from './users.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await usersService.getProfile(req.user!.id);
    sendSuccess(res, profile, 'Profile fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const updated = await usersService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, updated, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function getAddresses(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const addresses = await usersService.getAddresses(req.user!.id);
    sendSuccess(res, addresses, 'Addresses fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createAddress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const address = await usersService.createAddress(req.user!.id, req.body);
    sendSuccess(res, address, 'Address created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await usersService.deleteAddress(req.user!.id, req.params.id);
    sendSuccess(res, null, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
}
