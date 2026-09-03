// User Roles in the Courier & Logistics System
export type UserRole = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'OPERATIONS' | 'DELIVERY_PARTNER';

export const USER_ROLES: Record<UserRole, UserRole> = {
  CUSTOMER: 'CUSTOMER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
  OPERATIONS: 'OPERATIONS',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
};

// Safe User Profile
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Address Data Transfer Object
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
  isDefault?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Standard API Response Structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: unknown;
  };
}

// Authentication Token Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Auth Session Response
export interface AuthResponseData {
  user: UserProfile;
  accessToken: string;
  refreshToken?: string;
}

// Shipment Status Types for tracking extension
export type ShipmentStatus =
  | 'CREATED'
  | 'BOOKED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_ATTEMPT'
  | 'RETURNED_TO_ORIGIN'
  | 'CANCELLED';

// Tracking Event Details
export interface TrackingEventDto {
  id: string;
  status: ShipmentStatus;
  location: string;
  description: string;
  timestamp: string | Date;
}

// Tracking Query Result
export interface TrackingResultDto {
  trackingNumber: string;
  status: ShipmentStatus;
  carrier: string;
  origin: string;
  destination: string;
  estimatedDelivery?: string | null;
  events: TrackingEventDto[];
}
