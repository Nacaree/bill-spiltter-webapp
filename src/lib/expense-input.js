import { z } from "zod";
import {
  parseMoneyToMinor,
  splitEqually,
  validateExactShares,
} from "@/lib/money";

export const EXPENSE_CATEGORIES = [
  "general",
  "food",
  "transport",
  "accommodation",
  "shopping",
  "entertainment",
  "utilities",
];

export const EXPENSE_CATEGORY_LABELS = {
  accommodation: "Accommodation",
  entertainment: "Entertainment",
  food: "Food & drinks",
  general: "General",
  shopping: "Shopping",
  transport: "Transport",
  utilities: "Utilities",
};

const shareToken = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "This bill link is invalid.");
const participantId = z.uuid("Choose a valid participant.");
const expenseId = z.uuid("Choose a valid expense.");
const expenseDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine(
    (value) => {
      const parsed = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    },
    { message: "Choose a valid date." },
  );

const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { error: "Choose a category." }),
  description: z
    .string()
    .trim()
    .min(1, "Enter a description.")
    .max(120, "Use 120 characters or fewer."),
  expenseDate,
  notes: z.string().trim().max(1000, "Use 1,000 characters or fewer."),
  paidByParticipantId: participantId,
  participantIds: z.array(participantId).min(1, "Choose at least one person."),
  shareToken,
  splitMethod: z.enum(["equal", "exact"], {
    error: "Choose a split method.",
  }),
});

function firstErrors(error) {
  const fields = z.flattenError(error).fieldErrors;
  return Object.fromEntries(
    Object.entries(fields).map(([name, messages]) => [name, messages[0]]),
  );
}

export function parseExpenseForm(formData, currency, { editing = false } = {}) {
  const result = expenseSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description"),
    expenseDate: formData.get("expenseDate"),
    notes: formData.get("notes") ?? "",
    paidByParticipantId: formData.get("paidByParticipantId"),
    participantIds: formData.getAll("participantId"),
    shareToken: formData.get("shareToken"),
    splitMethod: formData.get("splitMethod"),
  });
  if (!result.success) {
    return { data: null, errors: firstErrors(result.error) };
  }

  const uniqueIds = [...new Set(result.data.participantIds)];
  if (uniqueIds.length !== result.data.participantIds.length) {
    return {
      data: null,
      errors: { participantIds: "Choose each person only once." },
    };
  }

  let amountMinor;
  let shares;
  try {
    amountMinor = parseMoneyToMinor(formData.get("amount"), currency);
  } catch (error) {
    return { data: null, errors: { amount: error.message } };
  }
  try {
    shares =
      result.data.splitMethod === "equal"
        ? splitEqually(amountMinor, uniqueIds)
        : validateExactShares(
            amountMinor,
            uniqueIds.map((id) => ({
              amountMinor: parseMoneyToMinor(
                formData.get(`share-${id}`),
                currency,
                { allowZero: true },
              ),
              participantId: id,
            })),
          );
  } catch (error) {
    return { data: null, errors: { shares: error.message } };
  }

  let parsedExpenseId;
  if (editing) {
    const identity = expenseId.safeParse(formData.get("expenseId"));
    if (!identity.success) {
      return { data: null, errors: { form: "This expense is invalid." } };
    }
    parsedExpenseId = identity.data;
  }

  return {
    data: {
      ...result.data,
      amountMinor,
      expenseId: parsedExpenseId,
      participantIds: uniqueIds,
      shares,
    },
    errors: null,
  };
}

export function parseRemoveExpense(formData) {
  const result = z.object({ expenseId, shareToken }).safeParse({
    expenseId: formData.get("expenseId"),
    shareToken: formData.get("shareToken"),
  });
  return result.success
    ? { data: result.data, errors: null }
    : { data: null, errors: { form: "This expense is invalid." } };
}
