import { z } from "zod";

/**
 * Validates process.env at startup so misconfiguration fails fast with a
 * clear error instead of surfacing as a confusing runtime bug later.
 * Import this file once, early (e.g. from instrumentation.ts), to trigger
 * validation.
 */
const serverEnvSchema = z.object({
  API_BASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  DATABASE_URL: z.string().optional(),
});

export const serverEnv = serverEnvSchema.parse({
  API_BASE_URL: process.env.API_BASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
});
