import { describe, it, expect, vi } from 'vitest';
import { returnsService } from '../src/modules/returns/returns.service';
import { prisma } from '../src/lib/prisma';
import { ShipmentStatus, ReturnReason, ReturnStatus } from '@prisma/client';

describe('Returns & Reverse Logistics (Phase 10)', () => {
  it('should reject return requests for non-delivered shipments', async () => {
    vi.spyOn(prisma.shipment, 'findUnique').mockResolvedValue({
      id: 'ship-1',
      customerId: 'user-1',
      status: ShipmentStatus.IN_TRANSIT,
      addresses: [],
      updatedAt: new Date(),
    } as any);

    await expect(
      returnsService.createCustomerReturn({
        shipmentId: 'ship-1',
        userId: 'user-1',
        reason: ReturnReason.DEFECTIVE_ITEM,
      })
    ).rejects.toThrow(/Returns can only be requested for delivered consignments/);
  });

  it('should reject return requests from unauthorized users', async () => {
    vi.spyOn(prisma.shipment, 'findUnique').mockResolvedValue({
      id: 'ship-1',
      customerId: 'user-actual-owner',
      status: ShipmentStatus.DELIVERED,
      addresses: [],
      updatedAt: new Date(),
    } as any);

    await expect(
      returnsService.createCustomerReturn({
        shipmentId: 'ship-1',
        userId: 'attacker-user',
        reason: ReturnReason.DEFECTIVE_ITEM,
      })
    ).rejects.toThrow(/You can only request returns for your own shipments/);
  });
});
