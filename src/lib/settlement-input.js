import { z } from "zod";
import { parseMoneyToMinor } from "@/lib/money";

const identity = z.object({
  shareToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  settlementId: z.uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

export function parseSettlementForm(
  form,
  currency,
  { removing = false, editing = false } = {},
) {
  const schema = removing
    ? identity
    : identity.extend({
        fromParticipantId: z.uuid("Choose the sender."),
        toParticipantId: z.uuid("Choose the recipient."),
        settledDate: z.iso.date("Choose a valid payment date."),
        notes: z.string().trim().max(1000, "Use 1,000 characters or fewer."),
        confirmed: z.literal("yes", {
          error: "Confirm that this payment already happened.",
        }),
      });
  const result = schema.safeParse({
    ...Object.fromEntries(form),
    expectedUpdatedAt: form.get("expectedUpdatedAt") || undefined,
    notes: form.get("notes") ?? "",
  });
  if (!result.success) {
    return {
      errors: Object.fromEntries(
        Object.entries(z.flattenError(result.error).fieldErrors).map(
          ([k, v]) => [k, v[0]],
        ),
      ),
    };
  }
  if ((editing || removing) && !result.data.expectedUpdatedAt) {
    return { errors: { form: "Refresh this payment before changing it." } };
  }
  if (removing) return { data: result.data };
  if (result.data.fromParticipantId === result.data.toParticipantId) {
    return {
      errors: {
        toParticipantId: "Sender and recipient must be different people.",
      },
    };
  }
  try {
    return {
      data: {
        ...result.data,
        amountMinor: parseMoneyToMinor(form.get("amount"), currency),
      },
    };
  } catch (error) {
    return { errors: { amount: error.message } };
  }
}
