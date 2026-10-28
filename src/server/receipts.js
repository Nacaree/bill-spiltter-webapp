import { imageLinkLifetime, receiptIsAvailable } from "@/lib/bill-lifecycle";
import { RateLimitError } from "@/lib/rate-limit-error";
import { hashAccessToken } from "@/lib/access-tokens";
import { reportAppError } from "@/server/monitoring";
import {
  extractReceiptImage,
  normalizeReceiptExtraction,
  ReceiptExtractionError,
} from "@/lib/receipt-extraction";
import { validateReceiptFile } from "@/lib/receipt-file";
import {
  receiptCanRetry,
  withExtractionDeadline,
} from "@/lib/receipt-processing";
import { verifyParticipantSession } from "@/lib/participant-session";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  BillNotFoundError,
  getBillByShareToken,
  getSessionParticipant,
  requireActiveBillId,
  ParticipantSessionRequiredError,
} from "@/server/bills";
import { ExpenseValidationError } from "@/server/expenses";

const RECEIPT_BUCKET = "receipt-images";

export class ReceiptNotFoundError extends Error {}
export class ReceiptConflictError extends Error {}
export class ReceiptEditSetupError extends Error {}

function resultRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

function sessionSecrets() {
  const secrets = [process.env.PARTICIPANT_SESSION_SECRET];
  if (process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET) {
    secrets.push(process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET);
  }
  return secrets;
}

function authenticatedCapability(shareToken, cookieValue) {
  let shareHash;
  try {
    shareHash = hashAccessToken(shareToken);
  } catch {
    throw new BillNotFoundError();
  }
  const session = verifyParticipantSession(cookieValue, {
    secrets: sessionSecrets(),
  });
  if (!session) throw new ParticipantSessionRequiredError();
  return {
    actorParticipantId: session.participantId,
    actorSessionHash: hashAccessToken(session.sessionToken),
    shareHash,
  };
}

function databaseError(error) {
  if (error.code === "P0001") return new ParticipantSessionRequiredError();
  if (error.code === "P0002") return new BillNotFoundError();
  if (error.code === "P0004") return new ExpenseValidationError(error.message);
  return new Error(`Database operation failed (${error.code ?? "unknown"}).`);
}

export async function createReceiptScan({ cookieValue, file, shareToken }) {
  const bill = await getBillByShareToken(shareToken);
  const participant = await getSessionParticipant(bill.id, cookieValue);
  if (!participant) throw new ParticipantSessionRequiredError();
  const image = await validateReceiptFile(file);
  const scanId = crypto.randomUUID();
  const storageKey = `${bill.id}/${scanId}.${image.extension}`;
  const supabase = getServerSupabase();
  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(storageKey, image.bytes, {
      contentType: image.mimeType,
      upsert: false,
    });
  if (uploadError) throw databaseError(uploadError);

  const safeFilename =
    file.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "receipt";
  const { error: insertError } = await supabase.from("receipt_scans").insert({
    bill_id: bill.id,
    currency: bill.currency,
    id: scanId,
    image_height: image.height,
    image_width: image.width,
    mime_type: image.mimeType,
    original_filename: safeFilename,
    storage_key: storageKey,
    uploaded_by_participant_id: participant.id,
  });
  if (insertError) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([storageKey]);
    throw databaseError(insertError);
  }
  return { scanId };
}

