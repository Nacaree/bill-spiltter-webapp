import { createClient } from "@supabase/supabase-js";
import { cleanupImageUploadBatch } from "../src/lib/cleanup-image-uploads.mjs";

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    "Configure the Supabase URL and service-role key in .env.local first.",
  );
  process.exitCode = 1;
} else {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init = {}) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
      },
    },
  );
  try {
    const count = await cleanupImageUploadBatch(db);
    console.log(
      `Cleaned ${count} expired upload reservation(s). Each run handles at most 20; repeat until zero.`,
    );
  } catch {
    console.error(
      "Upload cleanup failed. Check the project configuration and required migration, then retry.",
    );
    process.exitCode = 1;
  }
}
