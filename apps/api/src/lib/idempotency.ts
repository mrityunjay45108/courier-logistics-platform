import crypto from 'crypto';
import { prisma } from './prisma';
import { IdempotencyStatus, Prisma } from '@prisma/client';
import { ConflictError } from '../utils/errors';

/**
 * Sort object keys recursively for deterministic canonical hashing
 */
function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    result[key] = canonicalize(obj[key]);
  }
  return result;
}

export interface IdempotentResult<T> {
  data: T;
  status: number;
  cached: boolean;
}

export async function executeIdempotent<T>(
  clientId: string,
  key: string,
  payload: unknown,
  resourceType: string,
  action: () => Promise<{ status: number; data: T }>
): Promise<IdempotentResult<T>> {
  const canonicalPayload = JSON.stringify(canonicalize(payload || {}));
  const requestHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

  // Check for existing record
  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      clientId_key: {
        clientId,
        key,
      },
    },
  });

  if (existing) {
    if (existing.status === IdempotencyStatus.RESOLVED) {
      if (existing.requestHash === requestHash) {
        return {
          data: existing.responseBody as T,
          status: existing.responseStatus || 200,
          cached: true,
        };
      } else {
        throw new ConflictError(
          'A request with this Idempotency-Key has already been processed with a different payload',
          'IDEMPOTENCY_CONFLICT'
        );
      }
    }

    // If still in PROCESSING state
    const isStale = Date.now() - existing.createdAt.getTime() > 30000;
    if (!isStale) {
      throw new ConflictError(
        'A concurrent request with this Idempotency-Key is currently in progress',
        'IDEMPOTENCY_CONFLICT'
      );
    }

    // If stale, delete it to allow re-processing
    await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => {});
  }

  // Create initial PROCESSING record
  let createdRecord;
  try {
    createdRecord = await prisma.idempotencyKey.create({
      data: {
        clientId,
        key,
        requestHash,
        resourceType,
        status: IdempotencyStatus.PROCESSING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
  } catch (error: any) {
    // Unique constraint race condition
    if (error.code === 'P2002') {
      throw new ConflictError(
        'A concurrent request with this Idempotency-Key was just initiated',
        'IDEMPOTENCY_CONFLICT'
      );
    }
    throw error;
  }

  try {
    const result = await action();

    // Store resolved response
    await prisma.idempotencyKey.update({
      where: { id: createdRecord.id },
      data: {
        status: IdempotencyStatus.RESOLVED,
        responseStatus: result.status,
        responseBody: result.data as Prisma.InputJsonValue,
        resourceId: (result.data as any)?.id || (result.data as any)?.shipmentId || null,
      },
    });

    return {
      data: result.data,
      status: result.status,
      cached: false,
    };
  } catch (error) {
    // Clean up failed attempt record so user can retry
    await prisma.idempotencyKey.delete({ where: { id: createdRecord.id } }).catch(() => {});
    throw error;
  }
}
