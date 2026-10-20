import { guardOperation } from "@/server/rate-limits";
import { cleanupImageUploadBatch } from "@/lib/cleanup-image-uploads.mjs";
import { reportAppError } from "@/server/monitoring";
import { randomUUID } from "node:crypto";
import { hashAccessToken } from "@/lib/access-tokens";
import {
  IMAGE_UPLOAD_BUCKET,
  ImageUploadError,
  MAX_IMAGE_BYTES,
  parseImageUploadMetadata,
  validUploadId,
} from "@/lib/image-upload";
import { verifyParticipantSession } from "@/lib/participant-session";
import { PaymentQrError } from "@/lib/payment-qr";
import { ReceiptFileError, validateReceiptFile } from "@/lib/receipt-file";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  getBillByShareToken,
  getSessionParticipant,
  ParticipantSessionRequiredError,
} from "@/server/bills";
import { createOwnerQrPreview, requireCreator } from "@/server/payment-methods";
import { phaseThreeError } from "@/server/settlements";

function databaseError(error) {
  if (error.code === "P0001") return new ParticipantSessionRequiredError();
  if (["P0004", "P0005"].includes(error.code))
    return new ImageUploadError(error.message, {
      resetUpload: error.code === "P0004",
    });
  return phaseThreeError(error);
}

function uploadCapability({ cookieValue, recoveryToken }) {
  const session = verifyParticipantSession(cookieValue, {
    secrets: [
      process.env.PARTICIPANT_SESSION_SECRET,
      process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET,
    ].filter(Boolean),
  });
  if (!session) throw new ParticipantSessionRequiredError();
  let recoveryHash = null;
  if (recoveryToken) {
    try {
      recoveryHash = hashAccessToken(recoveryToken);
    } catch {
      /* QR authorization will reject the absent capability. */
    }
  }
  return {
    actor_participant_id: session.participantId,
    actor_session_hash: hashAccessToken(session.sessionToken),
    recovery_hash: recoveryHash,
  };
}

// Tokens last two hours. Keep reservations for at least 24 hours so a late
// upload using an otherwise abandoned token can still be found and removed.
export async function cleanupImageUploads() {
  const db = getServerSupabase({ signal: AbortSignal.timeout(5000) });
  try {
    return await cleanupImageUploadBatch(db, Date.now(), IMAGE_UPLOAD_BUCKET);
  } catch (error) {
    // Cleanup cannot make an otherwise valid upload fail; retain rows to retry.
    reportAppError(error, "upload_cleanup");
  }
}

