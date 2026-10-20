export const EXTRACTION_DEADLINE_MS = 90_000;
export const STALE_EXTRACTION_MS = 150_000;

export async function withExtractionDeadline(
  work,
  timeoutMs = EXTRACTION_DEADLINE_MS,
) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new DOMException(
        "Receipt extraction timed out.",
        "TimeoutError",
      );
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      Promise.resolve().then(() => work(controller.signal)),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function receiptCanRetry(scan, now = Date.now()) {
  if (scan.expires_at && new Date(scan.expires_at).getTime() <= now)
    return false;
  if (scan.next_retry_at && new Date(scan.next_retry_at).getTime() > now)
    return false;
  if (scan.status === "failed") return true;
  if (!["uploaded", "processing"].includes(scan.status)) return false;
  const started =
    scan.status === "processing"
      ? (scan.processing_started_at ?? scan.updated_at)
      : scan.created_at;
  return new Date(started).getTime() <= now - STALE_EXTRACTION_MS;
}
