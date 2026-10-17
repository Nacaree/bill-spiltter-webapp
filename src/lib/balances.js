// BigInt keeps aggregation exact even when the ledger has many large entries.
function integer(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("The ledger contains an invalid amount.");
  }
  return BigInt(value);
}

function safeNumber(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new TypeError("The bill total is too large to display safely.");
  }
  return number;
}

export function calculateBalances({ participants, expenses, settlements }) {
  const people = new Map(
    participants.map((person) => [
      person.id,
      { ...person, paid: 0n, share: 0n, sent: 0n, received: 0n, entries: [] },
    ]),
  );
  function person(id) {
    const found = people.get(id);
    if (!found) throw new TypeError("A ledger participant is missing.");
    return found;
  }
  for (const expense of expenses.filter((row) => !row.deleted_at)) {
    const amount = integer(expense.amount_minor);
    const total = expense.shares.reduce(
      (sum, share) => sum + integer(share.amountMinor),
      0n,
    );
    if (
      amount <= 0n ||
      total !== amount ||
      new Set(expense.shares.map((s) => s.participantId)).size !==
        expense.shares.length
    ) {
      throw new TypeError("Expense shares do not match the ledger.");
    }
    person(expense.paid_by_participant_id).paid += amount;
    const involved = new Set([expense.paid_by_participant_id]);
    for (const share of expense.shares) {
      person(share.participantId).share += integer(share.amountMinor);
      involved.add(share.participantId);
    }
    for (const id of involved) {
      person(id).entries.push({
        expenseId: expense.id,
        description: expense.description,
        paidMinor:
          id === expense.paid_by_participant_id ? expense.amount_minor : 0,
        shareMinor:
          expense.shares.find((s) => s.participantId === id)?.amountMinor ?? 0,
      });
    }
  }
  for (const settlement of settlements.filter((row) => !row.deleted_at)) {
    const amount = integer(settlement.amount_minor);
    if (
      amount <= 0n ||
      settlement.from_participant_id === settlement.to_participant_id
    ) {
      throw new TypeError("The ledger contains an invalid payment.");
    }
    person(settlement.from_participant_id).sent += amount;
    person(settlement.to_participant_id).received += amount;
  }
  const rows = [...people.values()].map(
    ({ paid, share, sent, received, ...rest }) => ({
      ...rest,
      paidMinor: safeNumber(paid),
      shareMinor: safeNumber(share),
      sentMinor: safeNumber(sent),
      receivedMinor: safeNumber(received),
      netMinor: safeNumber(paid - share + sent - received),
    }),
  );
  if (rows.reduce((sum, row) => sum + BigInt(row.netMinor), 0n) !== 0n) {
    throw new TypeError("The bill balances do not sum to zero.");
  }
  return rows;
}

export function suggestTransfers(balances) {
  if (balances.reduce((sum, row) => sum + BigInt(row.netMinor), 0n) !== 0n) {
    throw new TypeError("The bill balances do not sum to zero.");
  }
  const sort = (a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id);
  const debtors = balances
    .filter((p) => p.netMinor < 0)
    .map((p) => ({ id: p.id, remaining: -p.netMinor }))
    .sort(sort);
  const creditors = balances
    .filter((p) => p.netMinor > 0)
    .map((p) => ({ id: p.id, remaining: p.netMinor }))
    .sort(sort);
  const transfers = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amountMinor = Math.min(debtors[d].remaining, creditors[c].remaining);
    transfers.push({
      fromParticipantId: debtors[d].id,
      toParticipantId: creditors[c].id,
      amountMinor,
    });
    debtors[d].remaining -= amountMinor;
    creditors[c].remaining -= amountMinor;
    if (!debtors[d].remaining) d++;
    if (!creditors[c].remaining) c++;
  }
  return transfers;
}
