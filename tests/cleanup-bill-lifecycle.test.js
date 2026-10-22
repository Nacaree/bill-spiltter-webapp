// @vitest-environment node
import { expect, it, vi } from "vitest";
import {
  cleanupBillLifecycle,
  cleanupLifecycleFiles,
  lifecycleOptions,
  previewBillLifecycle,
} from "@/lib/cleanup-bill-lifecycle.mjs";

const billId = "11111111-1111-4111-8111-111111111111";
function fixture(jobs) {
  const objects = new Map();
  const list = vi.fn(async () => ({
    data: [...objects.keys()]
      .slice(0, 100)
      .map((name) => ({ id: name, name, metadata: {} })),
  }));
  const remove = vi.fn(async (paths) => {
    for (const path of paths) objects.delete(path.slice(billId.length + 1));
    return { data: [] };
  });
  const rpc = vi.fn(async (name) => ({
    data:
      name === "claim_lifecycle_file_jobs"
        ? jobs
        : name === "cleanup_bill_lifecycle"
          ? { bills_removed: 1, drafts_removed: 2 }
          : null,
  }));
  const storage = vi.fn(() => ({ list, remove }));
  return {
    db: { rpc, storage: { from: storage } },
    objects,
    rpc,
    list,
    remove,
    storage,
  };
}
const job = (changes = {}) => ({
  id: "job",
  bill_id: billId,
  bucket: "receipt-images",
  object_key: null,
  lease_id: "lease",
  ...changes,
});
it("requires an explicit matching project for apply and defaults to dry-run", () => {
  const url = "https://example.supabase.co";
  expect(lifecycleOptions([], url)).toEqual({
    apply: false,
    projectRef: "example",
  });
  for (const args of [
    ["--apply"],
    ["--apply", "--project-ref", "wrong"],
    ["--apply", "--dry-run"],
    ["--unknown"],
  ])
    expect(() => lifecycleOptions(args, url)).toThrow();
  expect(
    lifecycleOptions(["--apply", "--project-ref", "example"], url).apply,
  ).toBe(true);
});
it("dry-run performs only count reads and never claims a job or invokes cleanup", async () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    then(resolve) {
      resolve({ count: 2, data: null });
    },
  };
  const db = {
    from: vi.fn(() => chain),
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  };
  expect(await previewBillLifecycle(db)).toEqual({
    expiredBills: 2,
    expiredDrafts: 2,
    pendingFileJobs: 2,
  });
  expect(db.rpc).not.toHaveBeenCalled();
  expect(db.storage.from).not.toHaveBeenCalled();
});
it("deletes bounded first pages without skipping objects, and catches a late upload on a later sweep", async () => {
  const f = fixture([job()]);
  for (let i = 0; i < 150; i++) f.objects.set(`receipt-${i}`, true);
  await cleanupLifecycleFiles(f.db);
  expect(f.objects.size).toBe(50);
  expect(f.rpc).toHaveBeenLastCalledWith(
    "finish_lifecycle_file_job",
    expect.objectContaining({ succeeded: true, drained: false }),
  );
  await cleanupLifecycleFiles(f.db);
  expect(f.objects.size).toBe(0);
  f.objects.set("late-upload", true);
  await cleanupLifecycleFiles(f.db);
  expect(f.objects.size).toBe(0);
  expect(f.list).toHaveBeenLastCalledWith(
    billId,
    expect.objectContaining({ offset: 0, limit: 100 }),
  );
  expect(
    f.remove.mock.calls.flat(2).every((path) => path.startsWith(`${billId}/`)),
  ).toBe(true);
});
it("storage failure retains retry work and never reports successful removal", async () => {
  const f = fixture([job({ object_key: `${billId}/draft` })]);
  f.remove.mockResolvedValueOnce({ error: { statusCode: 503 } });
  expect((await cleanupLifecycleFiles(f.db)).failed).toBe(1);
  expect(f.rpc).toHaveBeenLastCalledWith(
    "finish_lifecycle_file_job",
    expect.objectContaining({ succeeded: false, drained: false }),
  );
  await cleanupLifecycleFiles(f.db);
  expect(f.rpc).toHaveBeenLastCalledWith(
    "finish_lifecycle_file_job",
    expect.objectContaining({ succeeded: true, drained: true }),
  );
});
it("rejects foreign bucket/path jobs without removing anything", async () => {
  for (const changes of [
    { bucket: "foreign" },
    { object_key: "another-bill/file" },
    { bill_id: "../" },
  ]) {
    const f = fixture([job(changes)]);
    expect((await cleanupLifecycleFiles(f.db)).failed).toBe(1);
    expect(f.remove).not.toHaveBeenCalled();
  }
});
it("an interrupted acknowledgement leaves the lease for a later retry", async () => {
  const f = fixture([job()]);
  f.rpc.mockImplementation(async (name) =>
    name === "claim_lifecycle_file_jobs"
      ? { data: [job()] }
      : { error: { code: "network" } },
  );
  await expect(cleanupLifecycleFiles(f.db)).rejects.toThrow();
  expect(f.rpc).toHaveBeenLastCalledWith(
    "finish_lifecycle_file_job",
    expect.objectContaining({ target_lease_id: "lease" }),
  );
});
it("apply runs one bounded database batch and then its file queue", async () => {
  const f = fixture([]);
  expect(await cleanupBillLifecycle(f.db)).toMatchObject({
    bills_removed: 1,
    drafts_removed: 2,
  });
  expect(f.rpc).toHaveBeenNthCalledWith(1, "cleanup_bill_lifecycle", {
    batch_size: 20,
  });
});

it("sweeps nested orphan files while keeping every path inside the bill folder", async () => {
  const f = fixture([job()]);
  f.list.mockImplementation(async (folder) => ({
    data:
      folder === billId
        ? [{ name: "nested", id: null, metadata: null }]
        : [{ name: "orphan.png", id: "object", metadata: {} }],
  }));
  await cleanupLifecycleFiles(f.db);
  expect(f.remove).toHaveBeenCalledWith([`${billId}/nested/orphan.png`]);
  expect(f.rpc).toHaveBeenLastCalledWith(
    "finish_lifecycle_file_job",
    expect.objectContaining({ succeeded: true, drained: true }),
  );
});
