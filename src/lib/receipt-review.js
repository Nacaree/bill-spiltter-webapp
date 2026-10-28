import { allocateReceipt } from "@/lib/receipt-allocation";

export function savedItemShares(scan) {
  const shares = new Map();
  for (const item of scan.items) {
    for (const row of item.assignments ?? []) {
      shares.set(
        row.participantId,
        (shares.get(row.participantId) ?? 0) + row.amountMinor,
      );
    }
  }
  return shares;
}

export function savedCustomAdjustments(scan) {
  const items = savedItemShares(scan);
  return (scan.expense?.shares ?? []).map((row) => ({
    participantId: row.participantId,
    amountMinor: row.amountMinor - (items.get(row.participantId) ?? 0),
  }));
}

// Older generic edits could change ledger shares independently of the receipt.
// Accept every valid rounding of the stored allocation, not just one row order.
export function receiptAllocationMismatch(scan) {
  if (!scan?.expense) return false;
  const shares = scan.expense.shares;
  const itemShares = savedItemShares(scan);
  const itemTotal = [...itemShares.values()].reduce((a, b) => a + b, 0);
  if (
    scan.expense.amount_minor !== scan.total_minor ||
    shares.reduce((sum, row) => sum + row.amountMinor, 0) !==
      scan.total_minor ||
    shares.length !== itemShares.size ||
    shares.some((row) => !itemShares.has(row.participantId)) ||
    scan.items.some(
      (item) =>
        (item.assignments ?? []).reduce(
          (sum, row) => sum + row.amountMinor,
          0,
        ) !== item.total_minor,
    )
  )
    return true;
  if (scan.adjustment_method === "custom") return false;
  const adjustment = scan.total_minor - itemTotal;
  const magnitude = BigInt(Math.abs(adjustment));
  const divisor = BigInt(
    scan.adjustment_method === "equal" ? itemShares.size : itemTotal,
  );
  if (divisor <= 0n) return true;
  return shares.some((row) => {
    const base = itemShares.get(row.participantId);
    const weight = BigInt(scan.adjustment_method === "equal" ? 1 : base);
    const numerator = magnitude * weight;
    const floor = Number(numerator / divisor);
    const ceil = floor + (numerator % divisor === 0n ? 0 : 1);
    const delta = (row.amountMinor - base) * (adjustment < 0 ? -1 : 1);
    return delta < floor || delta > ceil;
  });
}

export function allocateReceiptReview(input, scan) {
  const result = allocateReceipt({
    ...input,
    savedItems: scan?.items ?? [],
    fixedParticipantIds: (scan?.reviewParticipants ?? [])
      .filter((person) => person.deactivated_at)
      .map((person) => person.id),
  });
  if (!scan?.expense || receiptAllocationMismatch(scan)) return result;
  const unchanged =
    input.totalMinor === scan.total_minor &&
    input.adjustmentMethod === scan.adjustment_method &&
    input.items.length === scan.items.length &&
    input.items.every((item) => {
      const saved = scan.items.find((row) => row.id === item.savedItemId);
      return (
        saved &&
        saved.total_minor === item.totalMinor &&
        saved.assignments.length === new Set(item.participantIds).size &&
        saved.assignments.every((row) =>
          item.participantIds.includes(row.participantId),
        )
      );
    });
  const customUnchanged =
    input.adjustmentMethod !== "custom" ||
    savedCustomAdjustments(scan).every((row) =>
      input.customAdjustments.some(
        (next) =>
          next.participantId === row.participantId &&
          next.amountMinor === row.amountMinor,
      ),
    );
  return unchanged && customUnchanged
    ? { ...result, finalShares: scan.expense.shares }
    : result;
}
