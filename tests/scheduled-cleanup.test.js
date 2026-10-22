// @vitest-environment node
import { expect, it, vi } from "vitest";
import {
  CLEANUP_LIMITS,
  readCleanupBacklog,
  runScheduledCleanup,
} from "@/lib/scheduled-cleanup.mjs";

const billId = "11111111-1111-4111-8111-111111111111";
const job = (id) => ({
  id,
  bill_id: billId,
  bucket: "receipt-images",
  object_key: `${billId}/${id}`,
  lease_id: `lease-${id}`,
  final_sweep_after: "2020-01-01T00:00:00Z",
});

function fixture({
  batches = [[]],
  uploads = [],
  backlog = {},
  onRpc = () => {},
} = {}) {
  const trace = [];
  const remove = vi.fn(async () => ({ data: [] }));
  const list = vi.fn(async () => ({ data: [] }));
  const deletes = vi.fn();
  const queries = [];
  const from = vi.fn((table) => {
    const query = { table, filters: [], head: false, deleting: false };
    queries.push(query);
    const chain = {
      select(columns, options = {}) {
        query.columns = columns;
        query.head = options.head;
        return this;
      },
      lte(...args) {
        query.filters.push(["lte", ...args]);
        return this;
      },
      lt(...args) {
        query.filters.push(["lt", ...args]);
        return this;
      },
      neq(...args) {
        query.filters.push(["neq", ...args]);
        return this;
      },
      or(...args) {
        query.filters.push(["or", ...args]);
        return this;
      },
      order(...args) {
        query.order = args;
        return this;
      },
      limit(n) {
        query.limit = n;
        return this;
      },
      delete() {
        query.deleting = true;
        return this;
      },
      in(...args) {
        query.ids = args;
        return this;
      },
      then(resolve) {
        if (query.deleting) {
          deletes(query);
          return Promise.resolve(resolve({ data: [] }));
        }
        if (!query.head) {
          trace.push("uploads");
          return Promise.resolve(resolve({ data: uploads }));
        }
        const key =
          table === "lifecycle_file_jobs"
            ? query.filters.length
              ? "fileJobs"
              : "pendingFileJobs"
            : {
                bills: "expiredBills",
                receipt_scans: "expiredDrafts",
                image_upload_reservations: "staleUploads",
                rate_limit_counters: "oldCounterWindows",
              }[table];
        return Promise.resolve(resolve({ count: backlog[key] ?? 0 }));
      },
    };
    return chain;
  });
  const rpc = vi.fn(async (name, args) => {
    trace.push(name);
    const override = await onRpc(name, args);
    if (override) return override;
    return {
      data:
        name === "cleanup_bill_lifecycle"
          ? { bills_removed: 2, drafts_removed: 4 }
          : name === "cleanup_rate_limits"
            ? 6
            : name === "claim_lifecycle_file_jobs"
              ? (batches.shift() ?? [])
              : null,
    };
  });
  const db = { from, rpc, storage: { from: vi.fn(() => ({ remove, list })) } };
  return { db, trace, rpc, remove, list, deletes, queries };
}

it("runs each bounded housekeeping phase before draining the file queue", async () => {
  const f = fixture({
    batches: [[job("one")], []],
    uploads: [
      {
        id: "draft",
        storage_key: `${billId}/draft`,
        purpose: "receipt",
        status: "pending",
      },
      {
        id: "kept",
        storage_key: `${billId}/kept`,
        purpose: "receipt",
        status: "complete",
      },
    ],
  });
  const result = await runScheduledCleanup(f.db);
  expect(result).toMatchObject({
    status: "completed",
    billsRemoved: 2,
    draftsRemoved: 4,
    uploadsRemoved: 2,
    counterWindowsRemoved: 6,
    files: { processed: 1, failed: 0 },
    countsComplete: true,
  });
  expect(f.trace.slice(0, 4)).toEqual([
    "cleanup_bill_lifecycle",
    "uploads",
    "cleanup_rate_limits",
    "claim_lifecycle_file_jobs",
  ]);
  expect(f.rpc).toHaveBeenCalledWith("cleanup_bill_lifecycle", {
    batch_size: 20,
  });
  expect(
    f.queries.find((q) => !q.head && q.table === "image_upload_reservations")
      .limit,
  ).toBe(20);
  expect(f.remove).toHaveBeenNthCalledWith(2, [`${billId}/draft`]);
  expect(f.remove.mock.calls.slice(1).flat(2)).not.toContain(`${billId}/kept`);
  expect(f.deletes).toHaveBeenCalledWith(
    expect.objectContaining({ ids: ["id", ["draft", "kept"]] }),
  );
});

