"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { protectedAction } from "@/server/protected-action";
import {
  deleteBillPermanently,
  removeDeletedBillFiles,
} from "@/server/bill-lifecycle";
import { CreatorAccessRequiredError } from "@/server/payment-methods";
import {
  BillNotFoundError,
  ParticipantSessionRequiredError,
} from "@/server/bills";
import { rateLimitFailure } from "@/lib/rate-limit-error";
import {
  CREATOR_COOKIE_NAME,
  PARTICIPANT_COOKIE_NAME,
  participantCookieOptions,
} from "@/lib/participant-session";
import { reportAppError } from "@/server/monitoring";

export async function deleteBillAction(_state, form) {
  return protectedAction("deleteBillAction", async () => {
    const shareToken = String(form.get("shareToken") ?? "");
    if (!/^[A-Za-z0-9_-]{43}$/.test(shareToken))
      return { errors: { form: "This bill is no longer available." } };
    if (form.get("confirmation") !== "DELETE")
      return {
        errors: { confirmation: "Type DELETE to confirm permanent deletion." },
      };
    let billId;
    try {
      const store = await cookies();
      billId = await deleteBillPermanently({
        shareToken,
        cookieValue: store.get(PARTICIPANT_COOKIE_NAME)?.value,
        recoveryToken: store.get(CREATOR_COOKIE_NAME)?.value,
      });
      for (const name of [PARTICIPANT_COOKIE_NAME, CREATOR_COOKIE_NAME]) {
        store.set(name, "", {
          ...participantCookieOptions({ path: `/b/${shareToken}` }),
          maxAge: 0,
        });
      }
    } catch (error) {
      const limited = rateLimitFailure(error);
      if (limited) return limited;
      if (
        error instanceof CreatorAccessRequiredError ||
        error instanceof ParticipantSessionRequiredError
      )
        return {
          errors: {
            form: "Use the device that created this bill to delete it.",
          },
        };
      if (error instanceof BillNotFoundError)
        return { errors: { form: "This bill is no longer available." } };
      reportAppError(new Error("Bill deletion failed"), "bill_delete");
      return { errors: { form: "We couldn’t delete the bill. Try again." } };
    }
    after(() => removeDeletedBillFiles(billId));
    revalidatePath(`/b/${shareToken}`, "layout");
    redirect("/bill-deleted");
  });
}