export async function processReceiptScan(scanId, actorParticipantId) {
  let data;
  try {
    const result = await getServerSupabase({
      signal: AbortSignal.timeout(5000),
    }).rpc("claim_receipt_extraction_v3", {
      target_scan_id: scanId,
      actor_participant_id: actorParticipantId ?? null,
    });
    if (result.error || !result.data) throw new Error("Claim unavailable");
    data = result.data;
  } catch {
    reportAppError(new Error("Receipt claim unavailable"), "rate_limit");
    return { claimed: false, unavailable: true };
  }
  const claimed = resultRow(data);
  if (!claimed?.claimed)
    return {
      claimed: false,
      ...(claimed?.rate_limited
        ? { rateLimited: true, retryAfterSeconds: claimed.retry_after_seconds }
        : {}),
    };

  try {
    return await withExtractionDeadline(async (signal) => {
      const supabase = getServerSupabase({ signal });
      const { data: storedImage, error: downloadError } = await supabase.storage
        .from(RECEIPT_BUCKET)
        .download(claimed.storage_key);
      if (downloadError) throw new ReceiptExtractionError("image_unavailable");
      const bytes = new Uint8Array(await storedImage.arrayBuffer());
      const raw = await extractReceiptImage({
        billCurrency: claimed.bill_currency,
        bytes,
        mimeType: claimed.mime_type,
        scanId,
        signal,
      });
      const draft = normalizeReceiptExtraction(raw, claimed.bill_currency);
      signal.throwIfAborted();
      const { data: stored, error: storeError } = await supabase.rpc(
        "store_receipt_extraction_v2",
        {
          expected_attempt_id: claimed.attempt_id,
          extracted_currency: draft.currency,
          extracted_discount_minor: draft.discountMinor,
          extracted_items: draft.items.map((item) => ({
            confidence_basis_points: item.confidenceBasisPoints,
            description: item.description,
            needs_review: item.needsReview,
            position: item.position,
            quantity: item.quantity,
            total_minor: item.totalMinor,
            unit_price_minor: item.unitPriceMinor,
          })),
          extracted_merchant_name: draft.merchantName,
          extracted_receipt_date: draft.receiptDate,
          extracted_subtotal_minor: draft.subtotalMinor,
          extracted_tax_minor: draft.taxMinor,
          extracted_tip_minor: draft.tipMinor,
          extracted_total_minor: draft.totalMinor,
          extraction_provider: draft.provider,
          extraction_provider_request_id: draft.providerRequestId,
          target_scan_id: scanId,
        },
      );
      if (storeError) throw databaseError(storeError);
      return { claimed: true, status: stored ? "needs_review" : "superseded" };
    });
  } catch (error) {
    const safeCode =
      error.name === "TimeoutError"
        ? "extraction_timed_out"
        : error instanceof ReceiptExtractionError
          ? error.code
          : "extraction_failed";
    reportAppError(error, "receipt_extract");
    const { data: failed, error: failureError } = await getServerSupabase({
      signal: AbortSignal.timeout(10_000),
    }).rpc("fail_receipt_extraction_v2", {
      target_scan_id: scanId,
      expected_attempt_id: claimed.attempt_id,
      failure_code: safeCode,
    });
    if (failureError) reportAppError(failureError, "receipt_failure_write");
    return { claimed: true, status: failed ? "failed" : "superseded" };
  }
}

export async function retryReceiptScan({
  cookieValue,
  receiptScanId,
  shareToken,
}) {
  const bill = await getBillByShareToken(shareToken);
  const participant = await getSessionParticipant(bill.id, cookieValue);
  if (!participant) throw new ParticipantSessionRequiredError();
  const { data, error } = await getServerSupabase()
    .from("receipt_scans")
    .select(
      "id, status, created_at, updated_at, processing_started_at, expires_at, next_retry_at",
    )
    .eq("id", receiptScanId)
    .eq("bill_id", bill.id)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!data) throw new ReceiptNotFoundError();
  if (data.next_retry_at && new Date(data.next_retry_at).getTime() > Date.now())
    throw new RateLimitError(
      Math.ceil((new Date(data.next_retry_at).getTime() - Date.now()) / 1000),
    );
  if (!receiptCanRetry(data)) throw new ExpenseValidationError();
  return { scanId: data.id, actorParticipantId: participant.id };
}

