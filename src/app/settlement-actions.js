"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  CREATOR_COOKIE_NAME,
  PARTICIPANT_COOKIE_NAME,
} from "@/lib/participant-session";
import { PaymentQrError } from "@/lib/payment-qr";
import { parseSettlementForm } from "@/lib/settlement-input";
import {
  BillNotFoundError,
  getBillByShareToken,
  ParticipantSessionRequiredError,
} from "@/server/bills";
import {
  CreatorAccessRequiredError,
  openOwnerQr,
  saveOwnerQr,
} from "@/server/payment-methods";
import {
  PhaseThreeSetupError,
  saveSettlement,
  SettlementValidationError,
} from "@/server/settlements";

function failure(error) {
  if (
    error instanceof PaymentQrError ||
    error instanceof SettlementValidationError
  )
    return { errors: { form: error.message } };
  if (error instanceof CreatorAccessRequiredError)
    return {
      errors: {
        form: "Use the bill creator’s device and recovery key to change the QR.",
      },
    };
  if (error instanceof ParticipantSessionRequiredError)
    return { errors: { form: "Join this bill before recording payments." } };
  if (error instanceof BillNotFoundError)
    return { errors: { form: "This bill is no longer available." } };
  if (error instanceof PhaseThreeSetupError)
    return {
      errors: { form: "Payments are not configured on this server yet." },
    };
  console.error("Unable to change bill payments:", error.message);
  return { errors: { form: "We couldn’t complete that request. Try again." } };
}

async function changePayment(form, operation) {
  const shareToken = String(form.get("shareToken") ?? "");
  try {
    const bill = await getBillByShareToken(shareToken);
    const parsed = parseSettlementForm(form, bill.currency, {
      editing: operation === "update",
      removing: operation === "remove",
    });
    if (!parsed.data) return { errors: parsed.errors };
    const store = await cookies();
    await saveSettlement({
      ...parsed.data,
      operation,
      cookieValue: store.get(PARTICIPANT_COOKIE_NAME)?.value,
    });
    revalidatePath(`/b/${shareToken}`);
    return { success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createSettlementAction(_state, form) {
  return changePayment(form, "create");
}
export async function updateSettlementAction(_state, form) {
  return changePayment(form, "update");
}
export async function removeSettlementAction(_state, form) {
  return changePayment(form, "remove");
}

async function ownerInput(form) {
  const store = await cookies();
  return {
    shareToken: String(form.get("shareToken") ?? ""),
    recoveryToken: store.get(CREATOR_COOKIE_NAME)?.value,
    cookieValue: store.get(PARTICIPANT_COOKIE_NAME)?.value,
  };
}

export async function saveOwnerQrAction(_state, form) {
  try {
    if (form.get("confirmed") !== "yes")
      throw new PaymentQrError(
        "Confirm the decoded recipient and currency first.",
      );
    const input = await ownerInput(form);
    await saveOwnerQr({
      ...input,
      operation: "save",
      image: form.get("previewImage"),
      token: form.get("previewToken"),
      currencyMode: form.get("currencyMode") ?? "single",
      expectedMethodId: form.get("expectedMethodId"),
      expectedUpdatedAt: form.get("expectedUpdatedAt"),
    });
    revalidatePath(`/b/${input.shareToken}`);
    return { success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function removeOwnerQrAction(_state, form) {
  try {
    const input = await ownerInput(form);
    await saveOwnerQr({
      ...input,
      operation: "remove",
      expectedMethodId: form.get("expectedMethodId"),
      expectedUpdatedAt: form.get("expectedUpdatedAt"),
    });
    revalidatePath(`/b/${input.shareToken}`);
    return { success: true };
  } catch (error) {
    return failure(error);
  }
}

export async function openOwnerQrAction(_state, form) {
  try {
    const input = z
      .object({
        shareToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        fromParticipantId: z.uuid(),
        toParticipantId: z.uuid(),
        amountMinor: z.coerce
          .number()
          .int()
          .positive()
          .max(Number.MAX_SAFE_INTEGER),
      })
      .parse(Object.fromEntries(form));
    return { qr: await openOwnerQr(input) };
  } catch (error) {
    return failure(error);
  }
}