it("can finish all thirteen due jobs in one run without treating future jobs as overdue", async () => {
  const jobs = Array.from({ length: 13 }, (_, i) => job(`file-${i}`));
  const batches = Array.from({ length: 5 }, (_, i) =>
    jobs.slice(i * 3, i * 3 + 3),
  );
  const f = fixture({ batches });
  const result = await runScheduledCleanup(f.db);
  expect(result.files).toEqual({ processed: 13, failed: 0, waiting: 0 });
  expect(result.status).toBe("completed");
  expect(f.remove).toHaveBeenCalledTimes(13);
  expect(
    f.rpc.mock.calls.filter(([name]) => name === "claim_lifecycle_file_jobs"),
  ).toHaveLength(6);
  const future = fixture({ backlog: { pendingFileJobs: 13 } });
  expect(await runScheduledCleanup(future.db)).toMatchObject({
    status: "completed",
    remainingDue: { fileJobs: 0, pendingFileJobs: 13 },
  });
  expect(future.remove).not.toHaveBeenCalled();
});

it("stops at forty file batches and reports remaining due work as partial", async () => {
  const f = fixture({
    backlog: { fileJobs: 1 },
    onRpc: (name) =>
      name === "claim_lifecycle_file_jobs"
        ? { data: [job("a"), job("b"), job("c")] }
        : null,
  });
  const result = await runScheduledCleanup(f.db);
  expect(result).toMatchObject({
    status: "partial",
    stoppedReason: "batch_limit",
    fileBatches: 40,
    files: { processed: 120 },
  });
  expect(
    f.rpc.mock.calls.filter(([name]) => name === "cleanup_bill_lifecycle"),
  ).toHaveLength(1);
  expect(
    f.rpc.mock.calls.filter(([name]) => name === "claim_lifecycle_file_jobs"),
  ).toHaveLength(CLEANUP_LIMITS.fileBatches);
});

it("stops after the first file failure, acknowledges retry work and leaves other claims leased", async () => {
  const f = fixture({
    batches: [[job("bad"), job("not-touched"), job("also-not-touched")]],
  });
  f.remove.mockResolvedValueOnce({
    error: { statusCode: 503, message: "private-storage-path" },
  });
  const result = await runScheduledCleanup(f.db);
  expect(result).toMatchObject({
    status: "failed",
    failedStage: "files",
    files: { processed: 1, failed: 1 },
    countsComplete: false,
  });
  expect(f.remove).toHaveBeenCalledTimes(1);
  expect(f.rpc).toHaveBeenLastCalledWith(
    "finish_lifecycle_file_job",
    expect.objectContaining({ succeeded: false, target_job_id: "bad" }),
  );
  expect(JSON.stringify(result)).not.toContain("private-storage-path");
});

