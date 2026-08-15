const CURRENCY_FRACTION_DIGITS = {
  EUR: 2,
  KHR: 0,
  USD: 2,
};

function assertMinorUnits(value, { allowZero = false } = {}) {
  if (!Number.isSafeInteger(value) || (allowZero ? value < 0 : value <= 0)) {
    throw new TypeError(
      allowZero
        ? "Money must be a non-negative safe integer."
        : "Money must be a positive safe integer.",
    );
  }
  return value;
}

export function currencyFractionDigits(currency) {
  const digits = CURRENCY_FRACTION_DIGITS[currency];
  if (digits === undefined) throw new TypeError("Unsupported currency.");
  return digits;
}

export function parseMoneyToMinor(value, currency, { allowZero = false } = {}) {
  const digits = currencyFractionDigits(currency);
  const input = typeof value === "string" ? value.trim() : "";
  const pattern =
    digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`);
  if (!pattern.test(input)) throw new TypeError("Enter a valid amount.");

  const [whole, fraction = ""] = input.split(".");
  const scale = 10n ** BigInt(digits);
  const minor =
    BigInt(whole) * scale + BigInt(fraction.padEnd(digits, "0") || "0");
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("Amount is too large.");
  }
  return assertMinorUnits(Number(minor), { allowZero });
}

export function formatMoney(amountMinor, currency) {
  const digits = currencyFractionDigits(currency);
  assertMinorUnits(amountMinor, { allowZero: true });
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
    style: "currency",
  }).format(amountMinor / 10 ** digits);
}

export function moneyInputValue(amountMinor, currency) {
  const digits = currencyFractionDigits(currency);
  assertMinorUnits(amountMinor, { allowZero: true });
  return (amountMinor / 10 ** digits).toFixed(digits);
}

function uniqueParticipantIds(participantIds) {
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    throw new TypeError("Choose at least one participant.");
  }
  if (
    participantIds.some((id) => typeof id !== "string" || !id) ||
    new Set(participantIds).size !== participantIds.length
  ) {
    throw new TypeError("Participants must be unique.");
  }
  return participantIds;
}

export function splitEqually(amountMinor, participantIds) {
  assertMinorUnits(amountMinor);
  const ids = uniqueParticipantIds(participantIds);
  const base = Math.floor(amountMinor / ids.length);
  const remainder = amountMinor % ids.length;
  return ids.map((participantId, index) => ({
    amountMinor: base + (index < remainder ? 1 : 0),
    participantId,
  }));
}

export function validateExactShares(amountMinor, shares) {
  assertMinorUnits(amountMinor);
  if (!Array.isArray(shares) || shares.length === 0) {
    throw new TypeError("Choose at least one participant.");
  }
  uniqueParticipantIds(shares.map((share) => share.participantId));
  shares.forEach((share) =>
    assertMinorUnits(share.amountMinor, { allowZero: true }),
  );
  const total = shares.reduce((sum, share) => sum + share.amountMinor, 0);
  if (!Number.isSafeInteger(total) || total !== amountMinor) {
    throw new TypeError("Exact shares must match the expense total.");
  }
  return shares;
}
