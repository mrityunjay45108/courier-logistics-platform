import { SurchargeType } from '@prisma/client';

export interface TaxAndSurchargeParams {
  subtotal: number;
  surchargeType: SurchargeType;
  surchargeValue: number;
  taxEnabled: boolean;
  taxPercentage: number;
}

export function calculateTaxAndSurcharge(params: TaxAndSurchargeParams): {
  surcharge: number;
  tax: number;
  total: number;
} {
  const { subtotal, surchargeType, surchargeValue, taxEnabled, taxPercentage } = params;

  let surcharge = 0;
  if (surchargeType === SurchargeType.PERCENTAGE) {
    surcharge = (subtotal * surchargeValue) / 100;
  } else {
    surcharge = surchargeValue;
  }
  surcharge = Math.round(surcharge * 100) / 100;

  const taxableAmount = subtotal + surcharge;
  let tax = 0;
  if (taxEnabled) {
    tax = (taxableAmount * taxPercentage) / 100;
    tax = Math.round(tax * 100) / 100;
  }

  const total = Math.round((taxableAmount + tax) * 100) / 100;

  return {
    surcharge,
    tax,
    total,
  };
}
