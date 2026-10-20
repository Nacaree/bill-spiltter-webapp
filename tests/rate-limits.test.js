// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  report: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/server/monitoring", () => ({ reportAppError: mocks.report }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
import {
  ipSubject,
  consumeLimits,
  guardOperation,
  guardRequest,
} from "@/server/rate-limits";
import {
  RateLimitError,
  RateLimitUnavailableError,
  rateLimitFailure,
  readableWait,
} from "@/lib/rate-limit-error";
const secret = "private-test-secret-at-least-32-characters";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RATE_LIMIT_SECRET", secret);
  vi.stubEnv("VERCEL", "");
  mocks.rpc.mockResolvedValue({ data: { allowed: true } });
});
afterEach(() => vi.unstubAllEnvs());
it("hashes only validated trusted IPs and normalizes equivalent addresses", () => {
  const config = { secret, vercel: true };
  expect(ipSubject("2001:0db8:0:0::1", config)).toBe(
    ipSubject("2001:db8::1", config),
  );
  expect(ipSubject("::ffff:127.0.0.1", config)).toBe(
    ipSubject("127.0.0.1", config),
  );
  expect(ipSubject("1.2.3.4", config)).toMatch(/^[a-f0-9]{64}$/);
  for (const ip of [null, "", "1.2.3.4, 5.6.7.8", "fake"])
    expect(() => ipSubject(ip, config)).toThrow(RateLimitUnavailableError);
  expect(() =>
    ipSubject("1.2.3.4", { secret: "short", vercel: true }),
  ).toThrow();
});
it("ignores forwarded IPs outside Vercel", () => {
  expect(ipSubject("one", { secret, vercel: false })).toBe(
    ipSubject("two", { secret, vercel: false }),
  );
});
it("uses only the Vercel-controlled header", async () => {
  vi.stubEnv("VERCEL", "1");
  const get = vi.fn(() => "192.0.2.1");
  mocks.headers.mockResolvedValue({ get });
  await guardRequest();
  expect(get).toHaveBeenCalledWith("x-vercel-forwarded-for");
  expect(mocks.rpc.mock.calls[0][1].buckets[0]).toEqual({
    policy: "action_ip",
    subject: ipSubject("192.0.2.1", { secret, vercel: true }),
  });
});
it("chooses complete upload and write policies using server identities", async () => {
  await guardOperation("upload", { billId: "bill", participantId: "actor" });
  expect(mocks.rpc.mock.calls[0][1].buckets.map((b) => b.policy)).toEqual([
    "upload_ip",
    "upload_actor",
    "upload_bill",
    "upload_bill_day",
  ]);
  await guardOperation("write", { billId: "bill", participantId: "actor" });
  expect(mocks.rpc.mock.calls[1][1].buckets).toEqual([
    { policy: "write_actor", subject: "actor" },
    { policy: "write_bill", subject: "bill" },
  ]);
});
it("fails closed for missing identities, configuration, malformed responses, and database errors", async () => {
  await expect(guardOperation("write", { billId: "bill" })).rejects.toThrow(
    RateLimitUnavailableError,
  );
  vi.stubEnv("RATE_LIMIT_SECRET", "");
  await expect(guardRequest()).rejects.toThrow(RateLimitUnavailableError);
  for (const response of [
    { error: { code: "missing" } },
    { data: {} },
    { data: { allowed: false, retry_after_seconds: 0 } },
  ]) {
    mocks.rpc.mockResolvedValueOnce(response);
    await expect(
      consumeLimits([{ policy: "action_ip", subject: "x" }]),
    ).rejects.toThrow(RateLimitUnavailableError);
  }
  expect(mocks.report).toHaveBeenCalledWith(expect.any(Error), "rate_limit");
});
it("returns clear delays and treats expected denials as normal results", async () => {
  mocks.rpc.mockResolvedValue({
    data: { allowed: false, retry_after_seconds: 61, policy: "write_actor" },
  });
  await expect(
    consumeLimits([{ policy: "write_actor", subject: "x" }]),
  ).rejects.toThrow("Try again in 2 minutes");
  expect(mocks.report).not.toHaveBeenCalled();
  expect(rateLimitFailure(new RateLimitError(61), true)).toMatchObject({
    code: "rate_limited",
    retryAfterSeconds: 61,
    resetUpload: false,
  });
  expect(new RateLimitError(3601, "extract_app").message).toContain("manually");
  expect(readableWait(1)).toBe("1 second");
});
