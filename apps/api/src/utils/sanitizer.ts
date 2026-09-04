/**
 * Production Data Sanitization & Log Hygiene Utility
 * Ensures credentials, tokens, and secrets are NEVER exposed in logs, responses, or health probes.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private[_-]?key/i,
  /cert(ificate)?/i,
  /database[_-]?url/i,
  /redis[_-]?url/i,
  /kafka[_-]?password/i,
  /credit[_-]?card/i,
  /cvv/i,
  /cookie/i,
  /bearer/i,
];

/**
 * Recursively redacts sensitive keys from any object or array.
 */
export function maskSensitiveData<T>(input: T, depth = 0): T {
  if (depth > 10 || input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Redact JWT tokens if detected in string
    if (/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/.test(input) && input.length > 50) {
      return '[REDACTED_JWT]' as unknown as T;
    }
    // Redact connection URIs containing credentials
    if (input.startsWith('postgres://') || input.startsWith('postgresql://') || input.startsWith('redis://') || input.startsWith('rediss://')) {
      return input.replace(/:([^:@]+)@/, ':****@') as unknown as T;
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => maskSensitiveData(item, depth + 1)) as unknown as T;
  }

  if (typeof input === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = maskSensitiveData(value, depth + 1);
      }
    }
    return sanitized as T;
  }

  return input;
}

export interface KafkaLogFields {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  eventId?: string;
  eventType?: string;
  aggregateType?: string;
  aggregateId?: string;
  correlationId?: string;
  topic?: string;
  partition?: number;
  offset?: string;
  consumerGroup?: string;
  retryCount?: number;
  processingLatencyMs?: number;
  [key: string]: any;
}

/**
 * Format and write a structured, sanitized log line.
 */
export function logStructured(fields: KafkaLogFields): void {
  const sanitized = maskSensitiveData({
    timestamp: new Date().toISOString(),
    ...fields,
  });

  const jsonString = JSON.stringify(sanitized);

  if (fields.level === 'error') {
    console.error(jsonString);
  } else if (fields.level === 'warn') {
    console.warn(jsonString);
  } else {
    console.log(jsonString);
  }
}
