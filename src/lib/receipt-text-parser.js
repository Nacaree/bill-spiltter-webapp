import { currencyFractionDigits } from "@/lib/money";

const SUMMARY_PATTERNS = {
  discount: /^(?:total\s+)?(?:discount|coupon|savings|promo)\b/i,
  subtotal: /^sub[ -]?total\b/i,
  tax: /^(?:total\s+)?(?:tax|vat|gst)\b/i,
  tip: /^(?:tip|gratuity|service[ -]?charge)\b/i,
  total: /^(?:grand[ -]?total|amount[ -]?(?:due|paid)|net[ -]?total|total)\b/i,
};

const PAYMENT_PATTERN =
  /^(?:cash|change|card|visa|mastercard|tender|payment|balance)\b/i;
const METADATA_PATTERN =
  /^(?:tel(?:ephone)?|phone|mobile|fax|address|table|order|invoice|receipt|bill\s*(?:no|number|#)|cashier|server|staff|guest|pax|date|time|thank\s+you|qty|quantity|item\s+qty|total\s+(?:items|qty|quantity))\b|^(?:www\.|https?:)/i;
const TRAILING_AMOUNT =
  /([(-]?\s*(?:USD|EUR|KHR|[$€៛])?\s*\d[\d.,]*\s*\)?(?:\s*(?:USD|EUR|KHR|[$€៛]))?)\s*$/i;

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
  if (input.startsWith("-")) input = input.slice(1);
  else if (input.startsWith("(") && input.endsWith(")"))
    input = input.slice(1, -1);
  if (!/^\d+(?:[.,]\d+)*$/.test(input)) return null;

  // Accept decimal and thousands separators only when their grouping is valid.
  // In particular, a misread 1.2345 must not become a $12,345 expense.
  const separatorIndex = Math.max(
    input.lastIndexOf(","),
    input.lastIndexOf("."),
  );
  let whole = input;
  let fraction = "";
  if (separatorIndex !== -1) {
    const tail = input.slice(separatorIndex + 1);
    if (digits > 0 && tail.length <= digits) {
      whole = input.slice(0, separatorIndex);
      fraction = tail;
      if (whole.includes(input[separatorIndex])) return null;
    } else if (digits === 0 && tail === "00") {
      // Some KHR receipts print .00 despite the currency having no minor units.
      whole = input.slice(0, separatorIndex);
    }
  }
  if (!/^\d+$/.test(whole) && !/^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(whole))
    return null;
  const amount =
    BigInt(whole.replace(/[.,]/g, "")) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0") || "0");
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return negative ? -Number(amount) : Number(amount);
}

function lineAmount(line, currency) {
  const match = line.match(TRAILING_AMOUNT);
  if (!match) return null;
  if (
    match.index > 0 &&
    !/^\s/.test(match[1]) &&
    !/[\s:$€៛]/.test(line[match.index - 1])
  )
    return null;
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

function summaryKind(line) {
  return Object.entries(SUMMARY_PATTERNS).find(
    ([, pattern]) =>
      pattern.test(line) &&
      (pattern !== SUMMARY_PATTERNS.total ||
        /^(?:\s*[:.-]?\s*)(?:$|[\d($€៛-]|(?:USD|EUR|KHR)\b)/i.test(
          line.replace(pattern, ""),
        )),
  )?.[0];
}

function explicitCurrencies(text) {
  return [
    [/\bUSD\b|\$/i, "USD"],
    [/\bKHR\b|៛/i, "KHR"],
    [/\bEUR\b|€/i, "EUR"],
  ]
    .filter(([pattern]) => pattern.test(text))
    .map(([, currency]) => currency);
}

function matchesCurrency(line, currency) {
  const currencies = explicitCurrencies(line);
  return (
    currencies.length === 0 ||
    (currencies.length === 1 && currencies[0] === currency)
  );
}

function summaryAmount(lines, key, currency) {
  const amounts = lines.flatMap((line) => {
    if (summaryKind(line) !== key || !matchesCurrency(line, currency))
      return [];
    const parsed = lineAmount(line, currency);
    if (!parsed) return [];
    if (
      key === "total" &&
      /^total\s+(?:items|qty|quantity|quantity sold)\b/i.test(line)
    )
      return [];
    if (key === "tax" && /\b(?:included|inclusive)\b/i.test(line)) return [];
    return [{ ...parsed, line }];
  });
  if (key === "total") {
    // Prefer the receipt total over a later amount-paid line or converted total.
    const rank = (line) =>
      /^grand[ -]?total\b/i.test(line)
        ? 3
        : /^(?:amount[ -]?due|net[ -]?total)\b/i.test(line)
          ? 2
          : /^total\b/i.test(line)
            ? 1
            : 0;
    return (
      amounts.reverse().sort((a, b) => rank(b.line) - rank(a.line))[0]
        ?.amountMinor ?? null
    );
  }
  if (key === "tax") {
    const totalTax = amounts.findLast(({ line }) =>
      /^total\s+tax\b/i.test(line),
    );
    if (totalTax) return totalTax.amountMinor;
    return amounts.length
      ? amounts.reduce((sum, row) => sum + Math.abs(row.amountMinor), 0)
      : null;
  }
  return amounts.at(-1)?.amountMinor ?? null;
}

function merchantLine(lines, currency) {
  return (
    lines.find((line) => {
      if (line.length < 2 || line.length > 120) return false;
      if (
        findDate(line) ||
        PAYMENT_PATTERN.test(line) ||
        METADATA_PATTERN.test(line)
      )
        return false;
      if (summaryKind(line) || !/[\p{L}]/u.test(line)) return false;
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
  const currencies = explicitCurrencies(normalizedText);
  const currency = currencies.includes(billCurrency)
    ? billCurrency
    : currencies.length === 1
      ? currencies[0]
      : billCurrency;
  const hasQuantityColumns = lines.some((line) =>
    /\b(?:qty|quantity)\b.*\b(?:price|rate)\b.*\b(?:amount|total)\b/i.test(
      line,
    ),
  );
  const merchantName = merchantLine(lines, currency);

  // Table-mode OCR can put a summary label and its value on separate lines.
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (
      summaryKind(lines[index]) &&
      lineAmount(lines[index], currency) === null &&
      /^[(\-\d$€៛]|^(?:USD|EUR|KHR)\b/i.test(lines[index + 1]) &&
      !lineAmount(lines[index + 1], currency)?.description
    ) {
      lines[index] = `${lines[index]} ${lines[index + 1]}`;
      lines.splice(index + 1, 1);
    }
  }

  const items = lines.flatMap((line) => {
    if (
      line === merchantName ||
      summaryKind(line) ||
      PAYMENT_PATTERN.test(line) ||
      METADATA_PATTERN.test(line) ||
      findDate(line) ||
      !matchesCurrency(line, currency)
    )
      return [];
    const parsed = lineAmount(line, currency);
    if (!parsed || parsed.amountMinor <= 0 || !parsed.description) return [];
    const quantityMatch = parsed.description.match(
      /^(\d+(?:\.\d+)?)\s*[xX@]\s*(.+)$/,
    );
    const columnMatch = hasQuantityColumns
      ? parsed.description.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s+([\d.,]+)$/)
      : null;
    const suffixMatch = parsed.description.match(
      /^(.+?)\s+(\d+(?:\.\d+)?)\s*[xX@]\s*([\d.,]+)$/,
    );
    const priceColumns = suffixMatch ?? columnMatch;
    const quantity = Number(quantityMatch?.[1] ?? priceColumns?.[2] ?? 1);
    if (quantity <= 0 || quantity > 1_000) return [];
    let description = (
      quantityMatch?.[2] ??
      priceColumns?.[1] ??
      parsed.description
    ).trim();
    let unitPriceMinor = priceColumns
      ? parseOcrAmount(priceColumns[3], currency)
      : null;
    if (quantityMatch) {
      const unit = lineAmount(description, currency);
      if (unit?.description) {
        description = unit.description;
        unitPriceMinor = unit.amountMinor;
      }
    }
    if (
      !description ||
      !/[\p{L}]/u.test(description) ||
      description.length > 160
    )
      return [];
    const impliedUnitPrice = Number.isInteger(parsed.amountMinor / quantity)
      ? parsed.amountMinor / quantity
      : null;
    const unitPriceMatches =
      unitPriceMinor === null ||
      unitPriceMinor * quantity === parsed.amountMinor;
    return [
      {
        confidenceBasisPoints: unitPriceMatches ? 7_000 : 4_000,
        description,
        quantity,
        totalMinor: parsed.amountMinor,
        unitPriceMinor: unitPriceMatches
          ? (unitPriceMinor ?? impliedUnitPrice)
          : null,
      },
    ];
  });

  const subtotal = summaryAmount(lines, "subtotal", currency);
  return {
    currency,
    discountMinor: Math.abs(summaryAmount(lines, "discount", currency) ?? 0),
    items,
    merchantName,
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
