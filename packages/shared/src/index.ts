import { z } from 'zod';

export * from '@courier/types';

// ====================================================
// AUTHENTICATION & USER SCHEMAS
// ====================================================

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Public registration strictly defaults to CUSTOMER
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
  // Prevent public user from self-assigning ADMIN or OPERATIONS
  role: z.enum(['CUSTOMER', 'SELLER']).default('CUSTOMER'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().regex(/^[0-9+ -]{8,15}$/).optional().or(z.literal('')),
  companyName: z.string().trim().max(150).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

// ====================================================
// ADDRESS SCHEMAS
// ====================================================

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
  type: z.enum(['HOME', 'OFFICE', 'OTHER']).default('HOME'),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

// ====================================================
// SHIPMENT & PRICING SCHEMAS
// ====================================================

export const packageSchema = z.object({
  weight: z.number().positive('Weight must be greater than 0 kg').max(100, 'Weight cannot exceed 100 kg'),
  length: z.number().positive('Length must be greater than 0 cm').max(300, 'Max length 300 cm'),
  width: z.number().positive('Width must be greater than 0 cm').max(300, 'Max width 300 cm'),
  height: z.number().positive('Height must be greater than 0 cm').max(300, 'Max height 300 cm'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  packageType: z.enum(['PARCEL', 'DOCUMENT', 'ELECTRONICS', 'CLOTHING', 'FRAGILE', 'OTHER']).default('PARCEL'),
  description: z.string().trim().max(300).optional(),
});

export const shipmentAddressInputSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  phone: z.string().trim().min(10, 'Phone is required').max(15),
  addressLine1: z.string().trim().min(5, 'Address is required').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State is required').max(100),
  postalCode: z.string().trim().min(3).max(10),
  country: z.string().trim().default('India'),
  landmark: z.string().trim().max(100).optional(),
});

