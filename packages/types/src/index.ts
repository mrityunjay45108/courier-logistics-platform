// ====================================================
// SHARED DOMAIN TYPES: COURIER & LOGISTICS PLATFORM
// ====================================================

// --- User & Auth ---
export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'OPERATIONS' | 'DELIVERY_PARTNER';

export const USER_ROLES: Record<UserRole, UserRole> = {
  CUSTOMER: 'CUSTOMER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
  OPERATIONS: 'OPERATIONS',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
};

export type AddressType = 'HOME' | 'OFFICE' | 'OTHER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  avatarUrl?: string | null;
  companyName?: string | null;
  lastLoginAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AddressDto {
  id: string;
  userId: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string | null;
  type: AddressType;
  isDefault?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: unknown;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponseData {
  user: UserProfile;
  accessToken: string;
  refreshToken?: string;
}

// --- Shipment & Pricing ---
export type ShipmentStatus =
  | 'DRAFT'
  | 'CREATED'
  | 'PICKUP_SCHEDULED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED_DELIVERY'
  | 'RETURN_INITIATED'
  | 'RETURNED';

export type ShipmentType = 'PREPAID' | 'COD';

export type PackageType =
  | 'PARCEL'
  | 'DOCUMENT'
  | 'ELECTRONICS'
  | 'CLOTHING'
  | 'FRAGILE'
  | 'OTHER';

export type ShipmentAddressType = 'PICKUP' | 'DELIVERY' | 'RETURN_DESTINATION';

export interface ShipmentPackageDto {
  weight: number; // in kg
  length: number; // in cm
  width: number;  // in cm
  height: number; // in cm
  quantity: number;
  packageType: PackageType;
  description?: string | null;
}

export interface ShipmentAddressSnapshotDto {
  type: ShipmentAddressType;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string | null;
}

export interface ShipmentDto {
  id: string;
  trackingNumber: string;
  externalOrderId?: string | null;
  customerId?: string | null;
  sellerId?: string | null;
  status: ShipmentStatus;
  shipmentType: ShipmentType;
  shippingCost: number | string;
  codAmount: number | string;
  currency: string;
  carrier: string;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  cancelledAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  package?: ShipmentPackageDto | null;
  addresses?: ShipmentAddressSnapshotDto[];
  events?: TrackingEventDto[];
}

// --- Tracking ---
export type TrackingEventType =
  | 'SHIPMENT_CREATED'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP_ATTEMPTED'
  | 'PICKED_UP'
  | 'ARRIVED_AT_ORIGIN'
  | 'DEPARTED_ORIGIN'
  | 'IN_TRANSIT'
  | 'ARRIVED_AT_HUB'
  | 'DEPARTED_HUB'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_ATTEMPTED'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'EXCEPTION'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'RETURN_PICKED_UP'
  | 'RETURN_RECEIVED'
  | 'RTO_INITIATED'
  | 'RTO_RECEIVED';

export interface TrackingEventDto {
  id: string;
  status: ShipmentStatus;
  eventType: TrackingEventType;
  title: string;
  description: string;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  isPublic: boolean;
  createdAt: string | Date;
}

export interface PublicTrackingResponse {
  trackingNumber: string;
  status: ShipmentStatus;
  carrier: string;
  originCity?: string | null;
  destinationCity?: string | null;
  estimatedDeliveryDate?: string | Date | null;
  lastUpdatedAt: string | Date;
  timeline: {
    eventType: TrackingEventType;
    title: string;
    description: string;
    location?: string | null;
    createdAt: string | Date;
  }[];
}

// --- Pricing Engine ---
export type SurchargeType = 'FIXED' | 'PERCENTAGE';
export type ShippingZoneCode = 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'REMOTE';

export interface ShippingQuoteRequest {
  pickupPincode: string;
  deliveryPincode: string;
  shipmentType: ShipmentType;
  weight: number;
  length: number;
  width: number;
  height: number;
  codAmount?: number;
}

export interface ShippingQuoteResponse {
  quoteNumber: string;
  pickupPincode: string;
  deliveryPincode: string;
  zone: string;
  shipmentType: ShipmentType;
  actualWeight: number;
  volumetricWeight: number;
  chargeableWeight: number;
  baseShipping: number;
  additionalWeightCharge: number;
  codFee: number;
  surcharge: number;
  tax: number;
  total: number;
  currency: string;
  expiresAt: string | Date;
}

// --- Pickup & Delivery ---
export type PickupType = 'FORWARD_PICKUP' | 'REVERSE_PICKUP' | 'RTO_PICKUP' | 'ORIGIN_PICKUP';

export type PickupStatus =
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'ARRIVING'
  | 'ATTEMPTED'
  | 'PICKED_UP'
  | 'FAILED'
  | 'CANCELLED'
  | 'RESCHEDULED';

export type PickupAttemptStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'CUSTOMER_UNAVAILABLE'
  | 'ADDRESS_NOT_FOUND'
  | 'PACKAGE_NOT_READY'
  | 'CONTACT_UNREACHABLE'
  | 'OTHER';

export type DeliveryStatus =
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'ATTEMPTED'
  | 'DELIVERED'
  | 'FAILED'
  | 'RESCHEDULED'
  | 'CANCELLED';

export type DeliveryAttemptStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'CUSTOMER_UNAVAILABLE'
  | 'CUSTOMER_REFUSED'
  | 'ADDRESS_NOT_FOUND'
  | 'PHONE_UNREACHABLE'
  | 'DAMAGED_PACKAGE'
  | 'OTHER';

export type ProofOfDeliveryType = 'PHOTO' | 'SIGNATURE' | 'OTP' | 'RECIPIENT_CONFIRMATION' | 'OTHER';

export interface ProofOfDeliveryDto {
  type: ProofOfDeliveryType;
  reference?: string | null;
  recipientName: string;
  recipientRelation?: string | null;
  notes?: string | null;
  createdAt: string | Date;
}

// --- Delivery Partner / Rider ---
export type PartnerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'REJECTED';
export type AvailabilityStatus = 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'ON_BREAK';
export type VehicleType = 'BIKE' | 'SCOOTER' | 'BICYCLE' | 'THREE_WHEELER' | 'VAN' | 'TRUCK' | 'OTHER';

export interface DeliveryPartnerDto {
  id: string;
  userId: string;
  partnerCode: string;
  fullName: string;
  phone: string;
  email: string;
  status: PartnerStatus;
  availabilityStatus: AvailabilityStatus;
  vehicleType: VehicleType;
  vehicleNumber?: string | null;
  serviceZoneId?: string | null;
  joiningDate: string | Date;
  notes?: string | null;
}

export type TaskType = 'PICKUP' | 'DELIVERY' | 'REVERSE_PICKUP' | 'RTO';
export type TaskStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'STARTED'
  | 'ATTEMPTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface DeliveryTaskDto {
  id: string;
  taskNumber: string;
  shipmentId: string;
  deliveryPartnerId: string;
  returnOrderId?: string | null;
  taskType: TaskType;
  status: TaskStatus;
  assignedAt: string | Date;
  acceptedAt?: string | Date | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  rejectedAt?: string | Date | null;
  rejectionReason?: string | null;
  notes?: string | null;
}

