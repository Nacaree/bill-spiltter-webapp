"use server";

import { protectedAction } from "@/server/protected-action";
import { rateLimitFailure } from "@/lib/rate-limit-error";
import { reportAppError } from "@/server/monitoring";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";
import { ImageUploadError } from "@/lib/image-upload";
import {
  CREATOR_COOKIE_NAME,
  PARTICIPANT_COOKIE_NAME,
} from "@/lib/participant-session";
import {
  ParticipantSessionRequiredError,
  BillNotFoundError,
} from "@/server/bills";
import {
  prepareImageUpload,
  completeImageUpload,
} from "@/server/image-uploads";
import { CreatorAccessRequiredError } from "@/server/payment-methods";
import { processReceiptScan } from "@/server/receipts";
import { PhaseThreeSetupError } from "@/server/settlements";

async function access() {
  const store = await cookies();
  return {
    cookieValue: store.get(PARTICIPANT_COOKIE_NAME)?.value,
    recoveryToken: store.get(CREATOR_COOKIE_NAME)?.value,
  };
}
function failure(error) {
  const limited = rateLimitFailure(error, true);
  if (limited) return limited;
  if (error instanceof ImageUploadError)
    return { error: error.message, resetUpload: error.resetUpload };
  if (error instanceof CreatorAccessRequiredError)
    return { error: "Use the bill creator’s device to upload the owner QR." };
  if (error instanceof ParticipantSessionRequiredError)
    return {
      error:
        "Join this bill on this device before uploading or completing an image.",
    };
  if (error instanceof BillNotFoundError)
    return { error: "This bill is no longer available." };
  if (error instanceof PhaseThreeSetupError)
    return {
      error: "Direct image uploads are not configured on this server yet.",
    };
  reportAppError(error, "image_upload");
  return { error: "We couldn’t process this image. Try again." };
}
export async function prepareImageUploadAction(metadata) {
  return protectedAction("prepareImageUploadAction", async () => {
    try {
      return {
        upload: await prepareImageUpload({ ...metadata, ...(await access()) }),
      };
    } catch (error) {
      return failure(error);
    }
  });
}
export async function completeImageUploadAction(uploadId) {
  return protectedAction("completeImageUploadAction", async () => {
    try {
      const result = await completeImageUpload({
        uploadId,
        ...(await access()),
      });
      if (result.purpose === "receipt" && result.shouldProcess)
        after(() =>
          processReceiptScan(result.receiptScanId, result.actorParticipantId),
        );
      refresh();
      return {
        result: {
          purpose: result.purpose,
          receiptScanId: result.receiptScanId,
          preview: result.preview,
        },
      };
    } catch (error) {
      return failure(error);
    }
  });
}
