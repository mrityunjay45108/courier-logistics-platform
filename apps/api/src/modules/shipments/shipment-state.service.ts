import { ShipmentStatus } from '@prisma/client';
import { BadRequestError } from '../../utils/errors';

/**
 * Valid transitions for Shipment lifecycle
 */
const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  DRAFT: [ShipmentStatus.CREATED, ShipmentStatus.CANCELLED],
  CREATED: [ShipmentStatus.PICKUP_SCHEDULED, ShipmentStatus.CANCELLED],
  PICKUP_SCHEDULED: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED, ShipmentStatus.CREATED],
  PICKED_UP: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED],
  IN_TRANSIT: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.FAILED_DELIVERY, ShipmentStatus.RETURN_INITIATED],
  OUT_FOR_DELIVERY: [ShipmentStatus.DELIVERED, ShipmentStatus.FAILED_DELIVERY],
  DELIVERED: [ShipmentStatus.RETURN_INITIATED],
  FAILED_DELIVERY: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.RETURN_INITIATED],
  RETURN_INITIATED: [ShipmentStatus.RETURNED],
  RETURNED: [],
  CANCELLED: [],
};

const CANCELLABLE_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.DRAFT,
  ShipmentStatus.CREATED,
  ShipmentStatus.PICKUP_SCHEDULED,
];

export function validateShipmentTransition(
  currentStatus: ShipmentStatus,
  targetStatus: ShipmentStatus
): void {
  if (currentStatus === targetStatus) return;

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new BadRequestError(
      `Invalid shipment status transition from '${currentStatus}' to '${targetStatus}'.`
    );
  }
}

export function canCancelShipment(status: ShipmentStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}