// --- Exceptions ---
export type ExceptionType =
  | 'PICKUP_FAILED'
  | 'DELIVERY_FAILED'
  | 'DELAYED'
  | 'ADDRESS_ISSUE'
  | 'CUSTOMER_UNAVAILABLE'
  | 'PARTNER_ISSUE'
  | 'PACKAGE_ISSUE'
  | 'SERVICEABILITY_ISSUE'
  | 'SYSTEM_ISSUE'
  | 'RETURN_PICKUP_FAILED'
  | 'RTO_DELAYED'
  | 'OTHER';

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExceptionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

export interface ShipmentExceptionDto {
  id: string;
  shipmentId: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  title: string;
  description: string;
  source: string;
  assignedTo?: string | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  createdAt: string | Date;
  resolvedAt?: string | Date | null;
}

// --- Payments & COD ---
export type PaymentOrderStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type PaymentTransactionStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type CODOrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'COLLECTED'
  | 'PARTIALLY_COLLECTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SETTLED';

export type CODMethod = 'CASH' | 'UPI' | 'OTHER';

export type CODSettlementStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type RefundStatus = 'REQUESTED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'CANCELLED';

// --- Returns & RTO ---
export type ReturnType =
  | 'CUSTOMER_RETURN'
  | 'RTO'
  | 'SELLER_INITIATED'
  | 'DAMAGED'
  | 'WRONG_ITEM'
  | 'OTHER';

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'PICKUP_ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'INSPECTION_PENDING'
  | 'INSPECTION_COMPLETED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type ReturnReason =
  | 'WRONG_ITEM'
  | 'DAMAGED_ITEM'
  | 'DEFECTIVE_ITEM'
  | 'ITEM_NOT_AS_DESCRIBED'
  | 'SIZE_ISSUE'
  | 'QUALITY_ISSUE'
  | 'MISSING_PARTS'
  | 'CUSTOMER_CHANGED_MIND'
  | 'OTHER';

export type InspectionStatus = 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'NOT_REQUIRED';
export type ItemCondition = 'GOOD' | 'DAMAGED' | 'USED' | 'MISSING_PARTS' | 'WRONG_ITEM' | 'UNKNOWN';

export interface ReturnOrderDto {
  id: string;
  returnNumber: string;
  shipmentId: string;
  userId: string;
  sellerId?: string | null;
  type: ReturnType;
  status: ReturnStatus;
  reason: ReturnReason;
  customerComment?: string | null;
  requestedAt: string | Date;
  approvedAt?: string | Date | null;
  rejectedAt?: string | Date | null;
  completedAt?: string | Date | null;
}

// ====================================================
// E-COMMERCE INTEGRATION TYPES
// ====================================================

export interface ApiClientDto {
  id: string;
  name: string;
  keyPrefix: string;
  sellerId?: string | null;
  scopes: string[];
  isActive: boolean;
  expiresAt?: string | Date | null;
  lastUsedAt?: string | Date | null;
  createdAt: string | Date;
}

export interface ShippingLabelDto {
  shipmentId: string;
  trackingNumber: string;
  format: string;
  url?: string | null;
  barcodeText: string;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
}

export interface CourierShipmentIntegrationResponse {
  shipmentId: string;
  externalOrderId: string | null;
  trackingNumber: string;
  status: ShipmentStatus;
  shipmentType: ShipmentType;
  shippingCost: number;
  codAmount: number;
  currency: string;
  estimatedDelivery?: string | Date | null;
  carrier: string;
  pickupStatus?: string | null;
  deliveryStatus?: string | null;
  label?: {
    format: string;
    url?: string | null;
    barcodeText: string;
  } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface WebhookSubscriptionDto {
  id: string;
  url: string;
  isActive: boolean;
  subscribedEvents: string[];
  createdAt: string | Date;
}

export interface OutboundWebhookEnvelope<T = Record<string, unknown>> {
  id: string;
  event: string;
  version: string;
  createdAt: string;
  data: T;
}