export async function getReceiptScan(billId, receiptScanId) {
  const supabase = getServerSupabase();
  const { data: scan, error } = await supabase
    .from("receipt_scans")
    .select("*")
    .eq("id", receiptScanId)
    .eq("bill_id", billId)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!receiptIsAvailable(scan)) throw new ReceiptNotFoundError();
  const { data: items, error: itemError } = await supabase
    .from("receipt_items")
    .select(
      "id, position, description, quantity, unit_price_minor, total_minor, confidence_basis_points, needs_review",
    )
    .eq("receipt_scan_id", receiptScanId)
    .order("position");
  if (itemError) throw databaseError(itemError);

  let imageUrl = null;
  const { data: exists, error: existsError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .exists(scan.storage_key);
  const bill = await requireActiveBillId(billId);
  const seconds = imageLinkLifetime(
    [bill.expires_at, scan.status === "confirmed" ? null : scan.expires_at],
    300,
  );
  if (!seconds || !receiptIsAvailable(scan)) throw new ReceiptNotFoundError();
  if (exists && !existsError) {
    const { data: signed } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .createSignedUrl(scan.storage_key, seconds);
    imageUrl = signed?.signedUrl ?? null;
  }
  return {
    ...scan,
    canRetry: receiptCanRetry(scan),
    retryAfterSeconds: scan.next_retry_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(scan.next_retry_at).getTime() - Date.now()) / 1000,
          ),
        )
      : 0,
    discount_minor:
      scan.discount_minor === null ? null : Number(scan.discount_minor),
    items: items.map((item) => ({
      ...item,
      total_minor: Number(item.total_minor),
      unit_price_minor:
        item.unit_price_minor === null ? null : Number(item.unit_price_minor),
    })),
    imageUrl,
    subtotal_minor:
      scan.subtotal_minor === null ? null : Number(scan.subtotal_minor),
    tax_minor: scan.tax_minor === null ? null : Number(scan.tax_minor),
    tip_minor: scan.tip_minor === null ? null : Number(scan.tip_minor),
    total_minor: scan.total_minor === null ? null : Number(scan.total_minor),
  };
}

