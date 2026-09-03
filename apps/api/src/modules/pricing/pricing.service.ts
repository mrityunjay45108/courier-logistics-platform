import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { calculateVolumetricWeight } from './calculators/volumetric.calculator';
import { calculateChargeableWeight } from './calculators/weight.calculator';
import { calculateBaseShipping } from './calculators/shipping.calculator';
import { calculateCodFee } from './calculators/cod.calculator';
import { calculateTaxAndSurcharge } from './calculators/tax.calculator';
import type { ShippingQuoteRequest, ShippingQuoteResponse } from '@courier/types';
import { ShipmentType, ShippingZoneCode, Prisma } from '@prisma/client';

export class PricingService {
  /**
   * Determine zone from pickup & delivery pincodes
   */
  async resolveZone(pickupPincode: string, deliveryPincode: string) {
    if (pickupPincode === deliveryPincode) {
      const localZone = await prisma.shippingZone.findFirst({
        where: { code: ShippingZoneCode.LOCAL, isActive: true },
      });
      if (localZone) return localZone;
    }

    const [pickupRule, deliveryRule] = await Promise.all([
      prisma.serviceabilityRule.findUnique({
        where: { pincode: pickupPincode },
        include: { zone: true },
      }),
      prisma.serviceabilityRule.findUnique({
        where: { pincode: deliveryPincode },
        include: { zone: true },
      }),
    ]);

    if (!pickupRule || !pickupRule.isActive || !pickupRule.isPickupAvailable) {
      throw new BadRequestError(`Pickup pincode ${pickupPincode} is currently unserviceable for pickups.`);
    }

    if (!deliveryRule || !deliveryRule.isActive || !deliveryRule.isDeliveryAvailable) {
      throw new BadRequestError(`Delivery pincode ${deliveryPincode} is currently unserviceable for deliveries.`);
    }

    // If same state -> REGIONAL
    if (pickupRule.state.toLowerCase() === deliveryRule.state.toLowerCase()) {
      const regionalZone = await prisma.shippingZone.findFirst({
        where: { code: ShippingZoneCode.REGIONAL, isActive: true },
      });
      if (regionalZone) return regionalZone;
    }

    // If remote zone
    if (deliveryRule.zone.code === ShippingZoneCode.REMOTE) {
      return deliveryRule.zone;
    }

    // Default to NATIONAL or delivery zone
    const nationalZone = await prisma.shippingZone.findFirst({
      where: { code: ShippingZoneCode.NATIONAL, isActive: true },
    });

    return nationalZone || deliveryRule.zone;
  }

  /**
   * Calculate Shipping Quote with Rate Card
   */
  async calculateQuote(
    params: ShippingQuoteRequest,
    userId?: string
  ): Promise<ShippingQuoteResponse> {
    const zone = await this.resolveZone(params.pickupPincode, params.deliveryPincode);

    // Find active rate card matching zone and shipment type
    const rateCard = await prisma.pricingRateCard.findFirst({
      where: {
        zoneId: zone.id,
        shipmentType: params.shipmentType as ShipmentType,
        isActive: true,
      },
      orderBy: { priority: 'asc' },
    });

    if (!rateCard) {
      throw new NotFoundError(
        `No active rate card configured for zone ${zone.name} and type ${params.shipmentType}`
      );
    }

    // 1. Volumetric weight
    const volumetricWeight = calculateVolumetricWeight(params.length, params.width, params.height);

    // 2. Chargeable weight
    const baseWeightNum = Number(rateCard.baseWeight);
    const chargeableWeight = calculateChargeableWeight(params.weight, volumetricWeight, baseWeightNum);

    // 3. Base shipping
    const { baseShipping, additionalWeightCharge } = calculateBaseShipping({
      chargeableWeight,
      baseWeight: baseWeightNum,
      baseRate: Number(rateCard.baseRate),
      additionalWeightUnit: Number(rateCard.additionalWeightUnit),
      additionalWeightRate: Number(rateCard.additionalWeightRate),
    });

    // 4. COD Fee
    const codFee = calculateCodFee({
      enabled: rateCard.codEnabled && params.shipmentType === 'COD',
      codAmount: params.codAmount || 0,
      fixedFee: Number(rateCard.codFixedFee),
      percentage: Number(rateCard.codPercentage),
    });

    // 5. Fuel Surcharge & Tax
    const subtotal = baseShipping + additionalWeightCharge + codFee;
    const { surcharge, tax, total } = calculateTaxAndSurcharge({
      subtotal,
      surchargeType: rateCard.fuelSurchargeType,
      surchargeValue: Number(rateCard.fuelSurchargeValue),
      taxEnabled: rateCard.taxEnabled,
      taxPercentage: Number(rateCard.taxPercentage),
    });

    const quoteNumber = `QTE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h validity

    // Store quote in DB
    await prisma.pricingQuote.create({
      data: {
        quoteNumber,
        userId: userId || null,
        pickupPincode: params.pickupPincode,
        deliveryPincode: params.deliveryPincode,
        zoneId: zone.id,
        shipmentType: params.shipmentType as ShipmentType,
        actualWeight: new Prisma.Decimal(params.weight),
        volumetricWeight: new Prisma.Decimal(volumetricWeight),
        chargeableWeight: new Prisma.Decimal(chargeableWeight),
        baseShipping: new Prisma.Decimal(baseShipping),
        additionalWeightCharge: new Prisma.Decimal(additionalWeightCharge),
        codFee: new Prisma.Decimal(codFee),
        surcharge: new Prisma.Decimal(surcharge),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(total),
        currency: rateCard.currency,
        rateCardId: rateCard.id,
        expiresAt,
      },
    });

    return {
      quoteNumber,
      pickupPincode: params.pickupPincode,
      deliveryPincode: params.deliveryPincode,
      zone: zone.name,
      shipmentType: params.shipmentType,
      actualWeight: params.weight,
      volumetricWeight,
      chargeableWeight,
      baseShipping,
      additionalWeightCharge,
      codFee,
      surcharge,
      tax,
      total,
      currency: rateCard.currency,
      expiresAt,
    };
  }

  /**
   * Admin pricing views: Zones, Rules & Rate Cards
   */
  async listZones() {
    return await prisma.shippingZone.findMany({
      include: {
        _count: {
          select: { serviceabilityRules: true, rateCards: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listRateCards() {
    return await prisma.pricingRateCard.findMany({
      include: { zone: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listServiceability(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { pincode: { contains: query.search } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { state: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.serviceabilityRule.findMany({
        where,
        skip,
        take: limit,
        include: { zone: true },
        orderBy: { pincode: 'asc' },
      }),
      prisma.serviceabilityRule.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async checkPincode(pincode: string) {
    const rule = await prisma.serviceabilityRule.findUnique({
      where: { pincode },
      include: { zone: true },
    });

    if (!rule) {
      return {
        serviceable: false,
        message: `Pincode ${pincode} is currently not in our direct service network.`,
      };
    }

    return {
      serviceable: rule.isActive && (rule.isPickupAvailable || rule.isDeliveryAvailable),
      pincode: rule.pincode,
      city: rule.city,
      state: rule.state,
      zone: rule.zone.name,
      isPickupAvailable: rule.isPickupAvailable,
      isDeliveryAvailable: rule.isDeliveryAvailable,
    };
  }
}

export const pricingService = new PricingService();
