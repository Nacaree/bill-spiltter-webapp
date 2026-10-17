import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import jsQR from "jsqr";
import sharp from "sharp";
import { parseMoneyToMinor } from "@/lib/money";

export class PaymentQrError extends Error {}

function invalid(
  message = "Upload a readable ABA KHQR image with USD or KHR currency.",
) {
  throw new PaymentQrError(message);
}

// KHQR uses EMV tag/length/value fields and CRC-16/CCITT-FALSE.
// See NBC's KHQR SDK documentation (linked in README).
function fields(text) {
  const result = new Map();
  let offset = 0;
  while (offset < text.length) {
    const header = text.slice(offset, offset + 4);
    if (!/^\d{4}$/.test(header)) invalid();
    const tag = header.slice(0, 2);
    const length = Number(header.slice(2));
    if (!length || offset + 4 + length > text.length || result.has(tag))
      invalid();
    result.set(tag, text.slice(offset + 4, offset + 4 + length));
    offset += 4 + length;
  }
  return result;
}

export function khqrChecksum(text) {
  let crc = 0xffff;
  for (const byte of Buffer.from(text, "utf8")) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function decodePaymentQr(payload, now = Date.now()) {
  if (
    typeof payload !== "string" ||
    payload.length > 4000 ||
    !/6304[\dA-Fa-f]{4}$/.test(payload)
  )
    invalid();
  const tags = fields(payload);
  if (
    tags.get("63")?.toUpperCase() !== khqrChecksum(payload.slice(0, -4)) ||
    tags.get("00") !== "01" ||
    tags.get("58") !== "KH"
  )
    invalid();
  if (tags.has("29") === tags.has("30")) invalid();
  const account = fields(tags.get("29") ?? tags.get("30"));
  if (!/^[^\s@]+@[^\s@]+$/.test(account.get("00") ?? "")) invalid();
  const currency = { 840: "USD", 116: "KHR" }[tags.get("53")];
  const recipientLabel = tags.get("59")?.trim();
  if (
    !currency ||
    !recipientLabel ||
    recipientLabel.length > 100 ||
    !/^\d{4}$/.test(tags.get("52") ?? "") ||
    !tags.get("60")
  )
    invalid();
  if (tags.has("01") && !["11", "12"].includes(tags.get("01"))) invalid();
  // Additional fees could make the bank's amount differ from the settlement.
  if (["55", "56", "57"].some((tag) => tags.has(tag)))
    invalid("Use a QR without automatic fees or tips.");
  let fixedAmountMinor = null;
  if (tags.has("54")) {
    try {
      fixedAmountMinor = parseMoneyToMinor(tags.get("54"), currency);
    } catch {
      invalid("The QR has an invalid fixed amount.");
    }
  }
  const timestamps = tags.has("99") ? fields(tags.get("99")) : new Map();
  const expiry = timestamps.get("01");
  if (expiry && !/^\d{13}$/.test(expiry)) invalid();
  if (timestamps.get("00") && !/^\d{13}$/.test(timestamps.get("00"))) invalid();
  const expiresAt = expiry ? new Date(Number(expiry)).toISOString() : null;
  if (expiry && Number(expiry) <= now)
    invalid("This QR has expired. Upload an amount-free QR from ABA.");
  if (tags.get("01") === "12" && (!fixedAmountMinor || !expiry))
    invalid(
      "This dynamic QR is missing an amount or expiry. Use an amount-free QR.",
    );
  return {
    currency,
    recipientLabel,
    fixedAmountMinor,
    expiresAt,
    payloadHash: createHash("sha256").update(payload).digest("hex"),
  };
}

export function paymentQrEligible(
  method,
  { toParticipantId, amountMinor, currency },
  now = Date.now(),
) {
  return Boolean(
    method &&
    method.owner_participant_id === toParticipantId &&
    method.supported_currencies.includes(currency) &&
    (!method.expires_at || new Date(method.expires_at).getTime() > now) &&
    (method.fixed_amount_minor === null ||
      method.fixed_amount_minor === amountMinor),
  );
}

export async function inspectPaymentQr(file) {
  if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024)
    invalid("Choose a JPEG or PNG QR image, up to 10 MB.");
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(bytes, {
      limitInputPixels: 20_000_000,
    }).metadata();
    if (!["jpeg", "png"].includes(metadata.format) || (metadata.pages ?? 1) > 1)
      invalid("Choose a single JPEG or PNG image.");
    const { data, info } = await sharp(bytes, { limitInputPixels: 20_000_000 })
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "white" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(data);
    const code = jsQR(pixels, info.width, info.height, {
      inversionAttempts: "attemptBoth",
    });
    if (!code) invalid();
    const details = decodePaymentQr(code.data);
    const corners = [
      code.location.topLeftCorner,
      code.location.topRightCorner,
      code.location.bottomLeftCorner,
      code.location.bottomRightCorner,
    ];
    const left = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.x))));
    const top = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.y))));
    const right = Math.min(
      info.width,
      Math.ceil(Math.max(...corners.map((p) => p.x))),
    );
    const bottom = Math.min(
      info.height,
      Math.ceil(Math.max(...corners.map((p) => p.y))),
    );
    // Remove the first symbol and search again, including for identical copies.
    for (let y = top; y < bottom; y++)
      pixels.fill(
        255,
        (y * info.width + left) * 4,
        (y * info.width + right) * 4,
      );
    if (
      jsQR(pixels, info.width, info.height, {
        inversionAttempts: "attemptBoth",
      })
    )
      invalid("Upload an image containing exactly one QR code.");
    const image = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .extract({ left, top, width: right - left, height: bottom - top })
      .extend({ top: 32, bottom: 32, left: 32, right: 32, background: "white" })
      .png()
      .toBuffer();
    if (image.length > 2 * 1024 * 1024)
      invalid("The cropped QR is too large. Try a smaller image.");
    // Ensure cropping retained a readable symbol with the original payload.
    const cropped = await sharp(image)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (
      jsQR(
        new Uint8ClampedArray(cropped.data),
        cropped.info.width,
        cropped.info.height,
      )?.data !== code.data
    )
      invalid("Try an upright, clearer QR image.");
    return { ...details, image };
  } catch (error) {
    if (error instanceof PaymentQrError) throw error;
    invalid(
      "We couldn’t read this image. Upload a clear JPEG or PNG QR image.",
    );
  }
}

export function signQrPreview(
  details,
  { billId, ownerId, image, secret, now = Date.now() },
) {
  const payload = Buffer.from(
    JSON.stringify({
      ...details,
      billId,
      ownerId,
      imageHash: createHash("sha256").update(image).digest("hex"),
      expires: now + 10 * 60_000,
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update("payment-qr-preview:").update(payload).digest("base64url")}`;
}

export function verifyQrPreview(
  token,
  { billId, ownerId, image, secret, now = Date.now() },
) {
  try {
    if (typeof token !== "string" || token.length > 10000) invalid();
    const [payload, signature, extra] = token.split(".");
    const expected = createHmac("sha256", secret)
      .update("payment-qr-preview:")
      .update(payload)
      .digest();
    const supplied = Buffer.from(signature, "base64url");
    if (
      extra ||
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      invalid();
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      data.billId !== billId ||
      data.ownerId !== ownerId ||
      data.expires <= now ||
      data.imageHash !== createHash("sha256").update(image).digest("hex")
    )
      invalid();
    return data;
  } catch {
    invalid("This QR preview expired or changed. Inspect the image again.");
  }
}
