/**
 * Standard IATA volumetric weight calculation:
 * (Length cm x Width cm x Height cm) / 5000 = Volumetric Weight in Kg
 */
export function calculateVolumetricWeight(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  divisor: number = 5000
): number {
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
    return 0;
  }
  const raw = (lengthCm * widthCm * heightCm) / divisor;
  return Math.round(raw * 100) / 100;
}
