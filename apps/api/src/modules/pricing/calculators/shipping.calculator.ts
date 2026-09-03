import { Prisma } from '@prisma/client';

export interface BaseShippingCalculationParams {
  chargeableWeight: number;
  baseWeight: number;
  baseRate: number;
  additionalWeightUnit: number;
  additionalWeightRate: number;
}

export function calculateBaseShipping(params: BaseShippingCalculationParams): {
  baseShipping: number;
  additionalWeightCharge: number;
} {
  const { chargeableWeight, baseWeight, baseRate, additionalWeightUnit, additionalWeightRate } = params;

  if (chargeableWeight <= baseWeight) {
    return {
      baseShipping: Math.round(baseRate * 100) / 100,
      additionalWeightCharge: 0,
    };
  }

  const excessWeight = chargeableWeight - baseWeight;
  const excessUnits = Math.ceil(excessWeight / additionalWeightUnit);
  const additionalCharge = excessUnits * additionalWeightRate;

  return {
    baseShipping: Math.round(baseRate * 100) / 100,
    additionalWeightCharge: Math.round(additionalCharge * 100) / 100,
  };
}
