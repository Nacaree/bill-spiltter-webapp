import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  CLEANUP_LIMITS,
  runScheduledCleanup,
} from "@/lib/scheduled-cleanup.mjs";
import { reportAppError } from "@/server/monitoring";

const headers = { "Cache-Control": "no-store" };
const response = (body, status) => Response.json(body, { status, headers });

export function rejectCleanupMethod() {
  return new Response(null, {
    status: 405,
    headers: { ...headers, Allow: "GET" },
  });
}

export function createCleanupClient(config, signal) {
  return createClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init = {}) =>
          fetch(input, {
            ...init,
            cache: "no-store",
            signal: AbortSignal.any(
              [
                signal,
                init.signal,
                AbortSignal.timeout(CLEANUP_LIMITS.requestTimeoutMs),
              ].filter(Boolean),
            ),
          }),
      },
    },
  );
}

function validTarget(config) {
  const ref = config.LIFECYCLE_CLEANUP_PROJECT_REF;
  if (
    !/^[a-z0-9-]{1,63}$/.test(ref ?? "") ||
    !config.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
    return false;
  try {
    const url = new URL(config.NEXT_PUBLIC_SUPABASE_URL);
    return (
      url.origin === `https://${ref}.supabase.co` &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  } catch {
    return false;
  }
}

function authorized(request, secret) {
  const digest = (value) => createHash("sha256").update(value).digest();
  return timingSafeEqual(
    digest(request.headers.get("authorization") ?? ""),
    digest(`Bearer ${secret}`),
  );
}

export async function handleScheduledCleanup(
  request,
  {
    config = process.env,
    createDb = createCleanupClient,
    run = runScheduledCleanup,
    reportFailure = () =>
      reportAppError(
        new Error("Scheduled cleanup failed"),
        "lifecycle_cleanup",
      ),
    log = (result) =>
      console.info(JSON.stringify({ event: "scheduled_cleanup", ...result })),
  } = {},
) {
  if (request.method !== "GET") return rejectCleanupMethod();
  if (config.VERCEL_ENV !== "production")
    return response({ error: "Not found" }, 404);
  if (!/^\S{32,}$/.test(config.CRON_SECRET ?? ""))
    return response({ error: "Cleanup unavailable" }, 503);
  if (!authorized(request, config.CRON_SECRET))
    return response({ error: "Unauthorized" }, 401);
  if (config.LIFECYCLE_CLEANUP_ENABLED !== "true")
    return response({ error: "Cleanup disabled" }, 503);
  if (new URL(request.url).search)
    return response({ error: "Request parameters are not supported" }, 400);

  function reportSafely() {
    try {
      reportFailure();
    } catch {
      console.error(
        JSON.stringify({ event: "scheduled_cleanup_reporting_failed" }),
      );
    }
  }

  // All gates precede client construction; Preview shares Production's database.
  if (!validTarget(config)) {
    reportSafely();
    return response({ error: "Cleanup unavailable" }, 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("Cleanup deadline exceeded")),
    CLEANUP_LIMITS.hardDeadlineMs,
  );
  try {
    const result = await run(createDb(config, controller.signal), {
      signal: controller.signal,
    });
    log(result);
    if (result.status === "failed") reportSafely();
    return response(result, result.status === "failed" ? 500 : 200);
  } catch {
    const result = {
      status: "failed",
      stoppedReason: controller.signal.aborted
        ? "deadline"
        : "operation_failed",
      countsComplete: false,
    };
    log(result);
    reportSafely();
    return response(result, 500);
  } finally {
    clearTimeout(timer);
  }
}
