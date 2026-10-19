import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

let client;

export function getServerSupabase({ signal } = {}) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side bill operations.",
    );
  }

  function createServerClient() {
    return createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        ...(signal
          ? {
              global: {
                fetch: (input, init = {}) =>
                  fetch(input, {
                    ...init,
                    signal: AbortSignal.any(
                      [signal, init.signal].filter(Boolean),
                    ),
                  }),
              },
            }
          : {}),
      },
    );
  }
  if (signal) return createServerClient();
  client ??= createServerClient();
  return client;
}
