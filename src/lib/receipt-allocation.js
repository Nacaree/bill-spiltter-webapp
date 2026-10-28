import { splitEqually, validateExactShares } from "@/lib/money";

function allocateWeighted(amountMinor, weights) {
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor < 0 ||
    !weights.length
  ) {
    throw new TypeError("Allocation inputs are invalid.");
  }
  const weightTotal = weights.reduce((sum, item) => sum + item.weight, 0);
  if (!Number.isSafeInteger(weightTotal) || weightTotal <= 0) {
    throw new TypeError("Allocation weights are invalid.");
  }
  const allocated = weights.map((item) => ({
    amountMinor: Number(
      (BigInt(amountMinor) * BigInt(item.weight)) / BigInt(weightTotal),
    ),
    participantId: item.participantId,
  }));
  let remainder =
    amountMinor - allocated.reduce((sum, item) => sum + item.amountMinor, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % allocated.length) {
    allocated[index].amountMinor += 1;
    remainder -= 1;
  }
  return allocated;
}

export function allocateReceipt({
  adjustmentMethod,
  customAdjustments = [],
  items,
  totalMinor,
  savedItems = [],
  fixedParticipantIds = [],
}) {
  if (!items.length) throw new TypeError("Add at least one receipt item.");
  const itemAssignments = [];
  const itemShares = new Map();

  items.forEach((item) => {
    const participantIds = [...new Set(item.participantIds)];
    const saved = savedItems.find((row) => row.id === item.savedItemId);
    const preserved = saved?.assignments ?? [];
    const canPreserve =
      saved?.total_minor === item.totalMinor &&
      preserved.length === participantIds.length &&
      preserved.every((row) => participantIds.includes(row.participantId)) &&
      preserved.reduce((sum, row) => sum + row.amountMinor, 0) ===
        item.totalMinor;
    let allocations;
    if (canPreserve) allocations = preserved;
    else {
      const fixed = preserved.filter(
        (row) =>
          fixedParticipantIds.includes(row.participantId) &&
          participantIds.includes(row.participantId),
      );
      const remainingIds = participantIds.filter(
        (id) => !fixed.some((row) => row.participantId === id),
      );
      const remaining =
        item.totalMinor - fixed.reduce((sum, row) => sum + row.amountMinor, 0);
      if (remaining < 0 || (!remainingIds.length && remaining !== 0))
        throw new TypeError(
          "Keep the historical inactive allocations, or remove them and assign this item to an active person.",
        );
      allocations = [
        ...fixed,
        ...(remainingIds.length
          ? remaining === 0
            ? remainingIds.map((participantId) => ({
                participantId,
                amountMinor: 0,
              }))
            : splitEqually(remaining, remainingIds)
          : []),
      ];
    }
    allocations.forEach((allocation) => {
      itemAssignments.push({ clientKey: item.clientKey, ...allocation });
      itemShares.set(
        allocation.participantId,
        (itemShares.get(allocation.participantId) ?? 0) +
          allocation.amountMinor,
      );
    });
  });

  const itemTotal = [...itemShares.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  const adjustment = totalMinor - itemTotal;
  const participants = [...itemShares.keys()];
  let adjustmentShares;
  if (adjustmentMethod === "custom") {
    adjustmentShares = customAdjustments;
    if (
      adjustmentShares.reduce((sum, item) => sum + item.amountMinor, 0) !==
      adjustment
    ) {
      throw new TypeError(
        "Custom adjustments must match the receipt difference.",
      );
    }
  } else if (adjustment === 0) {
    adjustmentShares = participants.map((participantId) => ({
      amountMinor: 0,
      participantId,
    }));
  } else {
    const magnitude = Math.abs(adjustment);
    const positiveAllocations =
      adjustmentMethod === "equal"
        ? splitEqually(magnitude, participants)
        : allocateWeighted(
            magnitude,
            participants.map((participantId) => ({
              participantId,
              weight: itemShares.get(participantId),
            })),
          );
    adjustmentShares = positiveAllocations.map((item) => ({
      ...item,
      amountMinor: adjustment < 0 ? -item.amountMinor : item.amountMinor,
    }));
  }

  const finalShares = participants.map((participantId) => ({
    amountMinor:
      itemShares.get(participantId) +
      (adjustmentShares.find((item) => item.participantId === participantId)
        ?.amountMinor ?? 0),
    participantId,
  }));
  if (finalShares.some((share) => share.amountMinor < 0)) {
    throw new TypeError("A discount cannot make a person’s share negative.");
  }
  validateExactShares(totalMinor, finalShares);
  return { adjustment, finalShares, itemAssignments };
}
