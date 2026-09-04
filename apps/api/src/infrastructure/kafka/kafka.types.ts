import { KafkaEventType } from './kafka.constants';

/**
 * Standard Strongly-Typed Event Envelope
 */
export interface KafkaEventEnvelope<T = any> {
  eventId: string;
  eventType: KafkaEventType | string;
  version: number;
  occurredAt: string;
  producer: string;
  correlationId?: string;
  aggregateType: 'Shipment' | 'Order' | 'Inventory';
  aggregateId: string;
  data: T;
}

/**
 * Safe Logistics Shipment Event Payload
 * Explicitly excludes: API keys, passwords, webhook secrets, JWT tokens, PII
 */
export interface ShipmentEventData {
  shipmentId: string;
  externalOrderId?: string | null;
  trackingNumber: string;
  status: string;
  shipmentType: string;
  carrier: string;
  shippingCost: number;
  codAmount: number;
  currency: string;
  pickupPincode?: string | null;
  deliveryPincode?: string | null;
  deliveredAt?: string | null;
  estimatedDelivery?: string | null;
  notes?: string | null;
}

/**
 * Inbound E-Commerce Order Event Payload
 */
export interface EcommerceOrderEventData {
  orderId: string;
  orderNumber?: string;
  customerId?: string;
  status: string;
  totalAmount: number;
  currency: string;
  paymentMethod?: string;
  pickupPincode?: string;
  deliveryPincode: string;
  shippingAddress?: {
    name: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items?: Array<{
    sku: string;
    quantity: number;
    weightKg?: number;
  }>;
}

/**
 * Result of publishing an event
 */
export interface KafkaPublishResult {
  topic: string;
  partition: number;
  offset: string;
  eventId: string;
  partitionKey: string;
}
