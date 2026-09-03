import { URL } from 'url';
import { config } from '../../../config';
import { BadRequestError } from '../../../utils/errors';

// Private IPv4 ranges
const PRIVATE_IP_REGEXES = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // Loopback
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // Link-local / Cloud Metadata
  /^0\.0\.0\.0$/,
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
];

/**
 * Validate destination URL against SSRF vulnerabilities
 */
export function validateWebhookUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestError('Invalid webhook URL format');
  }

  // 1. Protocol Validation
  if (config.isProduction && parsed.protocol !== 'https:') {
    throw new BadRequestError('Webhooks in production must use HTTPS protocol');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError(`Unsupported protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // In production, strictly block loopback, local domains, and private IPs
  if (config.isProduction) {
    if (BLOCKED_HOSTNAMES.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      throw new BadRequestError(`Destination hostname '${hostname}' is restricted (SSRF protection)`);
    }

    for (const regex of PRIVATE_IP_REGEXES) {
      if (regex.test(hostname)) {
        throw new BadRequestError(`Destination IP '${hostname}' is in a restricted private subnet (SSRF protection)`);
      }
    }
  } else {
    // In development/test, always block cloud metadata
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      throw new BadRequestError('Cloud metadata endpoints are strictly prohibited');
    }
  }
}
