"use server";

import { monitorAction, reportAppError } from "@/server/monitoring";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";
import {
  parseAddParticipant,
  parseClaimParticipant,
  parseCreateBill,
  parseJoinBill,
} from "@/lib/bill-input";
import { parseExpenseForm, parseRemoveExpense } from "@/lib/expense-input";
import { ReceiptFileError } from "@/lib/receipt-file";
import {
  parseReceiptConfirmation,
  parseReceiptIdentity,
} from "@/lib/receipt-input";
import {
  CREATOR_COOKIE_NAME,
  PARTICIPANT_COOKIE_NAME,
  participantCookieOptions,
} from "@/lib/participant-session";
import {
  addParticipant,
  BillNotFoundError,
  claimParticipant,
  createBillWithCreator,
  getBillByShareToken,
  joinBill,
  ParticipantNameTakenError,
  ParticipantSessionRequiredError,
  ParticipantUnavailableError,
} from "@/server/bills";
import {
  createExpense,
  ExpenseValidationError,
  removeExpense,
  updateExpense,
} from "@/server/expenses";
import {
  confirmReceiptExpense,
  deleteReceiptImage,
  processReceiptScan,
  ReceiptNotFoundError,
  retryReceiptScan,
} from "@/server/receipts";

export async function createBillAction(_previousState, formData) {
  return monitorAction("createBillAction", async () => {
    const parsed = parseCreateBill(formData);
    if (!parsed.data) return { errors: parsed.errors };

    try {
      const created = await createBillWithCreator(parsed.data);
      const cookieStore = await cookies();
      cookieStore.set(
        PARTICIPANT_COOKIE_NAME,
        created.sessionValue,
        participantCookieOptions({ path: `/b/${created.shareToken}` }),
      );
      cookieStore.set(
        CREATOR_COOKIE_NAME,
        created.recoveryToken,
        participantCookieOptions({ path: `/b/${created.shareToken}` }),
      );
      return {
        shareToken: created.shareToken,
        success: true,
      };
    } catch (error) {
      reportAppError(error, "bill_create");
      return {
        errors: {
          form: "We couldn't create the bill. Check the server configuration and try again.",
        },
      };
    }
  });
}

export async function joinBillAction(_previousState, formData) {
  return monitorAction("joinBillAction", async () => {
    const parsed = parseJoinBill(formData);
    if (!parsed.data) return { errors: parsed.errors };

    try {
      const joined = await joinBill(parsed.data);
      const cookieStore = await cookies();
      cookieStore.set(
        PARTICIPANT_COOKIE_NAME,
        joined.sessionValue,
        participantCookieOptions({ path: `/b/${parsed.data.shareToken}` }),
      );
      return { success: true };
    } catch (error) {
      if (error instanceof ParticipantNameTakenError) {
        return {
          errors: {
            participantName: "That name is already being used in this bill.",
          },
        };
      }
      if (error instanceof BillNotFoundError) {
        return { errors: { form: "This bill is no longer available." } };
      }
      reportAppError(error, "bill_join");
      return { errors: { form: "We couldn't add you. Please try again." } };
    }
  });
}

export async function claimParticipantAction(_previousState, formData) {
  return monitorAction("claimParticipantAction", async () => {
    const parsed = parseClaimParticipant(formData);
    if (!parsed.data) return { errors: parsed.errors };

    try {
      const claimed = await claimParticipant(parsed.data);
      const cookieStore = await cookies();
      cookieStore.set(
        PARTICIPANT_COOKIE_NAME,
        claimed.sessionValue,
        participantCookieOptions({ path: `/b/${parsed.data.shareToken}` }),
      );
      return { success: true };
    } catch (error) {
      if (error instanceof ParticipantUnavailableError) {
        return {
          errors: {
            participantId:
              "That person was already claimed. Choose another name.",
          },
        };
      }
      if (error instanceof BillNotFoundError) {
        return { errors: { form: "This bill is no longer available." } };
      }
      reportAppError(error, "participant_claim");
      return { errors: { form: "We couldn't join you. Please try again." } };
    }
  });
}

export async function addParticipantAction(_previousState, formData) {
  return monitorAction("addParticipantAction", async () => {
    const parsed = parseAddParticipant(formData);
    if (!parsed.data) return { errors: parsed.errors };

    try {
      const cookieStore = await cookies();
      await addParticipant({
        ...parsed.data,
        cookieValue: cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value,
      });
      return { success: true };
    } catch (error) {
      if (error instanceof ParticipantNameTakenError) {
        return {
          errors: {
            participantName: "That name is already being used in this bill.",
          },
        };
      }
      if (error instanceof ParticipantSessionRequiredError) {
        return {
          errors: {
            form: "Join this bill on this device before adding someone.",
          },
        };
      }
      if (error instanceof BillNotFoundError) {
        return { errors: { form: "This bill is no longer available." } };
      }
      reportAppError(error, "participant_add");
      return { errors: { form: "We couldn't add that person. Try again." } };
    }
  });
}

