"use server";

import { cookies } from "next/headers";
import { parseCreateBill, parseJoinBill } from "@/lib/bill-input";
import {
  CREATOR_COOKIE_NAME,
  PARTICIPANT_COOKIE_NAME,
  participantCookieOptions,
} from "@/lib/participant-session";
import {
  BillNotFoundError,
  createBillWithCreator,
  joinBill,
  ParticipantNameTakenError,
} from "@/server/bills";

export async function createBillAction(_previousState, formData) {
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
    console.error("Unable to create bill:", error.message);
    return {
      errors: {
        form: "We couldn't create the bill. Check the server configuration and try again.",
      },
    };
  }
}

export async function joinBillAction(_previousState, formData) {
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
    console.error("Unable to join bill:", error.message);
    return { errors: { form: "We couldn't add you. Please try again." } };
  }
}
