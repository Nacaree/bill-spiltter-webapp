import { z } from "zod";
import sharp from "sharp";
import { parseReceiptText } from "@/lib/receipt-text-parser";

const extractedItem = z.object({
  confidenceBasisPoints: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .nullable()
    .optional(),
  description: z.string().max(160).nullable().optional(),
  quantity: z.number().positive().max(1_000).nullable().optional(),
  totalMinor: z.number().int().positive(),
  unitPriceMinor: z.number().int().nullable().optional(),
});

export const receiptExtractionSchema = z.object({
  currency: z.string().length(3).toUpperCase().nullable().optional(),
  discountMinor: z.number().int().nonnegative().nullable().optional(),
  items: z.array(extractedItem).max(250).default([]),
  merchantName: z.string().max(120).nullable().optional(),
  providerRequestId: z.string().max(200).nullable().optional(),
  provider: z.string().max(80).nullable().optional(),
  receiptDate: z.iso.date().nullable().optional(),
  subtotalMinor: z.number().int().nonnegative().nullable().optional(),
  taxMinor: z.number().int().nonnegative().nullable().optional(),
  tipMinor: z.number().int().nonnegative().nullable().optional(),
  totalMinor: z.number().int().positive().nullable().optional(),
});

export class ReceiptExtractionError extends Error {
  constructor(code, { retryable = true } = {}) {
    super(code);
    this.code = code;
    this.retryable = retryable;
  }
}

export function normalizeReceiptExtraction(input, billCurrency) {
  const parsed = receiptExtractionSchema.safeParse(input);
  if (!parsed.success)
    throw new ReceiptExtractionError("invalid_provider_response");
  const draft = parsed.data;
  return {
    currency: draft.currency ?? billCurrency,
    discountMinor: draft.discountMinor ?? 0,
    items: draft.items.map((item, position) => ({
      confidenceBasisPoints: item.confidenceBasisPoints ?? null,
      description: item.description?.trim() || "Review this item",
      needsReview:
        !item.description?.trim() ||
        item.confidenceBasisPoints === null ||
        item.confidenceBasisPoints === undefined ||
        item.confidenceBasisPoints < 8_000,
      position,
      quantity: item.quantity ?? 1,
      totalMinor: item.totalMinor,
      unitPriceMinor: item.unitPriceMinor ?? null,
    })),
    merchantName: draft.merchantName?.trim() || null,
    providerRequestId: draft.providerRequestId ?? null,
    provider: draft.provider ?? "unknown",
    receiptDate: draft.receiptDate ?? null,
    subtotalMinor: draft.subtotalMinor ?? null,
    taxMinor: draft.taxMinor ?? 0,
    tipMinor: draft.tipMinor ?? 0,
    totalMinor: draft.totalMinor ?? null,
  };
}

function developmentFixture(mode) {
  if (mode === "failed") {
    throw new ReceiptExtractionError("dev_fixture_failure");
  }
  if (mode === "partial") {
    return {
      currency: "USD",
      items: [
        {
          confidenceBasisPoints: 4200,
          description: null,
          quantity: 1,
          totalMinor: 725,
          unitPriceMinor: null,
        },
      ],
      merchantName: null,
      provider: "development-fixture",
      providerRequestId: "development-partial",
      receiptDate: null,
      subtotalMinor: null,
      taxMinor: 0,
      tipMinor: 0,
      totalMinor: null,
    };
  }
  if (mode === "success") {
    return {
      currency: "USD",
      discountMinor: 0,
      items: [
        {
          confidenceBasisPoints: 9700,
          description: "Noodles",
          quantity: 1,
          totalMinor: 501,
          unitPriceMinor: 501,
        },
        {
          confidenceBasisPoints: 9300,
          description: "Drinks",
          quantity: 2,
          totalMinor: 500,
          unitPriceMinor: 250,
        },
      ],
      merchantName: "Development fixture",
      provider: "development-fixture",
      providerRequestId: "development-success",
      receiptDate: "2026-08-16",
      subtotalMinor: 1001,
      taxMinor: 80,
      tipMinor: 119,
      totalMinor: 1200,
    };
  }
  return null;
}

