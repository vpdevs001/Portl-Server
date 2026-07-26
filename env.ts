import 'dotenv/config';
import { z } from 'zod';

const env = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(8000),

  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string(),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  IMAGEKIT_PRIVATE_KEY: z.string(),

  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((val) => val?.split(',').map((o) => o.trim()) || [])
});

export default env.parse(process.env);
