import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  listUsers,
  getUserDetails,
  updateUserStatus,
} from './users.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  addressSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '@courier/shared';

const router = Router();

router.use(authenticate);

// Profile
router.get('/me', getProfile);
router.patch('/me', validateBody(updateProfileSchema), updateProfile);
router.post('/change-password', validateBody(changePasswordSchema), changePassword);

// Addresses
router.get('/addresses', getAddresses);
router.post('/addresses', validateBody(addressSchema), createAddress);
router.get('/addresses/:id', getAddressById);
router.put('/addresses/:id', validateBody(addressSchema.partial()), updateAddress);
router.delete('/addresses/:id', deleteAddress);
router.patch('/addresses/:id/default', setDefaultAddress);

// Admin-only user management
router.get('/admin/users', authorize('ADMIN'), listUsers);
router.get('/admin/users/:id', authorize('ADMIN'), getUserDetails);
router.patch('/admin/users/:id/status', authorize('ADMIN'), updateUserStatus);

export default router;