export const createShipmentSchema = z.object({
  pickupAddressId: z.string().uuid().optional(),
  pickupAddress: shipmentAddressInputSchema.optional(),
  deliveryAddress: shipmentAddressInputSchema,
  package: packageSchema,
  shipmentType: z.enum(['PREPAID', 'COD']).default('PREPAID'),
  codAmount: z.number().min(0).default(0),
  externalOrderId: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
}).refine((data) => data.pickupAddressId || data.pickupAddress, {
  message: 'Either pickupAddressId or pickupAddress must be provided',
  path: ['pickupAddressId'],
}).refine((data) => {
  if (data.shipmentType === 'COD') return data.codAmount > 0;
  return data.codAmount === 0;
}, {
  message: 'COD shipments require codAmount > 0; PREPAID shipments must have codAmount = 0',
  path: ['codAmount'],
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const quoteQuerySchema = z.object({
  pickupPincode: z.string().trim().min(3).max(10),
  deliveryPincode: z.string().trim().min(3).max(10),
  shipmentType: z.enum(['PREPAID', 'COD']).default('PREPAID'),
  weight: z.number().positive().max(100),
  length: z.number().positive().max(300),
  width: z.number().positive().max(300),
  height: z.number().positive().max(300),
  codAmount: z.number().min(0).default(0),
});

export type QuoteQueryInput = z.infer<typeof quoteQuerySchema>;

// ====================================================
// PICKUP & DELIVERY SCHEMAS
// ====================================================

export const schedulePickupSchema = z.object({
  shipmentId: z.string().uuid('Valid shipment ID required'),
  scheduledDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  timeSlotStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM required'),
  timeSlotEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM required'),
  instructions: z.string().trim().max(300).optional(),
});

export const recordPickupAttemptSchema = z.object({
  status: z.enum(['SUCCESS', 'FAILED', 'CUSTOMER_UNAVAILABLE', 'ADDRESS_NOT_FOUND', 'PACKAGE_NOT_READY', 'CONTACT_UNREACHABLE', 'OTHER']),
  failureReason: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const scheduleDeliverySchema = z.object({
  shipmentId: z.string().uuid('Valid shipment ID required'),
  scheduledDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  timeSlotStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('09:00'),
  timeSlotEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).default('18:00'),
  instructions: z.string().trim().max(300).optional(),
});

export const recordDeliveryAttemptSchema = z.object({
  status: z.enum(['SUCCESS', 'FAILED', 'CUSTOMER_UNAVAILABLE', 'CUSTOMER_REFUSED', 'ADDRESS_NOT_FOUND', 'PHONE_UNREACHABLE', 'DAMAGED_PACKAGE', 'OTHER']),
  failureReason: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(300).optional(),
  recipientName: z.string().trim().max(100).optional(),
  recipientRelation: z.string().trim().max(50).optional(),
});

// ====================================================
// DELIVERY PARTNER & TASK SCHEMAS
// ====================================================

export const createPartnerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(10).max(15),
  vehicleType: z.enum(['BIKE', 'SCOOTER', 'BICYCLE', 'THREE_WHEELER', 'VAN', 'TRUCK', 'OTHER']).default('BIKE'),
  vehicleNumber: z.string().trim().max(30).optional(),
  serviceZoneId: z.string().uuid().optional(),
});

export const assignTaskSchema = z.object({
  shipmentId: z.string().uuid('Valid shipment ID is required'),
  deliveryPartnerId: z.string().uuid('Valid delivery partner ID is required'),
  taskType: z.enum(['PICKUP', 'DELIVERY', 'REVERSE_PICKUP', 'RTO']),
  notes: z.string().trim().max(300).optional(),
});

export const updateAvailabilitySchema = z.object({
  availabilityStatus: z.enum(['AVAILABLE', 'OFFLINE', 'ON_BREAK']),
});

// ====================================================
// EXCEPTION SCHEMAS
// ====================================================

export const createExceptionSchema = z.object({
  shipmentId: z.string().uuid('Valid shipment ID required'),
  type: z.enum(['PICKUP_FAILED', 'DELIVERY_FAILED', 'DELAYED', 'ADDRESS_ISSUE', 'CUSTOMER_UNAVAILABLE', 'PARTNER_ISSUE', 'PACKAGE_ISSUE', 'SERVICEABILITY_ISSUE', 'SYSTEM_ISSUE', 'RETURN_PICKUP_FAILED', 'RTO_DELAYED', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(5).max(1000),
});

export const resolveExceptionSchema = z.object({
  resolutionNotes: z.string().trim().min(3).max(1000),
  status: z.enum(['RESOLVED', 'CANCELLED']).default('RESOLVED'),
});

// ====================================================
// PAYMENTS & COD SCHEMAS
// ====================================================

export const createPaymentOrderSchema = z.object({
  shipmentId: z.string().uuid('Valid shipment ID required'),
  paymentType: z.enum(['PREPAID', 'COD']).default('PREPAID'),
});

export const verifyPaymentSchema = z.object({
  paymentOrderId: z.string().uuid('Valid payment order ID required'),
  providerTransactionId: z.string().trim().min(1, 'Provider transaction ID is required'),
  signature: z.string().trim().optional(),
});

export const codCollectionSchema = z.object({
  amount: z.number().positive('Collection amount must be positive'),
  method: z.enum(['CASH', 'UPI', 'OTHER']).default('CASH'),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(300).optional(),
});

export const refundRequestSchema = z.object({
  paymentOrderId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().trim().min(3).max(300),
});

// ====================================================
// RETURNS & RTO SCHEMAS
// ====================================================

export const createReturnSchema = z.object({
  shipmentId: z.string().uuid('Valid shipment ID required'),
  reason: z.enum(['WRONG_ITEM', 'DAMAGED_ITEM', 'DEFECTIVE_ITEM', 'ITEM_NOT_AS_DESCRIBED', 'SIZE_ISSUE', 'QUALITY_ISSUE', 'MISSING_PARTS', 'CUSTOMER_CHANGED_MIND', 'OTHER']),
  comment: z.string().trim().max(500).optional(),
});

export const reviewReturnSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().trim().max(300).optional(),
});

export const recordInspectionSchema = z.object({
  status: z.enum(['PASSED', 'FAILED', 'NOT_REQUIRED']),
  condition: z.enum(['GOOD', 'DAMAGED', 'USED', 'MISSING_PARTS', 'WRONG_ITEM', 'UNKNOWN']),
  notes: z.string().trim().max(500).optional(),
});

export const trackingQuerySchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .min(5, 'Tracking number must be at least 5 characters')
    .max(50, 'Tracking number is too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Tracking number contains invalid characters'),
});

export type TrackingQueryInput = z.infer<typeof trackingQuerySchema>;

// ====================================================
// E-COMMERCE INTEGRATION SCHEMAS
// ====================================================

export const createWebhookSubscriptionSchema = z.object({
  url: z.string().url('A valid destination URL is required').max(500),
  subscribedEvents: z.array(z.string().min(1)).min(1).default(['shipment.*']),
  secretKey: z.string().min(16, 'Secret key must be at least 16 characters').max(128).optional(),
});

export type CreateWebhookSubscriptionInput = z.infer<typeof createWebhookSubscriptionSchema>;

export const createApiClientSchema = z.object({
  name: z.string().trim().min(2, 'Client name is required').max(100),
  sellerId: z.string().uuid().optional(),
  scopes: z.array(z.string()).default(['shipments:read', 'shipments:write', 'pricing:read', 'tracking:read', 'webhooks:manage']),
  expiresAt: z.string().datetime().optional(),
});

export type CreateApiClientInput = z.infer<typeof createApiClientSchema>;