function expenseErrorState(error) {
  if (error instanceof ParticipantSessionRequiredError) {
    return { errors: { form: "Join this bill before changing expenses." } };
  }
  if (error instanceof BillNotFoundError) {
    return { errors: { form: "This bill is no longer available." } };
  }
  if (error instanceof ExpenseValidationError) {
    return {
      errors: {
        form: "The expense could not be saved. Refresh and check its participants.",
      },
    };
  }
  reportAppError(error, "expense_change");
  return { errors: { form: "We couldn't save that expense. Try again." } };
}

export async function createExpenseAction(_previousState, formData) {
  return monitorAction("createExpenseAction", async () => {
    const shareToken = String(formData.get("shareToken") ?? "");
    try {
      const bill = await getBillByShareToken(shareToken);
      const parsed = parseExpenseForm(formData, bill.currency);
      if (!parsed.data) return { errors: parsed.errors };
      const cookieStore = await cookies();
      await createExpense({
        ...parsed.data,
        cookieValue: cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value,
      });
      revalidatePath(`/b/${shareToken}`);
      return { success: true };
    } catch (error) {
      return expenseErrorState(error);
    }
  });
}

export async function updateExpenseAction(_previousState, formData) {
  return monitorAction("updateExpenseAction", async () => {
    const shareToken = String(formData.get("shareToken") ?? "");
    try {
      const bill = await getBillByShareToken(shareToken);
      const parsed = parseExpenseForm(formData, bill.currency, {
        editing: true,
      });
      if (!parsed.data) return { errors: parsed.errors };
      const cookieStore = await cookies();
      await updateExpense({
        ...parsed.data,
        cookieValue: cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value,
      });
      revalidatePath(`/b/${shareToken}`);
      return { success: true };
    } catch (error) {
      return expenseErrorState(error);
    }
  });
}

export async function removeExpenseAction(_previousState, formData) {
  return monitorAction("removeExpenseAction", async () => {
    const parsed = parseRemoveExpense(formData);
    if (!parsed.data) return { errors: parsed.errors };
    try {
      const cookieStore = await cookies();
      await removeExpense({
        ...parsed.data,
        cookieValue: cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value,
      });
      revalidatePath(`/b/${parsed.data.shareToken}`);
      return { success: true };
    } catch (error) {
      return expenseErrorState(error);
    }
  });
}

function receiptErrorState(error) {
  if (error instanceof ReceiptFileError) {
    return { errors: { file: error.message } };
  }
  if (error instanceof ParticipantSessionRequiredError) {
    return { errors: { form: "Join this bill before uploading a receipt." } };
  }
  if (
    error instanceof BillNotFoundError ||
    error instanceof ReceiptNotFoundError
  ) {
    return { errors: { form: "This receipt is no longer available." } };
  }
  if (error instanceof ExpenseValidationError) {
    return {
      errors: { form: "Review the receipt allocations and try again." },
    };
  }
  reportAppError(error, "receipt_change");
  return { errors: { form: "We couldn’t process that receipt. Try again." } };
}

export async function retryReceiptAction(_previousState, formData) {
  return monitorAction("retryReceiptAction", async () => {
    const parsed = parseReceiptIdentity(formData);
    if (!parsed.data) return { errors: parsed.errors };
    try {
      const cookieStore = await cookies();
      await retryReceiptScan({
        ...parsed.data,
        cookieValue: cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value,
      });
      after(() => processReceiptScan(parsed.data.receiptScanId));
      revalidatePath(
        `/b/${parsed.data.shareToken}/receipts/${parsed.data.receiptScanId}`,
      );
      return { success: true };
    } catch (error) {
      return receiptErrorState(error);
    }
  });
}

export async function confirmReceiptAction(_previousState, formData) {
  return monitorAction("confirmReceiptAction", async () => {
    const shareToken = String(formData.get("shareToken") ?? "");
    try {
      const bill = await getBillByShareToken(shareToken);
      const parsed = parseReceiptConfirmation(formData, bill.currency);
      if (!parsed.data) return { errors: parsed.errors };
      const cookieStore = await cookies();
      const confirmed = await confirmReceiptExpense({
        ...parsed.data,
        cookieValue: cookieStore.get(PARTICIPANT_COOKIE_NAME)?.value,
      });
      after(() => deleteReceiptImage(parsed.data.receiptScanId));
      revalidatePath(`/b/${shareToken}`);
      revalidatePath(`/b/${shareToken}/receipts/${parsed.data.receiptScanId}`);
      return { expenseId: confirmed.expenseId, success: true };
    } catch (error) {
      return receiptErrorState(error);
    }
  });
}
