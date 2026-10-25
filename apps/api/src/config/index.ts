import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or apps/api
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/disaster_response_db'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long').default('super-secret-jwt-key-for-dev-min-32-chars-long!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const config = parsed.data;
export type Config = typeof config;
