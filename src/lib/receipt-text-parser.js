import { currencyFractionDigits } from "@/lib/money";

const SUMMARY_PATTERNS = {
  discount: /\b(discount|coupon|savings|promo)\b/i,
  subtotal: /\b(sub[ -]?total)\b/i,
  tax: /\b(tax|vat|gst)\b/i,
  tip: /\b(tip|gratuity|service[ -]?charge)\b/i,
  total: /\b(grand[ -]?total|amount[ -]?(due|paid)|net[ -]?total|total)\b/i,
};

const PAYMENT_PATTERN =
  /\b(cash|change|card|visa|mastercard|tender|payment|balance)\b/i;
const CURRENCY_PATTERN = /\b(USD|EUR|KHR)\b|[$€៛]/i;
const TRAILING_AMOUNT =
  /([(-]?\s*(?:USD|EUR|KHR|[$€៛])?\s*\d[\d.,]*\s*\)?)\s*$/i;

function validIsoDate(year, month, day) {
  const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function findDate(text) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const local = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (!local) return null;
  const first = Number(local[1]);
  const second = Number(local[2]);
  const year = Number(local[3]);
  const [day, month] =
    first > 12
      ? [first, second]
      : second > 12
        ? [second, first]
        : [first, second];
  return validIsoDate(year, month, day);
}

export function parseOcrAmount(value, currency) {
  const digits = currencyFractionDigits(currency);
  let input = String(value)
    .trim()
    .replace(/USD|EUR|KHR|[$€៛]|\s/gi, "");
  const negative =
    input.startsWith("-") || (input.startsWith("(") && input.endsWith(")"));
  input = input.replace(/[()\-]/g, "");
  if (!/^\d[\d.,]*$/.test(input)) return null;

  if (digits === 0) {
    const integer = Number(input.replace(/[.,]/g, ""));
    return Number.isSafeInteger(integer)
      ? negative
        ? -integer
        : integer
      : null;
  }

  const lastComma = input.lastIndexOf(",");
  const lastDot = input.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);
  let normalized;
  if (separatorIndex === -1) {
    normalized = `${input}.${"0".repeat(digits)}`;
  } else {
    const fractionalLength = input.length - separatorIndex - 1;
    if (fractionalLength > 0 && fractionalLength <= digits) {
      normalized = `${input.slice(0, separatorIndex).replace(/[.,]/g, "")}.${input.slice(separatorIndex + 1)}`;
    } else {
      normalized = `${input.replace(/[.,]/g, "")}.${"0".repeat(digits)}`;
    }
  }
  const [whole, fraction = ""] = normalized.split(".");
  const amount =
    Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0"));
  return Number.isSafeInteger(amount) ? (negative ? -amount : amount) : null;
}

function lineAmount(line, currency) {
  const match = line.match(TRAILING_AMOUNT);
  if (!match) return null;
  const amountMinor = parseOcrAmount(match[1], currency);
  if (amountMinor === null) return null;
  return {
    amountMinor,
    description: line
      .slice(0, match.index)
      .replace(/[.·:_-]+\s*$/, "")
      .trim(),
    rawAmount: match[1],
  };
}

function summaryAmount(lines, key, currency) {
  const line = [...lines].reverse().find((candidate) => {
    if (!SUMMARY_PATTERNS[key].test(candidate)) return false;
    return key !== "total" || !SUMMARY_PATTERNS.subtotal.test(candidate);
  });
  return line ? (lineAmount(line, currency)?.amountMinor ?? null) : null;
}

function detectedCurrency(text, fallback) {
  if (/\bKHR\b|៛/i.test(text)) return "KHR";
  if (/\bEUR\b|€/i.test(text)) return "EUR";
  if (/\bUSD\b|\$/i.test(text)) return "USD";
  return fallback;
}

function merchantLine(lines, currency) {
  return (
    lines.find((line) => {
      if (line.length < 2 || line.length > 120) return false;
      if (findDate(line) || PAYMENT_PATTERN.test(line)) return false;
      if (Object.values(SUMMARY_PATTERNS).some((pattern) => pattern.test(line)))
        return false;
      return lineAmount(line, currency) === null;
    }) ?? null
  );
}

export function parseReceiptText(text, billCurrency) {
  const normalizedText = String(text ?? "")
    .replace(/\r/g, "")
    .trim();
  const lines = normalizedText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const currency = detectedCurrency(normalizedText, billCurrency);
  const summaryLines = new Set(
    lines.filter((line) =>
      Object.values(SUMMARY_PATTERNS).some((pattern) => pattern.test(line)),
    ),
  );

  const items = lines.flatMap((line) => {
    if (summaryLines.has(line) || PAYMENT_PATTERN.test(line) || findDate(line))
      return [];
    const parsed = lineAmount(line, currency);
    if (!parsed || parsed.amountMinor <= 0 || !parsed.description) return [];
    if (
      CURRENCY_PATTERN.test(parsed.description) &&
      parsed.description.length < 5
    )
      return [];
    const quantityMatch = parsed.description.match(
      /^(\d+(?:\.\d+)?)\s*[xX@]\s*(.+)$/,
    );
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
    const description = (quantityMatch?.[2] ?? parsed.description).trim();
    if (!description || /^\d+$/.test(description)) return [];
    return [
      {
        confidenceBasisPoints: 7_000,
        description,
        quantity,
        totalMinor: parsed.amountMinor,
        unitPriceMinor:
          quantity > 0 && Number.isInteger(parsed.amountMinor / quantity)
            ? parsed.amountMinor / quantity
            : null,
      },
    ];
  });

  const subtotal = summaryAmount(lines, "subtotal", currency);
  return {
    currency,
    discountMinor: Math.abs(summaryAmount(lines, "discount", currency) ?? 0),
    items,
    merchantName: merchantLine(lines, currency),
    provider: "ocr-space",
    providerRequestId: null,
    receiptDate: findDate(normalizedText),
    subtotalMinor:
      subtotal ??
      (items.length
        ? items.reduce((sum, item) => sum + item.totalMinor, 0)
        : null),
    taxMinor: Math.abs(summaryAmount(lines, "tax", currency) ?? 0),
    tipMinor: Math.abs(summaryAmount(lines, "tip", currency) ?? 0),
    totalMinor: summaryAmount(lines, "total", currency),
  };
}
