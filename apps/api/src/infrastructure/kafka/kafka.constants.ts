/**
 * Strictly permitted Kafka topics on the Aiven cluster (5/5 topic limit)
 * Under NO circumstances may any other topic be created or used!
 */
export const KAFKA_TOPICS = {
  COURIER_SHIPMENT_EVENTS: 'courier.shipment.events',
  ECOMMERCE_INVENTORY_EVENTS: 'ecommerce.inventory.events',
  ECOMMERCE_ORDER_CREATED: 'ecommerce.order.created',
  ECOMMERCE_ORDER_EVENTS: 'ecommerce.order.events',
  ECOMMERCE_SHIPMENT_EVENTS: 'ecommerce.shipment.events',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

export const PERMITTED_KAFKA_TOPICS: readonly string[] = Object.values(KAFKA_TOPICS);

/**
 * Supported Event Types across the permitted topics
 */
export const KAFKA_EVENT_TYPES = {
  // Shipment Lifecycle (courier.shipment.events)
  SHIPMENT_CREATED: 'shipment.created',
  SHIPMENT_PICKUP_SCHEDULED: 'shipment.pickup_scheduled',
  SHIPMENT_PICKED_UP: 'shipment.picked_up',
  SHIPMENT_IN_TRANSIT: 'shipment.in_transit',
  SHIPMENT_OUT_FOR_DELIVERY: 'shipment.out_for_delivery',
  SHIPMENT_DELIVERED: 'shipment.delivered',
  SHIPMENT_DELIVERY_FAILED: 'shipment.delivery_failed',
  SHIPMENT_CANCELLED: 'shipment.cancelled',

  // Reverse Logistics / RTO (courier.shipment.events)
  SHIPMENT_RETURN_INITIATED: 'shipment.return_initiated',
  SHIPMENT_RETURNED: 'shipment.returned',
  RTO_INITIATED: 'rto.initiated',
  RTO_COMPLETED: 'rto.completed',

  // COD Settlement Lifecycle (courier.shipment.events)
  COD_COLLECTED: 'cod.collected',
  COD_FAILED: 'cod.failed',
  COD_SETTLED: 'cod.settled',

  // E-Commerce Inbound Order Events (ecommerce.order.created / ecommerce.order.events)
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled',
} as const;

export type KafkaEventType = (typeof KAFKA_EVENT_TYPES)[keyof typeof KAFKA_EVENT_TYPES];

/**
 * Responsibility-based Consumer Groups
 */
export const KAFKA_CONSUMER_GROUPS = {
  COURIER_SHIPMENT_WORKER: 'courier-shipment-worker',
  COURIER_ECOMMERCE_ORDER_WORKER: 'courier-ecommerce-order-worker',
} as const;

export type KafkaConsumerGroup = (typeof KAFKA_CONSUMER_GROUPS)[keyof typeof KAFKA_CONSUMER_GROUPS];
