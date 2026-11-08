// Adapt the prototype's canonical ledger to the shared studio drawer. Keep IDs
// alongside display labels so duplicate names never change the payer identity.
export function expenseForPreview(expense, people, currentParticipantId) {
  const date = new Date(`${expense.date}T12:00:00Z`);
  return {
    ...expense,
    name: expense.description,
    amount: expense.amount_minor,
    payerId: expense.paid_by_participant_id,
    payer:
      people.find((person) => person.id === expense.paid_by_participant_id)
        ?.display_name ?? "Unknown participant",
    share:
      expense.shares.find(
        (share) => share.participantId === currentParticipantId,
      )?.amountMinor ?? 0,
    people: expense.shares.map((share) => share.participantId),
    method: expense.split_method ?? "exact",
    dateISO: expense.date,
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    })
      .format(date)
      .toUpperCase(),
    year: date.getUTCFullYear(),
  };
}

export function applyExpensePreview(expense, edited) {
  return {
    ...expense,
    description: edited.name,
    amount_minor: edited.amount,
    paid_by_participant_id: edited.payerId,
    category: edited.category,
    date: edited.dateISO,
    shares: edited.shares,
    split_method: edited.method,
    notes: edited.notes,
  };
}
