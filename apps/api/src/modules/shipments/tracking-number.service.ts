import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

export async function generateUniqueTrackingNumber(): Promise<string> {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32-like avoiding 0/O, 1/I
  const length = 8;
  let attempts = 0;

  while (attempts < 10) {
    let code = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      code += chars[bytes[i] % chars.length];
    }

    const trackingNumber = `CRL-${code}`;

    // Check collision in database
    const existing = await prisma.shipment.findUnique({
      where: { trackingNumber },
      select: { id: true },
    });

    if (!existing) {
      return trackingNumber;
    }

    attempts++;
  }

  // Fallback with timestamp suffix
  return `CRL-${Date.now().toString(36).toUpperCase()}`;
}
