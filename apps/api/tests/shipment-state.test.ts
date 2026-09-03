import { describe, it, expect } from 'vitest';
import { validateShipmentTransition, canCancelShipment } from '../src/modules/shipments/shipment-state.service';
import { ShipmentStatus } from '@prisma/client';

describe('Shipment State Machine (Phase 3)', () => {
  it('should allow valid sequential transitions', () => {
    expect(() => validateShipmentTransition(ShipmentStatus.CREATED, ShipmentStatus.PICKUP_SCHEDULED)).not.toThrow();
    expect(() => validateShipmentTransition(ShipmentStatus.PICKUP_SCHEDULED, ShipmentStatus.PICKED_UP)).not.toThrow();
    expect(() => validateShipmentTransition(ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT)).not.toThrow();
    expect(() => validateShipmentTransition(ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY)).not.toThrow();
    expect(() => validateShipmentTransition(ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELIVERED)).not.toThrow();
  });

  it('should reject invalid non-sequential transitions', () => {
    expect(() => validateShipmentTransition(ShipmentStatus.CREATED, ShipmentStatus.DELIVERED)).toThrow(
      /Invalid shipment status transition/
    );
    expect(() => validateShipmentTransition(ShipmentStatus.DELIVERED, ShipmentStatus.OUT_FOR_DELIVERY)).toThrow(
      /Invalid shipment status transition/
    );
  });

  it('should only permit cancellation for pre-pickup states', () => {
    expect(canCancelShipment(ShipmentStatus.CREATED)).toBe(true);
    expect(canCancelShipment(ShipmentStatus.PICKUP_SCHEDULED)).toBe(true);
    expect(canCancelShipment(ShipmentStatus.PICKED_UP)).toBe(false);
    expect(canCancelShipment(ShipmentStatus.IN_TRANSIT)).toBe(false);
    expect(canCancelShipment(ShipmentStatus.DELIVERED)).toBe(false);
  });
});