export async function prepareImageUpload(input) {
  const metadata = parseImageUploadMetadata(input);
  let bill;
  let participant;
  if (metadata.purpose === "owner_qr") {
    const creator = await requireCreator(input);
    bill = creator.bill;
    participant = creator.actor;
  } else {
    bill = await getBillByShareToken(metadata.shareToken);
    participant = await getSessionParticipant(bill.id, input.cookieValue);
    if (!participant) throw new ParticipantSessionRequiredError();
  }
  await guardOperation("upload", {
    billId: bill.id,
    participantId: participant.id,
  });
  await cleanupImageUploads();
  const db = getServerSupabase();
  const id = randomUUID();
  const path = `${bill.id}/${id}`;
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const { error } = await db.from("image_upload_reservations").insert({
    id,
    bill_id: bill.id,
    participant_id: participant.id,
    share_hash: hashAccessToken(metadata.shareToken),
    purpose: metadata.purpose,
    filename: metadata.filename,
    size_bytes: metadata.size,
    mime_type: metadata.mimeType,
    storage_key: path,
    expires_at: expiresAt,
  });
  if (error) throw databaseError(error);
  const { data: signed, error: signError } = await db.storage
    .from(IMAGE_UPLOAD_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (signError)
    throw new ImageUploadError("We couldn’t prepare the upload. Try again.");
  return {
    uploadId: id,
    bucket: IMAGE_UPLOAD_BUCKET,
    path,
    token: signed.token,
    mimeType: metadata.mimeType,
    expiresAt,
  };
}

function sameMimeType(first, second) {
  return (
    first === second ||
    (["image/heic", "image/heif"].includes(first) &&
      ["image/heic", "image/heif"].includes(second))
  );
}

export async function completeImageUpload({ uploadId, ...access }) {
  validUploadId(uploadId);
  const capability = uploadCapability(access);
  const parameters = { ...capability, target_upload_id: uploadId };
  const db = getServerSupabase({ signal: AbortSignal.timeout(105_000) });
  const { data: authorized, error: authError } = await db.rpc(
    "get_image_upload",
    parameters,
  );
  if (authError) throw databaseError(authError);
  await guardOperation("complete", {
    billId: authorized.bill_id,
    participantId: authorized.participant_id,
  });
  const { data: upload, error } = await db.rpc(
    "claim_image_upload",
    parameters,
  );
  if (error) throw databaseError(error);
  await cleanupImageUploads();
  if (upload.purpose === "receipt" && upload.status === "complete") {
    return {
      purpose: "receipt",
      receiptScanId: upload.receipt_scan_id,
      shouldProcess: false,
    };
  }
  try {
    const { data: blob, error: downloadError } = await db.storage
      .from(IMAGE_UPLOAD_BUCKET)
      .download(upload.storage_key);
    if (downloadError)
      throw new ImageUploadError(
        "The image hasn’t finished uploading. Retry the upload.",
        { resetUpload: String(downloadError.statusCode) === "404" },
      );
    if (
      !blob.size ||
      blob.size > MAX_IMAGE_BYTES ||
      blob.size !== upload.size_bytes
    ) {
      throw new ImageUploadError(
        "The uploaded image size changed. Choose the image again.",
        { resetUpload: true },
      );
    }
    const file = new File([blob], upload.filename, { type: upload.mime_type });
    const validated = await validateReceiptFile(file);
    if (!sameMimeType(validated.mimeType, upload.mime_type))
      throw new ImageUploadError(
        "The image content doesn’t match its file type. Choose the image again.",
        { resetUpload: true },
      );
    if (upload.purpose === "owner_qr") {
      const preview = await createOwnerQrPreview({
        file,
        bill: { id: upload.bill_id, currency: upload.bill_currency },
        actor: { id: upload.participant_id },
      });
      const { error: finishError } = await db.rpc("finish_qr_upload", {
        ...parameters,
        target_lease_id: upload.lease_id,
      });
      if (finishError) throw databaseError(finishError);
      return { purpose: "owner_qr", preview };
    }
    const { error: copyError } = await db.storage
      .from("receipt-images")
      .upload(upload.storage_key, validated.bytes, {
        contentType: upload.mime_type,
        upsert: false,
      });
    // A previous invocation may have stored the immutable image before its
    // response was lost. The reservation's lease still guards the scan write.
    if (copyError && String(copyError.statusCode) !== "409")
      throw new Error("Unable to store the validated receipt image.");
    const { data: finished, error: finishError } = await db.rpc(
      "finish_receipt_upload",
      {
        target_upload_id: uploadId,
        actor_participant_id: capability.actor_participant_id,
        actor_session_hash: capability.actor_session_hash,
        target_lease_id: upload.lease_id,
        validated_mime_type: upload.mime_type,
        validated_width: validated.width,
        validated_height: validated.height,
      },
    );
    if (finishError) throw databaseError(finishError);
    await db.storage.from(IMAGE_UPLOAD_BUCKET).remove([upload.storage_key]);
    return {
      purpose: "receipt",
      receiptScanId: finished.scan_id,
      shouldProcess: finished.should_process,
      actorParticipantId: upload.participant_id,
    };
  } catch (error) {
    if (upload.acquired) {
      const rejected =
        error instanceof ReceiptFileError ||
        error instanceof PaymentQrError ||
        (error instanceof ImageUploadError && error.resetUpload);
      const { data: changed } = await db
        .from("image_upload_reservations")
        .update({
          status: rejected ? "rejected" : "pending",
          lease_id: null,
          lease_started_at: null,
        })
        .eq("id", uploadId)
        .eq("lease_id", upload.lease_id)
        .select("id");
      if (rejected && changed?.length)
        await db.storage.from(IMAGE_UPLOAD_BUCKET).remove([upload.storage_key]);
      if (rejected)
        throw new ImageUploadError(error.message, { resetUpload: true });
    }
    if (error instanceof ReceiptFileError || error instanceof PaymentQrError) {
      throw new ImageUploadError(error.message, { resetUpload: true });
    }
    throw error;
  }
}