async function prepareOcrSpaceImage(bytes, mimeType) {
  try {
    const convert = (edge, quality) =>
      sharp(bytes, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({
          fit: "inside",
          height: edge,
          width: edge,
          withoutEnlargement: true,
        })
        .flatten({ background: "white" })
        .sharpen()
        .jpeg({ mozjpeg: true, quality })
        .toBuffer();
    let output = await convert(2_200, 82);
    if (output.length > 950_000) {
      output = await convert(1_600, 65);
    }
    if (output.length > 1_000_000) {
      throw new ReceiptExtractionError("ocr_space_file_too_large", {
        retryable: false,
      });
    }
    return { bytes: output, filename: "receipt.jpg", mimeType: "image/jpeg" };
  } catch (error) {
    if (
      !(error instanceof ReceiptExtractionError) &&
      ["image/jpeg", "image/png"].includes(mimeType) &&
      bytes.length <= 1_000_000
    ) {
      return {
        bytes,
        filename: mimeType === "image/png" ? "receipt.png" : "receipt.jpg",
        mimeType,
      };
    }
    if (error instanceof ReceiptExtractionError) throw error;
    throw new ReceiptExtractionError("image_conversion_failed", {
      retryable: false,
    });
  }
}

const ocrSpaceResponse = z.object({
  ErrorMessage: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
  IsErroredOnProcessing: z.boolean().optional(),
  OCRExitCode: z.coerce.number().optional(),
  ParsedResults: z
    .array(
      z.object({
        ErrorMessage: z.string().nullable().optional(),
        ParsedText: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

export async function extractReceiptImage({ billCurrency, bytes, mimeType }) {
  if (process.env.NODE_ENV !== "production") {
    const fixture = developmentFixture(
      process.env.RECEIPT_EXTRACTION_DEV_FIXTURE,
    );
    if (fixture) return fixture;
  }
  const apiKey =
    process.env.OCR_SPACE_API_KEY ?? process.env.RECEIPT_EXTRACTION_API_KEY;
  if (!apiKey) {
    throw new ReceiptExtractionError("provider_not_configured", {
      retryable: false,
    });
  }

  const prepared = await prepareOcrSpaceImage(bytes, mimeType);
  const body = new FormData();
  body.set(
    "file",
    new Blob([prepared.bytes], { type: prepared.mimeType }),
    prepared.filename,
  );
  body.set("language", "auto");
  body.set("isOverlayRequired", "false");
  body.set("detectOrientation", "true");
  body.set("scale", "true");
  body.set("isTable", "true");
  body.set("OCREngine", "2");

  let response;
  try {
    response = await fetch(
      process.env.OCR_SPACE_API_URL ?? "https://api.ocr.space/parse/image",
      {
        body,
        headers: { apikey: apiKey },
        method: "POST",
        signal: AbortSignal.timeout(60_000),
      },
    );
  } catch {
    throw new ReceiptExtractionError("provider_unavailable");
  }
  if (!response.ok) {
    throw new ReceiptExtractionError(
      response.status === 429 ? "provider_rate_limited" : "provider_failed",
    );
  }
  const parsed = ocrSpaceResponse.safeParse(await response.json());
  if (
    !parsed.success ||
    parsed.data.IsErroredOnProcessing ||
    (parsed.data.OCRExitCode ?? 3) >= 3
  ) {
    throw new ReceiptExtractionError("provider_failed");
  }
  const text = parsed.data.ParsedResults?.map(
    (result) => result.ParsedText ?? "",
  )
    .join("\n")
    .trim();
  if (!text) throw new ReceiptExtractionError("no_text_detected");
  return parseReceiptText(text, billCurrency);
}
