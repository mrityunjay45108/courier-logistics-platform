/**
 * Calculate chargeable weight:
 * Takes max of actual weight and volumetric weight, then rounds up to the nearest weight slab (e.g. 0.5 kg).
 */
export function calculateChargeableWeight(
  actualWeightKg: number,
  volumetricWeightKg: number,
  slabKg: number = 0.5
): number {
  const higherWeight = Math.max(actualWeightKg, volumetricWeightKg);
  if (higherWeight <= 0) return slabKg;

  // Round up to nearest slab
  const slabs = Math.ceil(higherWeight / slabKg);
  return Math.round(slabs * slabKg * 100) / 100;
}