export async function getRecentReceiptScans(billId) {
  await requireActiveBillId(billId);
  const { data, error } = await getServerSupabase()
    .from("receipt_scans")
    .select("id, status, merchant_name, original_filename, created_at")
    .eq("bill_id", billId)
    .neq("status", "expired")
    .or(`status.eq.confirmed,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw databaseError(error);
  return data;
}

function receiptParameters(input, access) {
  return {
    actor_participant_id: access.actorParticipantId,
    actor_session_hash: access.actorSessionHash,
    assignment_rows: input.assignmentRows.map((row) => ({
      amount_minor: row.amountMinor,
      client_key: row.clientKey,
      participant_id: row.participantId,
    })),
    chosen_adjustment_method: input.adjustmentMethod,
    expense_category: input.category,
    expense_date: input.expenseDate,
    expense_description: input.description,
    item_rows: input.itemRows.map((item) => ({
      client_key: item.clientKey,
      saved_item_id: item.savedItemId ?? null,
      confidence_basis_points: item.confidenceBasisPoints,
      description: item.description,
      needs_review: false,
      position: item.position,
      quantity: item.quantity ?? 1,
      unit_price_minor: item.unitPriceMinor ?? null,
      total_minor: item.totalMinor,
    })),
    paid_by_participant_id: input.paidByParticipantId,
    receipt_discount_minor: input.discountMinor,
    receipt_merchant_name: input.merchantName,
    receipt_subtotal_minor: input.subtotalMinor,
    receipt_tax_minor: input.taxMinor,
    receipt_tip_minor: input.tipMinor,
    receipt_total_minor: input.totalMinor,
    share_hash: access.shareHash,
    share_rows: input.finalShares.map((share) => ({
      amount_minor: share.amountMinor,
      participant_id: share.participantId,
    })),
    target_scan_id: input.receiptScanId,
  };
}

export async function confirmReceiptExpense(input) {
  const access = authenticatedCapability(input.shareToken, input.cookieValue);
  const { data, error } = await getServerSupabase().rpc(
    "confirm_receipt_expense",
    {
      ...receiptParameters(input, access),
      confirmation_key: input.confirmationKey,
    },
  );
  if (error) throw databaseError(error);
  const confirmed = resultRow(data);
  if (!confirmed?.expense_id)
    throw new Error("Receipt confirmation returned no expense.");
  return { expenseId: confirmed.expense_id };
}

export async function updateReceiptExpense(input) {
  const access = authenticatedCapability(input.shareToken, input.cookieValue);
  const { data, error } = await getServerSupabase().rpc(
    "update_receipt_expense",
    {
      ...receiptParameters(input, access),
      target_expense_id: input.expenseId,
      expected_updated_at: input.expectedUpdatedAt,
    },
  );
  if (error?.code === "P0005") throw new ReceiptConflictError();
  if (["PGRST202", "42883"].includes(error?.code))
    throw new ReceiptEditSetupError();
  if (error) throw databaseError(error);
  const updated = resultRow(data);
  if (!updated?.expense_id)
    throw new Error("Receipt update returned no expense.");
  return { expenseId: updated.expense_id, updatedAt: updated.updated_at };
}

export async function getReceiptForEditing(billId, receiptScanId, attempt = 0) {
  const scan = await getReceiptScan(billId, receiptScanId);
  if (scan.status !== "confirmed") return scan;
  const supabase = getServerSupabase();
  const { data: expense, error } = await supabase
    .from("expenses")
    .select(
      "id, description, amount_minor, paid_by_participant_id, category, expense_date, notes, updated_at",
    )
    .eq("bill_id", billId)
    .eq("receipt_scan_id", receiptScanId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!expense) return { ...scan, expense: null };
  const [assignmentsResult, sharesResult, peopleResult] = await Promise.all([
    scan.items.length
      ? supabase
          .from("receipt_item_assignments")
          .select("receipt_item_id, participant_id, amount_minor")
          .in(
            "receipt_item_id",
            scan.items.map((item) => item.id),
          )
      : { data: [] },
    supabase
      .from("expense_shares")
      .select("participant_id, amount_minor")
      .eq("expense_id", expense.id),
    supabase
      .from("bill_participants")
      .select("id, display_name, deactivated_at, created_at")
      .eq("bill_id", billId)
      .order("created_at")
      .order("id"),
  ]);
  for (const result of [assignmentsResult, sharesResult, peopleResult])
    if (result.error) throw databaseError(result.error);
  // Multiple REST reads must describe one revision. Retry if a save overlapped
  // loading, rather than pairing old items with a newer expense version.
  const [scanVersion, expenseVersion] = await Promise.all([
    supabase
      .from("receipt_scans")
      .select("updated_at")
      .eq("id", receiptScanId)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("updated_at, deleted_at")
      .eq("id", expense.id)
      .maybeSingle(),
  ]);
  for (const result of [scanVersion, expenseVersion])
    if (result.error) throw databaseError(result.error);
  if (
    scanVersion.data?.updated_at !== scan.updated_at ||
    expenseVersion.data?.updated_at !== expense.updated_at ||
    expenseVersion.data?.deleted_at
  ) {
    if (attempt < 2)
      return getReceiptForEditing(billId, receiptScanId, attempt + 1);
    throw new ReceiptConflictError();
  }
  const historical = new Set([
    expense.paid_by_participant_id,
    ...assignmentsResult.data.map((row) => row.participant_id),
    ...sharesResult.data.map((row) => row.participant_id),
  ]);
  return {
    ...scan,
    items: scan.items.map((item) => ({
      ...item,
      assignments: assignmentsResult.data
        .filter((row) => row.receipt_item_id === item.id)
        .map((row) => ({
          participantId: row.participant_id,
          amountMinor: Number(row.amount_minor),
        })),
    })),
    expense: {
      ...expense,
      amount_minor: Number(expense.amount_minor),
      shares: sharesResult.data.map((row) => ({
        participantId: row.participant_id,
        amountMinor: Number(row.amount_minor),
      })),
    },
    reviewParticipants: peopleResult.data.filter(
      (person) => !person.deactivated_at || historical.has(person.id),
    ),
  };
}
