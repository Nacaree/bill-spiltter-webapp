import { createClient } from "@supabase/supabase-js";
import {
  cleanupBillLifecycle,
  lifecycleOptions,
  previewBillLifecycle,
} from "../src/lib/cleanup-bill-lifecycle.mjs";

try {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Configure the Supabase URL and service-role key first.");
  const options = lifecycleOptions(process.argv.slice(2), url);
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init = {}) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
    },
  });
  console.log(
    `Lifecycle cleanup target: ${options.projectRef}; mode: ${options.apply ? "apply" : "dry-run"}`,
  );
  const result = options.apply
    ? await cleanupBillLifecycle(db)
    : await previewBillLifecycle(db);
  console.log(JSON.stringify(result));
  if (result.files?.failed) process.exitCode = 1;
  if (options.apply)
    console.log(
      "Bounded batch complete. Repeat for remaining work; final file sweeps wait 24 hours. No scheduler is configured.",
    );
} catch {
  console.error(
    "Lifecycle cleanup failed. Check configuration, migration and --apply --project-ref <matching-project-ref>. Failed work remains retryable.",
  );
  process.exitCode = 1;
}
