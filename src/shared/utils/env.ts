import * as z from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  CORS_ORIGIN: z.string().default('*'),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('❌ Invalid environment variables:')
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2))
  process.exit(1)
}

if (result.data.NODE_ENV === 'production' && result.data.CORS_ORIGIN === '*') {
  console.error('❌ CORS_ORIGIN must be set to a specific origin in production (not "*")')
  process.exit(1)
}

export const env = result.data
export type Env = typeof env
