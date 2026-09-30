import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().default('development-jwt-secret-key-change-in-production'),
  WEB_URL: z.string().default('http://localhost:3000'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('noreply@centroabsen.com'),
  GEOCODING_ENABLED: z.string().transform(v => v === 'true').default('false'),
  GEOCODING_API_URL: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
  ENABLE_DOCS: z.string().transform(v => v === 'true').default('true'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(300),
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid Environment Variables Configuration:', result.error.format());
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables in production');
    }
    return envSchema.parse({
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:root@localhost:3306/centroabsen'
    });
  }
  return result.data;
};

export const env = parseEnv();
