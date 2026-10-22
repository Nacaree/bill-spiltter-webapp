import {
  cleanupExpiredLifecycleRecords,
  cleanupLifecycleFiles,
} from "./cleanup-bill-lifecycle.mjs";
import { cleanupImageUploadBatch } from "./cleanup-image-uploads.mjs";

export const CLEANUP_LIMITS = Object.freeze({
  softDeadlineMs: 210_000,
  hardDeadlineMs: 240_000,
  requestTimeoutMs: 15_000,
  fileBatches: 40,
});

function count(value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Cleanup count unavailable");
  return value;
}

// HEAD/count requests only. Future and actively leased jobs are not due work.
export async function readCleanupBacklog(db, now = Date.now()) {
  const timestamp = new Date(now).toISOString();
  const dayAgo = new Date(now - 86_400_000).toISOString();
  const names = [
    "expiredBills",
    "expiredDrafts",
    "staleUploads",
    "oldCounterWindows",
    "fileJobs",
    "pendingFileJobs",
  ];
  const results = await Promise.all([
    db
      .from("bills")
      .select("id", { count: "exact", head: true })
      .lte("expires_at", timestamp),
    db
      .from("receipt_scans")
      .select("id", { count: "exact", head: true })
      .neq("status", "confirmed")
      .lte("expires_at", timestamp),
    db
      .from("image_upload_reservations")
      .select("id", { count: "exact", head: true })
      .lt("created_at", dayAgo),
    db
      .from("rate_limit_counters")
      .select("policy", { count: "exact", head: true })
      .lt("expires_at", dayAgo),
    db
      .from("lifecycle_file_jobs")
      .select("id", { count: "exact", head: true })
      .lte("next_attempt_at", timestamp)
      .or(`lease_until.is.null,lease_until.lte.${timestamp}`),
    db.from("lifecycle_file_jobs").select("id", { count: "exact", head: true }),
  ]);
  return Object.fromEntries(
    results.map((result, index) => {
      if (result.error) throw new Error("Cleanup backlog unavailable");
      return [names[index], count(result.count)];
    }),
  );
}

// This runner owns no timers or credentials. The caller supplies a client whose
// requests obey the shared hard deadline and individual request timeout.
export async function runScheduledCleanup(
  db,
  { signal, clock = () => performance.now() } = {},
) {
  const started = clock();
  const result = {
    status: "completed",
    stoppedReason: "idle",
    billsRemoved: 0,
    draftsRemoved: 0,
    uploadsRemoved: 0,
    counterWindowsRemoved: 0,
    fileBatches: 0,
    files: { processed: 0, failed: 0, waiting: 0 },
    remainingDue: null,
    countsComplete: true,
    durationMs: 0,
  };
  let phase = "lifecycle";
  function mayStartBatch() {
    signal?.throwIfAborted();
    if (clock() - started >= CLEANUP_LIMITS.softDeadlineMs) {
      result.status = "partial";
      result.stoppedReason = "time_budget";
      return false;
    }
    return true;
  }

  try {
    if (mayStartBatch()) {
      const removed = await cleanupExpiredLifecycleRecords(db);
      result.billsRemoved = count(removed.bills_removed);
      result.draftsRemoved = count(removed.drafts_removed);
    }
    phase = "uploads";
    if (mayStartBatch())
      result.uploadsRemoved = count(await cleanupImageUploadBatch(db));
    phase = "counters";
    if (mayStartBatch()) {
      const removed = await db.rpc("cleanup_rate_limits");
      if (removed.error) throw new Error("Counter cleanup unavailable");
      result.counterWindowsRemoved = count(removed.data);
    }
    phase = "files";
    while (result.fileBatches < CLEANUP_LIMITS.fileBatches && mayStartBatch()) {
      const files = await cleanupLifecycleFiles(db, { stopOnFailure: true });
      result.fileBatches++;
      for (const key of ["processed", "failed", "waiting"])
        result.files[key] += count(files[key]);
      if (files.failed) throw new Error("File cleanup incomplete");
      if (!files.processed) break;
      if (result.fileBatches === CLEANUP_LIMITS.fileBatches)
        result.stoppedReason = "batch_limit";
    }
  } catch {
    result.status = "failed";
    result.stoppedReason = signal?.aborted ? "deadline" : "operation_failed";
    result.failedStage = phase;
    // A request may have committed before its response was lost. These counts
    // describe acknowledged work only; never claim that a timeout rolled it back.
    result.countsComplete = false;
  }

  try {
    signal?.throwIfAborted();
    result.remainingDue = await readCleanupBacklog(db);
    const hasDueWork = Object.entries(result.remainingDue).some(
      ([name, value]) => name !== "pendingFileJobs" && value > 0,
    );
    if (result.status === "completed" && hasDueWork) {
      result.status = "partial";
      if (result.stoppedReason === "idle")
        result.stoppedReason = "remaining_work";
    }
  } catch {
    if (result.status !== "failed") {
      result.status = "failed";
      result.failedStage = "backlog";
      result.stoppedReason = signal?.aborted ? "deadline" : "operation_failed";
    }
    result.countsComplete = false;
  }
  result.durationMs = Math.max(0, Math.round(clock() - started));
  return result;
}
