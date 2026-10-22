import { hashAccessToken } from "@/lib/access-tokens";
import { cleanupLifecycleFiles } from "@/lib/cleanup-bill-lifecycle.mjs";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  requireCreator,
  CreatorAccessRequiredError,
} from "@/server/payment-methods";
import { settlementAccess, phaseThreeError } from "@/server/settlements";
import { guardOperation } from "@/server/rate-limits";
import { reportAppError } from "@/server/monitoring";

export async function deleteBillPermanently(input) {
  const { bill, actor } = await requireCreator(input);
  await guardOperation("write", { billId: bill.id, participantId: actor.id });
  const { data, error } = await getServerSupabase().rpc(
    "delete_bill_permanently",
    {
      ...settlementAccess(input.shareToken, input.cookieValue),
      recovery_hash: hashAccessToken(input.recoveryToken),
    },
  );
  if (error?.code === "P0003") throw new CreatorAccessRequiredError();
  if (error) throw phaseThreeError(error);
  return data ?? bill.id; // Concurrent duplicate deletion is already complete.
}

export async function removeDeletedBillFiles(billId) {
  try {
    const result = await cleanupLifecycleFiles(
      getServerSupabase({ signal: AbortSignal.timeout(20_000) }),
      { billId },
    );
    if (result.failed) throw new Error("Bill file cleanup pending");
  } catch {
    reportAppError(new Error("Bill file cleanup pending"), "lifecycle_cleanup");
  }
}
