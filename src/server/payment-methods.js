import { randomUUID } from "node:crypto";
import { hashAccessToken } from "@/lib/access-tokens";
import {
  confirmedQrCurrencies,
  inspectPaymentQr,
  PaymentQrError,
  paymentQrEligible,
  signQrPreview,
  verifyQrPreview,
} from "@/lib/payment-qr";
import { getServerSupabase } from "@/lib/supabase-server";
import { getBillByShareToken, getSessionParticipant } from "@/server/bills";
import {
  getBillLedger,
  phaseThreeError,
  settlementAccess,
  SettlementValidationError,
} from "@/server/settlements";

const BUCKET = "payment-qrs";
export class CreatorAccessRequiredError extends Error {}

export async function getPaymentMethod(billId) {
  const { data, error } = await getServerSupabase()
    .from("bill_payment_methods")
    .select(
      "id, owner_participant_id, recipient_label, supported_currencies, fixed_amount_minor, expires_at, updated_at",
    )
    .eq("bill_id", billId)
    .maybeSingle();
  if (error) throw phaseThreeError(error);
  return data
    ? {
        ...data,
        fixed_amount_minor:
          data.fixed_amount_minor === null
            ? null
            : Number(data.fixed_amount_minor),
      }
    : null;
}

export async function requireCreator({
  shareToken,
  cookieValue,
  recoveryToken,
}) {
  const bill = await getBillByShareToken(shareToken);
  const actor = await getSessionParticipant(bill.id, cookieValue);
  if (!actor?.is_creator) throw new CreatorAccessRequiredError();
  let recoveryHash;
  try {
    recoveryHash = hashAccessToken(recoveryToken);
  } catch {
    throw new CreatorAccessRequiredError();
  }
  const { data, error } = await getServerSupabase()
    .from("bills")
    .select("id")
    .eq("id", bill.id)
    .eq("creator_key_hash", recoveryHash)
    .maybeSingle();
  if (error) throw phaseThreeError(error);
  if (!data) throw new CreatorAccessRequiredError();
  return { bill, actor, recoveryHash };
}

export async function previewOwnerQr(input) {
  const { bill, actor } = await requireCreator(input);
  return createOwnerQrPreview({ bill, actor, file: input.file });
}

export async function createOwnerQrPreview({ bill, actor, file }) {
  const details = await inspectPaymentQr(file);
  if (details.currency !== bill.currency && details.fixedAmountMinor !== null)
    throw new PaymentQrError(
      `This QR uses ${details.currency}. Upload a ${bill.currency} QR for this bill.`,
    );
  const { image, ...metadata } = details;
  return {
    ...metadata,
    image: `data:image/png;base64,${image.toString("base64")}`,
    token: signQrPreview(metadata, {
      billId: bill.id,
      ownerId: actor.id,
      image,
      secret: process.env.PARTICIPANT_SESSION_SECRET,
    }),
  };
}

export async function saveOwnerQr(input) {
  const { bill, actor, recoveryHash } = await requireCreator(input);
  const supabase = getServerSupabase();
  const removing = input.operation === "remove";
  let key = null;
  let details;
  let supportedCurrencies;
  if (!removing) {
    if (
      typeof input.image !== "string" ||
      input.image.length > 2_800_000 ||
      !input.image.startsWith("data:image/png;base64,")
    )
      throw new PaymentQrError("Inspect your QR image first.");
    const bytes = Buffer.from(
      input.image.slice("data:image/png;base64,".length),
      "base64",
    );
    details = verifyQrPreview(input.token, {
      billId: bill.id,
      ownerId: actor.id,
      image: bytes,
      secret: process.env.PARTICIPANT_SESSION_SECRET,
    });
    supportedCurrencies = confirmedQrCurrencies(details, input.currencyMode);
    if (!supportedCurrencies.includes(bill.currency)) {
      throw new PaymentQrError(
        `This bill uses ${bill.currency}. Confirm KHR + USD only if your banking app offers both, or upload a ${bill.currency} QR.`,
      );
    }
    key = `${bill.id}/${randomUUID()}.png`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, bytes, { contentType: "image/png", upsert: false });
    if (error) throw new Error("Unable to store the QR image.");
  }
  const { data: oldKey, error } = await supabase.rpc(
    removing ? "save_bill_payment_method" : "save_bill_payment_method_v2",
    {
      ...settlementAccess(input.shareToken, input.cookieValue),
      recovery_hash: recoveryHash,
      operation: removing ? "remove" : "save",
      expected_method_id: input.expectedMethodId || null,
      expected_updated_at: input.expectedUpdatedAt || null,
      storage_key: key,
      recipient: details?.recipientLabel,
      qr_currency: details?.currency,
      payload_hash: details?.payloadHash,
      fixed_amount: details?.fixedAmountMinor,
      qr_expires_at: details?.expiresAt,
      ...(!removing ? { qr_currencies: supportedCurrencies } : {}),
    },
  );
  if (error) {
    if (key) await supabase.storage.from(BUCKET).remove([key]);
    if (error.code === "P0003") throw new CreatorAccessRequiredError();
    throw phaseThreeError(error);
  }
  if (oldKey) {
    const { error: cleanupError } = await supabase.storage
      .from(BUCKET)
      .remove([oldKey]);
    if (cleanupError) reportAppError(cleanupError, "qr_cleanup");
  }
}

export async function openOwnerQr({
  shareToken,
  fromParticipantId,
  toParticipantId,
  amountMinor,
}) {
  const bill = await getBillByShareToken(shareToken);
  const [ledger, method] = await Promise.all([
    getBillLedger(shareToken),
    getPaymentMethod(bill.id),
  ]);
  const transfer = ledger.transfers.find(
    (t) =>
      t.fromParticipantId === fromParticipantId &&
      t.toParticipantId === toParticipantId &&
      t.amountMinor === amountMinor,
  );
  if (
    !transfer ||
    !paymentQrEligible(method, { ...transfer, currency: bill.currency })
  ) {
    throw new SettlementValidationError(
      "This transfer or QR changed. Refresh the bill.",
    );
  }
  // Obtain the private object key only after checking the current transfer.
  const { data, error } = await getServerSupabase()
    .from("bill_payment_methods")
    .select("qr_storage_key")
    .eq("id", method.id)
    .eq("updated_at", method.updated_at)
    .maybeSingle();
  if (error) throw phaseThreeError(error);
  if (!data)
    throw new SettlementValidationError("The QR changed. Refresh the bill.");
  const seconds = Math.min(
    60,
    method.expires_at
      ? Math.floor((new Date(method.expires_at).getTime() - Date.now()) / 1000)
      : 60,
  );
  if (seconds < 1)
    throw new SettlementValidationError(
      "The QR expired. Ask the owner to replace it.",
    );
  const [view, download] = await Promise.all([
    getServerSupabase()
      .storage.from(BUCKET)
      .createSignedUrl(data.qr_storage_key, seconds),
    getServerSupabase()
      .storage.from(BUCKET)
      .createSignedUrl(data.qr_storage_key, seconds, {
        download: "aba-qr.png",
      }),
  ]);
  if (view.error || download.error)
    throw new Error("Unable to open the QR image.");
  return {
    imageUrl: view.data.signedUrl,
    downloadUrl: download.data.signedUrl,
    recipientLabel: method.recipient_label,
    expiresAt: Date.now() + seconds * 1000,
    amountMinor,
    currency: bill.currency,
  };
}
import { reportAppError } from "@/server/monitoring";
