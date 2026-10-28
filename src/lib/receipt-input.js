import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/expense-input";
import { parseMoneyToMinor } from "@/lib/money";
import {
  allocateReceiptReview,
  receiptAllocationMismatch,
} from "@/lib/receipt-review";
import { parseReceiptQuantity } from "@/lib/receipt-item-price";

const shareToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const uuid = z.uuid();
const date = z.iso.date();

function signedMoney(value, currency) {
  const input = String(value ?? "").trim();
  const negative = input.startsWith("-");
  const amount = parseMoneyToMinor(
    negative ? input.slice(1) : input,
    currency,
    {
      allowZero: true,
    },
  );
  return negative ? -amount : amount;
}

export function parseReceiptIdentity(formData) {
  const result = z.object({ receiptScanId: uuid, shareToken }).safeParse({
    receiptScanId: formData.get("receiptScanId"),
    shareToken: formData.get("shareToken"),
  });
  return result.success
    ? { data: result.data, errors: null }
    : { data: null, errors: { form: "This receipt is invalid." } };
}

export function parseReceiptConfirmation(
  formData,
  currency,
  { editing = false, savedReceipt } = {},
) {
  const base = z
    .object({
      adjustmentMethod: z.enum(["proportional", "equal", "custom"]),
      category: z.enum(EXPENSE_CATEGORIES),
      confirmationKey: editing ? uuid.optional() : uuid,
      expenseId: editing ? uuid : uuid.optional(),
      expectedUpdatedAt: editing
        ? z.iso.datetime({ offset: true })
        : z.string().optional(),
      description: z.string().trim().min(1).max(120),
      expenseDate: date,
      itemCount: z.coerce.number().int().min(1).max(250),
      merchantName: z.string().trim().max(120),
      paidByParticipantId: uuid,
      receiptScanId: uuid,
      shareToken,
    })
    .safeParse({
      adjustmentMethod: formData.get("adjustmentMethod"),
      category: formData.get("category"),
      confirmationKey: formData.get("confirmationKey") ?? undefined,
      expenseId: formData.get("expenseId") ?? undefined,
      expectedUpdatedAt: formData.get("expectedUpdatedAt") ?? undefined,
      description: formData.get("description"),
      expenseDate: formData.get("expenseDate"),
      itemCount: formData.get("itemCount"),
      merchantName: formData.get("merchantName") ?? "",
      paidByParticipantId: formData.get("paidByParticipantId"),
      receiptScanId: formData.get("receiptScanId"),
      shareToken: formData.get("shareToken"),
    });
  if (!base.success) {
    return {
      data: null,
      errors: { form: "Review the receipt fields and try again." },
    };
  }
  if (
    editing &&
    receiptAllocationMismatch(savedReceipt) &&
    formData.get("acknowledgeRecalculation") !== "yes"
  ) {
    return {
      data: null,
      errors: {
        form: "Confirm replacing the current split with the reviewed receipt shares.",
      },
    };
  }

  let subtotalMinor;
  let taxMinor;
  let tipMinor;
  let discountMinor;
  let totalMinor;
  try {
    subtotalMinor = parseMoneyToMinor(formData.get("subtotal"), currency, {
      allowZero: true,
    });
    taxMinor = parseMoneyToMinor(formData.get("tax"), currency, {
      allowZero: true,
    });
    tipMinor = parseMoneyToMinor(formData.get("tip"), currency, {
      allowZero: true,
    });
    discountMinor = parseMoneyToMinor(formData.get("discount"), currency, {
      allowZero: true,
    });
    totalMinor = parseMoneyToMinor(formData.get("total"), currency);
  } catch (error) {
    return { data: null, errors: { totals: error.message } };
  }

  const items = [];
  try {
    for (let index = 0; index < base.data.itemCount; index += 1) {
      const description = String(
        formData.get(`item-${index}-description`) ?? "",
      ).trim();
      if (!description || description.length > 160) {
        throw new TypeError("Every item needs a short description.");
      }
      const participantIds = formData.getAll(`item-${index}-participant`);
      if (
        !participantIds.length ||
        participantIds.some((id) => !uuid.safeParse(id).success)
      ) {
        throw new TypeError("Assign every item to at least one person.");
      }
      items.push({
        clientKey: String(index),
        savedItemId:
          editing && formData.get(`item-${index}-id`)
            ? uuid.parse(formData.get(`item-${index}-id`))
            : null,
        confidenceBasisPoints: null,
        description,
        needsReview: false,
        participantIds,
        position: index,
        quantity: parseReceiptQuantity(
          formData.get(`item-${index}-quantity`) ?? 1,
        ),
        unitPriceMinor: String(
          formData.get(`item-${index}-unit-price`) ?? "",
        ).trim()
          ? parseMoneyToMinor(
              formData.get(`item-${index}-unit-price`),
              currency,
              { allowZero: true },
            )
          : null,
        totalMinor: parseMoneyToMinor(
          formData.get(`item-${index}-total`),
          currency,
        ),
      });
    }
  } catch (error) {
    return { data: null, errors: { items: error.message } };
  }

  let allocation;
  try {
    const customAdjustments =
      base.data.adjustmentMethod === "custom"
        ? [...new Set(items.flatMap((item) => item.participantIds))].map(
            (participantId) => ({
              amountMinor: signedMoney(
                formData.get(`adjustment-${participantId}`),
                currency,
              ),
              participantId,
            }),
          )
        : [];
    allocation = allocateReceiptReview(
      {
        adjustmentMethod: base.data.adjustmentMethod,
        customAdjustments,
        items,
        totalMinor,
      },
      savedReceipt,
    );
  } catch (error) {
    return { data: null, errors: { allocation: error.message } };
  }

  return {
    data: {
      ...base.data,
      assignmentRows: allocation.itemAssignments,
      discountMinor,
      finalShares: allocation.finalShares,
      itemRows: items,
      subtotalMinor,
      taxMinor,
      tipMinor,
      totalMinor,
    },
    errors: null,
  };
}
