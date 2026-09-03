export interface CodFeeParams {
  enabled: boolean;
  codAmount: number;
  fixedFee: number;
  percentage: number;
}

export function calculateCodFee(params: CodFeeParams): number {
  if (!params.enabled || params.codAmount <= 0) {
    return 0;
  }

  const percentageFee = (params.codAmount * params.percentage) / 100;
  const totalCodFee = params.fixedFee + percentageFee;

  return Math.round(totalCodFee * 100) / 100;
}
