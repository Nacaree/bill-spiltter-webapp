import { parseMoneyToMinor, splitEqually, validateExactShares } from "./money";

export function reviewExpenseDraft(draft, people) {
  const errors = {};
  let amountMinor = null;
  let shares = [];
  if (!draft.description.trim())
    errors.description = "Give the expense a name.";
  try {
    amountMinor = parseMoneyToMinor(draft.amount, "USD");
  } catch {
    errors.amount =
      "Enter an amount greater than zero, with up to two decimal places.";
  }
  const ids = new Set(people.map((person) => person.id));
  if (!ids.has(draft.paidBy)) errors.paidBy = "Choose someone on this bill.";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(draft.date ?? "")
    ? new Date(`${draft.date}T12:00:00Z`)
    : null;
  if (
    !date ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== draft.date
  )
    errors.date = "Choose a valid expense date.";
  if (!draft.people.length) errors.people = "Choose at least one person.";
  else if (
    new Set(draft.people).size !== draft.people.length ||
    draft.people.some((id) => !ids.has(id))
  )
    errors.people = "Choose people who are on this bill.";
  if (!errors.people && amountMinor !== null) {
    if (draft.method === "exact") {
      const exactErrors = {};
      shares = draft.people.map((id) => {
        try {
          return {
            participantId: id,
            amountMinor: parseMoneyToMinor(draft.exact?.[id] ?? "0", "USD", {
              allowZero: true,
            }),
          };
        } catch {
          exactErrors[id] =
            "Enter a valid share, with up to two decimal places.";
          return { participantId: id, amountMinor: 0 };
        }
      });
      if (Object.keys(exactErrors).length) errors.exact = exactErrors;
      else {
        try {
          validateExactShares(amountMinor, shares);
        } catch {
          errors.splitTotal =
            "The individual shares need to add up to the total.";
        }
      }
    } else shares = splitEqually(amountMinor, draft.people);
  }
  return { errors, amountMinor, shares };
}
