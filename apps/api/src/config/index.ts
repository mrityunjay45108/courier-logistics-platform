import dotenv from 'dotenv';
import path from 'path';

// Load root or local .env if available
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-super-secret-key-change-in-prod-12345',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-super-secret-key-change-in-prod-67890',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/courier_db?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  logLevel: process.env.LOG_LEVEL || 'info',
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  paymentCurrency: process.env.PAYMENT_CURRENCY || 'INR',
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_mock_courier_platform_secret_2026',
};

// Convenience alias
export const env = {
  NODE_ENV: config.env,
  PORT: config.port,
  FRONTEND_URL: config.frontendUrl,
  CORS_ORIGIN: config.corsOrigin,
  JWT_ACCESS_SECRET: config.jwt.accessSecret,
  JWT_REFRESH_SECRET: config.jwt.refreshSecret,
  JWT_ACCESS_EXPIRES_IN: config.jwt.accessExpiresIn,
  JWT_REFRESH_EXPIRES_IN: config.jwt.refreshExpiresIn,
  RESEND_API_KEY: config.resendApiKey,
  EMAIL_FROM: config.emailFrom,
  PAYMENT_PROVIDER: config.paymentProvider,
  PAYMENT_CURRENCY: config.paymentCurrency,
  PAYMENT_WEBHOOK_SECRET: config.paymentWebhookSecret,
};
