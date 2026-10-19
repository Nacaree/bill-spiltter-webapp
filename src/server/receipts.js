import { hashAccessToken } from "@/lib/access-tokens";
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
  ParticipantSessionRequiredError,
} from "@/server/bills";
import { ExpenseValidationError } from "@/server/expenses";

const RECEIPT_BUCKET = "receipt-images";

export class ReceiptNotFoundError extends Error {}

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

export async function processReceiptScan(scanId) {
  const { data, error } = await getServerSupabase({
    signal: AbortSignal.timeout(10_000),
  }).rpc("claim_receipt_extraction_v2", {
    target_scan_id: scanId,
  });
  if (error) throw databaseError(error);
  const claimed = resultRow(data);
  if (!claimed) return { claimed: false };

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
    const { data: failed, error: failureError } = await getServerSupabase({
      signal: AbortSignal.timeout(10_000),
    }).rpc("fail_receipt_extraction_v2", {
      target_scan_id: scanId,
      expected_attempt_id: claimed.attempt_id,
      failure_code: safeCode,
    });
    if (failureError)
      console.error(
        "Unable to mark failed receipt extraction; stale retry remains available.",
      );
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
      "id, status, created_at, updated_at, processing_started_at, expires_at",
    )
    .eq("id", receiptScanId)
    .eq("bill_id", bill.id)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!data) throw new ReceiptNotFoundError();
  if (!receiptCanRetry(data)) throw new ExpenseValidationError();
  return { scanId: data.id };
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
  if (!scan) throw new ReceiptNotFoundError();
  const { data: items, error: itemError } = await supabase
    .from("receipt_items")
    .select(
      "id, position, description, quantity, unit_price_minor, total_minor, confidence_basis_points, needs_review",
    )
    .eq("receipt_scan_id", receiptScanId)
    .order("position");
  if (itemError) throw databaseError(itemError);

  let imageUrl = null;
  if (scan.status !== "confirmed" && scan.status !== "expired") {
    const { data: signed } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .createSignedUrl(scan.storage_key, 300);
    imageUrl = signed?.signedUrl ?? null;
  }
  return {
    ...scan,
    canRetry: receiptCanRetry(scan),
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
  const { data, error } = await getServerSupabase()
    .from("receipt_scans")
    .select("id, status, merchant_name, original_filename, created_at")
    .eq("bill_id", billId)
    .neq("status", "expired")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw databaseError(error);
  return data;
}

export async function confirmReceiptExpense(input) {
  const access = authenticatedCapability(input.shareToken, input.cookieValue);
  const { data, error } = await getServerSupabase().rpc(
    "confirm_receipt_expense",
    {
      actor_participant_id: access.actorParticipantId,
      actor_session_hash: access.actorSessionHash,
      assignment_rows: input.assignmentRows.map((row) => ({
        amount_minor: row.amountMinor,
        client_key: row.clientKey,
        participant_id: row.participantId,
      })),
      chosen_adjustment_method: input.adjustmentMethod,
      confirmation_key: input.confirmationKey,
      expense_category: input.category,
      expense_date: input.expenseDate,
      expense_description: input.description,
      item_rows: input.itemRows.map((item) => ({
        client_key: item.clientKey,
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
    },
  );
  if (error) throw databaseError(error);
  const confirmed = resultRow(data);
  if (!confirmed?.expense_id)
    throw new Error("Receipt confirmation returned no expense.");
  return { expenseId: confirmed.expense_id };
}

export async function deleteReceiptImage(receiptScanId) {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from("receipt_scans")
    .select("storage_key, status")
    .eq("id", receiptScanId)
    .maybeSingle();
  if (data?.status === "confirmed") {
    await supabase.storage.from(RECEIPT_BUCKET).remove([data.storage_key]);
  }
}
