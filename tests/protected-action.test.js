// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ guard: vi.fn() }));
vi.mock("@/server/rate-limits", () => ({ guardRequest: mocks.guard }));
vi.mock("@/server/monitoring", () => ({
  monitorAction: (_name, work) => work(),
}));
import { protectedAction } from "@/server/protected-action";
import {
  RateLimitError,
  RateLimitUnavailableError,
} from "@/lib/rate-limit-error";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue(undefined);
});
it("blocks before any business work and preserves form/upload response shapes", async () => {
  const work = vi.fn();
  mocks.guard.mockRejectedValue(new RateLimitError(60));
  expect(await protectedAction("createBillAction", work)).toMatchObject({
    code: "rate_limited",
    retryAfterSeconds: 60,
    errors: { form: expect.stringContaining("1 minute") },
  });
  expect(
    await protectedAction("completeImageUploadAction", work),
  ).toMatchObject({
    code: "rate_limited",
    resetUpload: false,
    error: expect.any(String),
  });
  expect(work).not.toHaveBeenCalled();
});
it("has no fallback when the store is unavailable", async () => {
  const work = vi.fn();
  mocks.guard.mockRejectedValue(new RateLimitUnavailableError());
  expect((await protectedAction("createExpenseAction", work)).code).toBe(
    "rate_limit_unavailable",
  );
  expect(work).not.toHaveBeenCalled();
});
it("returns normal business results when allowed", async () => {
  expect(
    await protectedAction("createExpenseAction", async () => ({
      success: true,
    })),
  ).toEqual({ success: true });
});

it("guards every exported Server Action in the application", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const file of [
    "actions.js",
    "settlement-actions.js",
    "image-upload-actions.js",
  ]) {
    const source = await readFile(
      new URL(`../src/app/${file}`, import.meta.url),
      "utf8",
    );
    const names = [...source.matchAll(/export async function (\w+)/g)].map(
      (m) => m[1],
    );
    for (const name of names)
      expect(source).toContain(`return protectedAction("${name}",`);
  }
});
