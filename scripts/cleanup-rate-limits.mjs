import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error("Matching Supabase server configuration is required.");
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
  },
});
const { data, error } = await client.rpc("cleanup_rate_limits");
if (error) {
  console.error(
    "Rate-limit cleanup failed. Check the connection and migration.",
  );
  process.exitCode = 1;
} else
  console.log(`Removed ${data} expired counter windows. Repeat until zero.`);
