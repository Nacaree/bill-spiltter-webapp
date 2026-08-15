import { z } from "zod";

export const BILL_CURRENCIES = ["KHR", "USD", "EUR"];

const billName = z
  .string()
  .trim()
  .min(1, "Enter a bill name.")
  .max(100, "Use 100 characters or fewer.");

const participantName = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(60, "Use 60 characters or fewer.");

const createBillSchema = z.object({
  billName,
  currency: z.enum(BILL_CURRENCIES, { error: "Choose a supported currency." }),
  participantName,
});

const joinBillSchema = z.object({
  participantName,
  shareToken: z
    .string()
    .regex(/^[A-Za-z0-9_-]{43}$/, "This bill link is invalid."),
});

function firstErrors(error) {
  const fields = z.flattenError(error).fieldErrors;
  return Object.fromEntries(
    Object.entries(fields).map(([name, messages]) => [name, messages[0]]),
  );
}

export function parseCreateBill(formData) {
  const result = createBillSchema.safeParse({
    billName: formData.get("billName"),
    currency: formData.get("currency"),
    participantName: formData.get("participantName"),
  });
  return result.success
    ? { data: result.data, errors: null }
    : { data: null, errors: firstErrors(result.error) };
}

export function parseJoinBill(formData) {
  const result = joinBillSchema.safeParse({
    participantName: formData.get("participantName"),
    shareToken: formData.get("shareToken"),
  });
  return result.success
    ? { data: result.data, errors: null }
    : { data: null, errors: firstErrors(result.error) };
}
