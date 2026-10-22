import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Validate this only at the action boundary so a bad limiter key cannot block bill reads.
    RATE_LIMIT_SECRET: z.string().optional(),
    // Optional at build time; the cron boundary validates these before any work.
    CRON_SECRET: z.string().optional(),
    LIFECYCLE_CLEANUP_ENABLED: z.string().optional(),
    LIFECYCLE_CLEANUP_PROJECT_REF: z.string().optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_RECEIPT_MODEL: z
      .string()
      .regex(/^[a-zA-Z0-9._-]+$/)
      .optional(),
    PARTICIPANT_SESSION_SECRET: z.string().min(32),
    PARTICIPANT_SESSION_PREVIOUS_SECRET: z.string().min(32).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    LIFECYCLE_CLEANUP_ENABLED: process.env.LIFECYCLE_CLEANUP_ENABLED,
    LIFECYCLE_CLEANUP_PROJECT_REF: process.env.LIFECYCLE_CLEANUP_PROJECT_REF,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_RECEIPT_MODEL: process.env.GEMINI_RECEIPT_MODEL,
    PARTICIPANT_SESSION_SECRET: process.env.PARTICIPANT_SESSION_SECRET,
    PARTICIPANT_SESSION_PREVIOUS_SECRET:
      process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  emptyStringAsUndefined: true,
});
