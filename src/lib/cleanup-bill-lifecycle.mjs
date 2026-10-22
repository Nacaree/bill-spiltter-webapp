const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKETS = new Set([
  "receipt-images",
  "payment-qrs",
  "image-upload-staging",
]);

function checked(result) {
  if (result.error) throw new Error("Lifecycle operation failed");
  return result.data;
}

export function lifecycleOptions(args, projectUrl) {
  let apply = false;
  let projectRef;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") apply = true;
    else if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--project-ref") projectRef = args[++i];
    else
      throw new Error("Use --dry-run or --apply --project-ref <project-ref>.");
  }
  const url = new URL(projectUrl);
  const actualRef = url.hostname.endsWith(".supabase.co")
    ? url.hostname.slice(0, -".supabase.co".length)
    : url.host;
  if (url.username || url.password || (apply && dryRun))
    throw new Error("Invalid cleanup options.");
  if ((apply && !projectRef) || (projectRef && projectRef !== actualRef))
    throw new Error(
      "The explicit project ref must match the configured Supabase target.",
    );
  return { apply, projectRef: actualRef };
}

// No writes, claims or cleanup RPCs in preview mode; return counts only.
export async function previewBillLifecycle(db, now = Date.now()) {
  const timestamp = new Date(now).toISOString();
  const bills = await db
    .from("bills")
    .select("id", { count: "exact", head: true })
    .lte("expires_at", timestamp);
  const drafts = await db
    .from("receipt_scans")
    .select("id", { count: "exact", head: true })
    .neq("status", "confirmed")
    .lte("expires_at", timestamp);
  const jobs = await db
    .from("lifecycle_file_jobs")
    .select("id", { count: "exact", head: true });
  for (const result of [bills, drafts, jobs]) checked(result);
  return {
    expiredBills: bills.count,
    expiredDrafts: drafts.count,
    pendingFileJobs: jobs.count,
  };
}

export async function cleanupLifecycleFiles(db, { billId = null } = {}) {
  const jobs =
    checked(
      await db.rpc("claim_lifecycle_file_jobs", {
        batch_size: 3,
        target_bill_id: billId,
      }),
    ) ?? [];
  const result = { processed: 0, failed: 0, waiting: 0 };
  for (const job of jobs) {
    let succeeded = false;
    let drained = false;
    try {
      if (!UUID.test(job.bill_id) || !BUCKETS.has(job.bucket))
        throw new Error("Invalid cleanup job");
      const prefix = `${job.bill_id}/`;
      if (job.object_key !== null) {
        if (!job.object_key.startsWith(prefix) || job.object_key.includes(".."))
          throw new Error("Invalid cleanup key");
        const removed = await db.storage
          .from(job.bucket)
          .remove([job.object_key]);
        if (String(removed.error?.statusCode) !== "404") checked(removed);
        drained = true;
      } else {
        // Virtual folders disappear when emptied. Restart at offset zero on each
        // pass so deletion never skips objects; bound both traversal and removal.
        const paths = [];
        let readsLeft = 10;
        drained = true;
        async function collect(folder, depth = 0) {
          if (!readsLeft || paths.length >= 100) {
            drained = false;
            return;
          }
          readsLeft--;
          const files =
            checked(
              await db.storage.from(job.bucket).list(folder, {
                limit: 100,
                offset: 0,
                sortBy: { column: "name", order: "asc" },
              }),
            ) ?? [];
          if (files.length === 100) drained = false;
          for (const file of files) {
            if (
              !file.name ||
              file.name.includes("/") ||
              file.name.includes("..")
            )
              throw new Error("Invalid cleanup path");
            const path = `${folder}/${file.name}`;
            if (!file.id && !file.metadata) {
              if (depth >= 8) throw new Error("Cleanup folder is too deep");
              await collect(path, depth + 1);
            } else if (paths.length < 100) paths.push(path);
            else drained = false;
          }
        }
        await collect(job.bill_id);
        if (paths.length)
          checked(await db.storage.from(job.bucket).remove(paths));
      }
      succeeded = true;
    } catch {
      result.failed++;
    }
    checked(
      await db.rpc("finish_lifecycle_file_job", {
        target_job_id: job.id,
        target_lease_id: job.lease_id,
        succeeded,
        drained,
      }),
    );
    result.processed++;
    if (
      succeeded &&
      (!drained || new Date(job.final_sweep_after).getTime() > Date.now())
    )
      result.waiting++;
  }
  return result;
}

export async function cleanupBillLifecycle(db) {
  const removed = checked(
    await db.rpc("cleanup_bill_lifecycle", { batch_size: 20 }),
  );
  return { ...removed, files: await cleanupLifecycleFiles(db) };
}
