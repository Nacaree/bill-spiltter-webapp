// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { CLEANUP_LIMITS } from "@/lib/scheduled-cleanup.mjs";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => ({})) }));
vi.mock("@/server/monitoring", () => ({ reportAppError: vi.fn() }));

import { createClient } from "@supabase/supabase-js";
import {
  createCleanupClient,
  handleScheduledCleanup,
} from "@/server/scheduled-cleanup";
import {
  GET,
  HEAD,
  OPTIONS,
  POST,
  PUT,
  PATCH,
  DELETE,
  maxDuration,
  runtime,
  dynamic,
} from "@/app/api/cron/lifecycle-cleanup/route";

const secret = "test-only-secret-that-is-at-least-32-characters";
const config = {
  VERCEL_ENV: "production",
  CRON_SECRET: secret,
  LIFECYCLE_CLEANUP_ENABLED: "true",
  LIFECYCLE_CLEANUP_PROJECT_REF: "example",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "private-service-role-key",
};
const request = (options = {}) =>
  new Request("https://app.example/api/cron/lifecycle-cleanup", {
    headers: { authorization: `Bearer ${secret}` },
    ...options,
  });
function fixture(overrides = {}) {
  return {
    config: { ...config, ...overrides },
    createDb: vi.fn(() => ({})),
    run: vi.fn(async () => ({
      status: "completed",
      files: { processed: 0, failed: 0 },
      remainingDue: { fileJobs: 0 },
    })),
    reportFailure: vi.fn(),
    log: vi.fn(),
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it.each([
  [{ CRON_SECRET: "" }, 503],
  [{ CRON_SECRET: "short" }, 503],
  [{ LIFECYCLE_CLEANUP_ENABLED: "false" }, 503],
  [{ LIFECYCLE_CLEANUP_ENABLED: undefined }, 503],
  [{ VERCEL_ENV: "preview" }, 404],
  [{ VERCEL_ENV: "development" }, 404],
  [{ LIFECYCLE_CLEANUP_PROJECT_REF: "other" }, 503],
  [{ LIFECYCLE_CLEANUP_PROJECT_REF: undefined }, 503],
  [{ NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co" }, 503],
  [{ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co.evil.test" }, 503],
  [{ NEXT_PUBLIC_SUPABASE_URL: "https://user:pass@example.supabase.co" }, 503],
  [{ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co/other" }, 503],
  [
    { NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co?target=other" },
    503,
  ],
  [{ SUPABASE_SERVICE_ROLE_KEY: "" }, 503],
])(
  "configuration gates %j before constructing a client",
  async (overrides, status) => {
    const f = fixture(overrides);
    const result = await handleScheduledCleanup(request(), f);
    expect(result.status).toBe(status);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(f.createDb).not.toHaveBeenCalled();
    expect(f.run).not.toHaveBeenCalled();
    const text = await result.text();
    expect(text).not.toContain(secret);
    expect(text).not.toContain(config.SUPABASE_SERVICE_ROLE_KEY);
  },
);

it.each([
  undefined,
  "Bearer wrong",
  `Bearer ${secret}extra`,
  `Basic ${secret}`,
])(
  "rejects invalid authorization %s without mutations",
  async (authorization) => {
    const f = fixture();
    const result = await handleScheduledCleanup(
      request({ headers: authorization ? { authorization } : {} }),
      f,
    );
    expect(result.status).toBe(401);
    expect(f.createDb).not.toHaveBeenCalled();
    expect(f.reportFailure).not.toHaveBeenCalled();
  },
);

it("accepts no target, deadline or scope parameters", async () => {
  const f = fixture();
  const req = new Request(
    "https://app.example/api/cron/lifecycle-cleanup?project=other",
    { headers: { authorization: `Bearer ${secret}` } },
  );
  expect((await handleScheduledCleanup(req, f)).status).toBe(400);
  expect(f.createDb).not.toHaveBeenCalled();
});

it("runs authorized Production cleanup once with a shared abort signal", async () => {
  const f = fixture();
  const result = await handleScheduledCleanup(request(), f);
  expect(result.status).toBe(200);
  expect(f.createDb).toHaveBeenCalledOnce();
  expect(f.run).toHaveBeenCalledOnce();
  expect(f.run.mock.calls[0][1].signal).toBe(f.createDb.mock.calls[0][1]);
  expect(f.createDb.mock.calls[0][1].aborted).toBe(false);
  expect(f.log).toHaveBeenCalledOnce();
  expect(f.reportFailure).not.toHaveBeenCalled();
});

it("returns successful partial results, but reports failures without forwarding exception contents", async () => {
  const partial = fixture();
  partial.run.mockResolvedValue({
    status: "partial",
    stoppedReason: "time_budget",
    remainingDue: { fileJobs: 10 },
  });
  expect((await handleScheduledCleanup(request(), partial)).status).toBe(200);
  expect(partial.reportFailure).not.toHaveBeenCalled();
  const f = fixture();
  f.run.mockRejectedValue(
    new Error(`${secret} private-cookie https://private-storage-url`),
  );
  const result = await handleScheduledCleanup(request(), f);
  expect(result.status).toBe(500);
  expect(f.reportFailure).toHaveBeenCalledOnce();
  const output = JSON.stringify({
    response: await result.json(),
    logs: f.log.mock.calls,
    reports: f.reportFailure.mock.calls,
  });
  for (const value of [
    secret,
    "private-cookie",
    "private-storage-url",
    config.SUPABASE_SERVICE_ROLE_KEY,
  ])
    expect(output).not.toContain(value);
});

it("reports handled cleanup errors and keeps the safe progress summary", async () => {
  const f = fixture();
  f.run.mockResolvedValue({
    status: "failed",
    countsComplete: false,
    files: { processed: 1, failed: 1 },
  });
  const result = await handleScheduledCleanup(request(), f);
  expect(result.status).toBe(500);
  expect(await result.json()).toMatchObject({
    files: { processed: 1, failed: 1 },
  });
  expect(f.reportFailure).toHaveBeenCalledOnce();
});

it("aborts work at 240 seconds and clears its timer on exit", async () => {
  vi.useFakeTimers();
  const f = fixture();
  f.run.mockImplementation(
    (_db, { signal }) =>
      new Promise((resolve) => {
        signal.addEventListener(
          "abort",
          () => resolve({ status: "failed", stoppedReason: "deadline" }),
          { once: true },
        );
      }),
  );
  const running = handleScheduledCleanup(request(), f);
  await vi.advanceTimersByTimeAsync(CLEANUP_LIMITS.hardDeadlineMs - 1);
  expect(f.createDb.mock.calls[0][1].aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect((await running).status).toBe(500);
  expect(f.createDb.mock.calls[0][1].aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});

it("caps each fetch at fifteen seconds and preserves caller/run cancellation", async () => {
  const deadline = new AbortController(),
    caller = new AbortController(),
    individual = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(individual.signal);
  const fetch = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  createCleanupClient(config, deadline.signal);
  const customFetch = createClient.mock.calls.at(-1)[2].global.fetch;
  await customFetch("https://example.supabase.co/rest/v1/bills", {
    signal: caller.signal,
  });
  expect(timeout).toHaveBeenCalledWith(15_000);
  const signal = fetch.mock.calls[0][1].signal;
  expect(signal.aborted).toBe(false);
  individual.abort();
  expect(signal.aborted).toBe(true);
  await customFetch("https://example.supabase.co/rest/v1/bills");
  expect(fetch.mock.calls[0][1].cache).toBe("no-store");
});

it("the deployed route explicitly rejects HEAD/other methods instead of calling GET", async () => {
  expect({ maxDuration, runtime, dynamic }).toEqual({
    maxDuration: 300,
    runtime: "nodejs",
    dynamic: "force-dynamic",
  });
  for (const method of [HEAD, OPTIONS, POST, PUT, PATCH, DELETE]) {
    const result = await method(request());
    expect(result.status).toBe(405);
    expect(result.headers.get("allow")).toBe("GET");
    expect(result.headers.get("cache-control")).toBe("no-store");
  }
  vi.stubEnv("VERCEL_ENV", "preview");
  expect((await GET(request())).status).toBe(404);
  expect(createClient).not.toHaveBeenCalled();
});
