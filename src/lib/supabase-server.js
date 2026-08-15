import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

let client;

export function getServerSupabase() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side bill operations.",
    );
  }

  client ??= createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  return client;
}
