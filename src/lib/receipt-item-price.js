function quantityThousandths(value) {
  const input = String(value ?? 1).trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(input)) {
    throw new TypeError("Quantity must have at most three decimal places.");
  }
  const [whole, fraction = ""] = input.split(".");
  const scaled = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
  if (scaled <= 0n || scaled > 1_000_000n) {
    throw new TypeError(
      "Quantity must be greater than zero and at most 1,000.",
    );
  }
  return scaled;
}

export function parseReceiptQuantity(value) {
  return Number(quantityThousandths(value)) / 1000;
}

export function receiptLineTotal(unitPriceMinor, quantity) {
  if (!Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0) {
    throw new TypeError("Enter a valid unit price.");
  }
  // Round fractional quantities to the nearest minor unit, without floats.
  const amount =
    (BigInt(unitPriceMinor) * quantityThousandths(quantity) + 500n) / 1000n;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("The line total is too large.");
  }
  return Number(amount);
}
