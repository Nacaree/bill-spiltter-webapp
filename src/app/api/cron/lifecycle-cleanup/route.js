import {
  handleScheduledCleanup,
  rejectCleanupMethod,
} from "@/server/scheduled-cleanup";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request) {
  return handleScheduledCleanup(request);
}

// Next otherwise implements HEAD by invoking GET, which must never run cleanup.
export const HEAD = rejectCleanupMethod;
export const OPTIONS = rejectCleanupMethod;
export const POST = rejectCleanupMethod;
export const PUT = rejectCleanupMethod;
export const PATCH = rejectCleanupMethod;
export const DELETE = rejectCleanupMethod;
