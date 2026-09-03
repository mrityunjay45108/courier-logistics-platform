import { z } from 'zod';

export * from '@courier/types';

// Password criteria: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Roles that can be registered by users via public signup
export const registerableRoles = ['CUSTOMER', 'SELLER'] as const;

// Registration validation schema
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+ -]{8,15}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  role: z.enum(['CUSTOMER', 'SELLER']).default('CUSTOMER'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login validation schema
export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Refresh Token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

// Address creation/update schema
export const addressSchema = z.object({
  name: z.string().trim().min(2, 'Full name is required').max(100),
  phone: z.string().trim().min(10, 'Valid phone number is required').max(15),
  addressLine1: z.string().trim().min(5, 'Address line 1 is required').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State is required').max(100),
  postalCode: z.string().trim().regex(/^[0-9A-Za-z -]{3,10}$/, 'Invalid postal/zip code'),
  country: z.string().trim().min(2).max(60).default('India'),
  landmark: z.string().trim().max(100).optional(),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

// Tracking lookup schema
export const trackingQuerySchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .min(5, 'Tracking number must be at least 5 characters')
    .max(50, 'Tracking number is too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Tracking number contains invalid characters'),
});

export type TrackingQueryInput = z.infer<typeof trackingQuerySchema>;
