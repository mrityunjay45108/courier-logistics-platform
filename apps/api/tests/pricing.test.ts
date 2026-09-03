import { describe, it, expect } from 'vitest';
import { calculateVolumetricWeight } from '../src/modules/pricing/calculators/volumetric.calculator';
import { calculateChargeableWeight } from '../src/modules/pricing/calculators/weight.calculator';
import { calculateBaseShipping } from '../src/modules/pricing/calculators/shipping.calculator';
import { calculateCodFee } from '../src/modules/pricing/calculators/cod.calculator';
import { calculateTaxAndSurcharge } from '../src/modules/pricing/calculators/tax.calculator';
import { SurchargeType } from '@prisma/client';

describe('Pricing Engine Calculators (Phase 4)', () => {
  it('should calculate volumetric weight using (L x W x H) / 5000', () => {
    // 50cm x 40cm x 30cm / 5000 = 12 kg
    const volWeight = calculateVolumetricWeight(50, 40, 30);
    expect(volWeight).toBe(12);
  });

  it('should calculate chargeable weight with slab rounding', () => {
    // actual 1.2 kg, volumetric 1.8 kg -> higher is 1.8 kg -> slab 0.5 kg -> rounds up to 2.0 kg
    const chargeable = calculateChargeableWeight(1.2, 1.8, 0.5);
    expect(chargeable).toBe(2.0);
  });

  it('should calculate base and additional slab charges accurately', () => {
    // base 0.5kg @ 40, addl 0.5kg @ 20. Chargeable weight 1.5kg (excess 1.0kg = 2 units * 20 = 40)
    const result = calculateBaseShipping({
      chargeableWeight: 1.5,
      baseWeight: 0.5,
      baseRate: 40,
      additionalWeightUnit: 0.5,
      additionalWeightRate: 20,
    });

    expect(result.baseShipping).toBe(40);
    expect(result.additionalWeightCharge).toBe(40);
  });

  it('should calculate COD fees (fixed + percentage)', () => {
    // 1000 COD amount, fixed 30 + 1.5% (15) = 45
    const fee = calculateCodFee({
      enabled: true,
      codAmount: 1000,
      fixedFee: 30,
      percentage: 1.5,
    });
    expect(fee).toBe(45);
  });

  it('should calculate fuel surcharge and 18% tax without floating point drift', () => {
    const result = calculateTaxAndSurcharge({
      subtotal: 100,
      surchargeType: SurchargeType.PERCENTAGE,
      surchargeValue: 10, // 10
      taxEnabled: true,
      taxPercentage: 18, // 18% of 110 = 19.8
    });

    expect(result.surcharge).toBe(10);
    expect(result.tax).toBe(19.8);
    expect(result.total).toBe(129.8);
  });
});