it("retains upload reservations after Storage failure and runs no later mutations", async () => {
  const f = fixture({
    uploads: [
      {
        id: "retry",
        storage_key: `${billId}/retry`,
        purpose: "receipt",
        status: "pending",
      },
    ],
  });
  f.remove.mockResolvedValueOnce({
    error: { message: "secret-provider-error" },
  });
  const result = await runScheduledCleanup(f.db);
  expect(result).toMatchObject({
    status: "failed",
    failedStage: "uploads",
    countsComplete: false,
  });
  expect(f.deletes).not.toHaveBeenCalled();
  expect(f.trace).not.toContain("cleanup_rate_limits");
  expect(f.trace).not.toContain("claim_lifecycle_file_jobs");
  expect(JSON.stringify(result)).not.toContain("secret-provider-error");
});

it.each([
  "cleanup_bill_lifecycle",
  "cleanup_rate_limits",
  "finish_lifecycle_file_job",
])("stops safely when %s loses its response", async (failedRpc) => {
  const f = fixture({
    batches: [[job("retry"), job("later")]],
    onRpc: (name) =>
      name === failedRpc ? { error: { message: "sensitive" } } : null,
  });
  const result = await runScheduledCleanup(f.db);
  expect(result).toMatchObject({ status: "failed", countsComplete: false });
  if (failedRpc === "cleanup_bill_lifecycle")
    expect(f.trace).toEqual([failedRpc]);
  if (failedRpc === "cleanup_rate_limits")
    expect(f.trace).not.toContain("claim_lifecycle_file_jobs");
  if (failedRpc === "finish_lifecycle_file_job")
    expect(f.remove).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(result)).not.toContain("sensitive");
});

it("starts no more mutation batches after the soft deadline", async () => {
  let elapsed = 0;
  const f = fixture({
    onRpc: () => {
      elapsed = 210_000;
    },
  });
  const result = await runScheduledCleanup(f.db, { clock: () => elapsed });
  expect(result).toMatchObject({
    status: "partial",
    stoppedReason: "time_budget",
    durationMs: 210_000,
  });
  expect(f.trace).toEqual(["cleanup_bill_lifecycle"]);
  expect(f.remove).not.toHaveBeenCalled();
});

it("an aborted hard deadline stops further writes and leaves uncertain counts explicit", async () => {
  const controller = new AbortController();
  const f = fixture({
    onRpc: () => {
      controller.abort();
    },
  });
  const result = await runScheduledCleanup(f.db, { signal: controller.signal });
  expect(result).toMatchObject({
    status: "failed",
    stoppedReason: "deadline",
    countsComplete: false,
    remainingDue: null,
  });
  expect(f.trace).toEqual(["cleanup_bill_lifecycle"]);
});

it("backlog reads use only aggregate counts with draft, age and lease eligibility filters", async () => {
  const f = fixture();
  await readCleanupBacklog(f.db, Date.parse("2026-10-24T00:00:00Z"));
  expect(f.queries.every((q) => q.head && !q.deleting)).toBe(true);
  expect(
    f.queries.find((q) => q.table === "receipt_scans").filters,
  ).toContainEqual(["neq", "status", "confirmed"]);
  expect(
    f.queries.find((q) => q.table === "rate_limit_counters").filters,
  ).toContainEqual(["lt", "expires_at", "2026-10-23T00:00:00.000Z"]);
  expect(
    f.queries.find((q) => q.table === "lifecycle_file_jobs").filters,
  ).toContainEqual([
    "or",
    "lease_until.is.null,lease_until.lte.2026-10-24T00:00:00.000Z",
  ]);
  expect(f.rpc).not.toHaveBeenCalled();
});

it("concurrent reconciliation runners process disjoint claims and preserve unrelated paths", async () => {
  const f = fixture({
    batches: [[job("one"), job("two")], [job("three")], []],
  });
  const results = await Promise.all([
    runScheduledCleanup(f.db),
    runScheduledCleanup(f.db),
  ]);
  expect(results.every((result) => result.status === "completed")).toBe(true);
  expect(f.remove.mock.calls.flat(2).sort()).toEqual([
    `${billId}/one`,
    `${billId}/three`,
    `${billId}/two`,
  ]);
  expect(f.deletes).not.toHaveBeenCalled();
});
