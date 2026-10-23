// @vitest-environment node
import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import sharp from "sharp";
import {
  confirmedQrCurrencies,
  decodePaymentQr,
  inspectPaymentQr,
  khqrChecksum,
  paymentQrEligible,
  signQrPreview,
  verifyQrPreview,
} from "@/lib/payment-qr";

function tag(id, value) {
  return id + String(value.length).padStart(2, "0") + value;
}
function payload({
  currency = "840",
  amount,
  extra = "",
  dynamic = false,
  expiry = Date.now() + 600_000,
} = {}) {
  const text =
    tag("00", "01") +
    tag("01", dynamic ? "12" : "11") +
    tag("29", tag("00", "phase3@example")) +
    tag("52", "5999") +
    tag("53", currency) +
    (amount ? tag("54", amount) : "") +
    tag("58", "KH") +
    tag("59", "Test Owner") +
    tag("60", "Phnom Penh") +
    extra +
    (dynamic
      ? tag("99", tag("00", String(Date.now())) + tag("01", String(expiry)))
      : "") +
    "6304";
  return text + khqrChecksum(text);
}
const method = {
  owner_participant_id: "owner",
  supported_currencies: ["USD"],
  fixed_amount_minor: null,
  expires_at: null,
};

describe("payment QR validation", () => {
  it("supports owner-confirmed currency choices without treating a default currency as automatic dual support", () => {
    const khr = decodePaymentQr(payload({ currency: "116" }));
    expect(confirmedQrCurrencies(khr)).toEqual(["KHR"]);
    expect(confirmedQrCurrencies(khr, "dual")).toEqual(["KHR", "USD"]);
    expect(() => confirmedQrCurrencies(khr, "anything")).toThrow();
    const fixed = decodePaymentQr(payload({ currency: "116", amount: "4500" }));
    expect(() => confirmedQrCurrencies(fixed, "dual")).toThrow(/fixed-amount/);
    expect(confirmedQrCurrencies(fixed, "single")).toEqual(["KHR"]);
    const dualMethod = { ...method, supported_currencies: ["KHR", "USD"] };
    expect(
      paymentQrEligible(dualMethod, {
        toParticipantId: "owner",
        currency: "USD",
        amountMinor: 100,
      }),
    ).toBe(true);
    expect(
      paymentQrEligible(dualMethod, {
        toParticipantId: "owner",
        currency: "KHR",
        amountMinor: 4000,
      }),
    ).toBe(true);
  });
  it("decodes USD and KHR and respects fixed amounts and expiry", () => {
    expect(decodePaymentQr(payload())).toMatchObject({
      currency: "USD",
      recipientLabel: "Test Owner",
      fixedAmountMinor: null,
    });
    expect(
      decodePaymentQr(payload({ currency: "116", amount: "4500" })),
    ).toMatchObject({ currency: "KHR", fixedAmountMinor: 4500 });
    expect(
      decodePaymentQr(payload({ amount: "12.34", dynamic: true })),
    ).toMatchObject({ fixedAmountMinor: 1234 });
    expect(() =>
      decodePaymentQr(
        payload({ amount: "12.34", dynamic: true, expiry: Date.now() - 1000 }),
      ),
    ).toThrow(/expired/);
  });
  it("rejects corrupt checksums, duplicate tags, unsupported currencies and fractional riel", () => {
    expect(() => decodePaymentQr(payload().slice(0, -4) + "FFFF")).toThrow();
    expect(() =>
      decodePaymentQr(payload({ extra: tag("59", "Other") })),
    ).toThrow();
    expect(() => decodePaymentQr(payload({ currency: "978" }))).toThrow();
    expect(() =>
      decodePaymentQr(payload({ currency: "116", amount: "1.50" })),
    ).toThrow();
    expect(() => decodePaymentQr("https://example.com")).toThrow();
    expect(() => decodePaymentQr(payload({ extra: tag("55", "01") }))).toThrow(
      /fees/,
    );
  });
  it("only offers the owner's QR for the right recipient, currency, amount and lifetime", () => {
    const t = { toParticipantId: "owner", currency: "USD", amountMinor: 1234 };
    expect(paymentQrEligible(method, t)).toBe(true);
    expect(paymentQrEligible(method, { ...t, toParticipantId: "other" })).toBe(
      false,
    );
    expect(paymentQrEligible(method, { ...t, currency: "KHR" })).toBe(false);
    expect(paymentQrEligible({ ...method, fixed_amount_minor: 1235 }, t)).toBe(
      false,
    );
    expect(paymentQrEligible({ ...method, expires_at: "2020-01-01" }, t)).toBe(
      false,
    );
  });
  it("binds a preview to its image, bill, owner and ten-minute lifetime", () => {
    const image = Buffer.from("image");
    const options = {
      image,
      billId: "bill",
      ownerId: "owner",
      secret: "x".repeat(32),
      now: 1000,
    };
    const token = signQrPreview(decodePaymentQr(payload()), options);
    expect(verifyQrPreview(token, options).recipientLabel).toBe("Test Owner");
    for (const changed of [
      { billId: "other" },
      { ownerId: "other" },
      { image: Buffer.from("changed") },
      { now: 601001 },
    ])
      expect(() =>
        verifyQrPreview(token, { ...options, ...changed }),
      ).toThrow();
    expect(() => verifyQrPreview(token + "x", options)).toThrow();
  });
  it("requires reinspection after the current signing key changes, even with a participant fallback", () => {
    const details = decodePaymentQr(payload());
    const options = {
      image: Buffer.from("disposable image"),
      billId: "bill",
      ownerId: "owner",
      secret: "old-disposable-session-key-32-characters",
      now: 1000,
    };
    const oldPreview = signQrPreview(details, options);
    const changed = {
      ...options,
      secret: "new-disposable-session-key-32-characters",
    };
    expect(() => verifyQrPreview(oldPreview, changed)).toThrow(
      /Inspect the image again/,
    );
    const reinspected = signQrPreview(details, changed);
    expect(verifyQrPreview(reinspected, changed)).toMatchObject(details);
    expect(() => verifyQrPreview(reinspected, options)).toThrow();
  });
  it("reads, crops and rechecks a real bitmap and rejects blank/corrupt files", async () => {
    const image = await QRCode.toBuffer(payload(), { width: 500 });
    const result = await inspectPaymentQr(new File([image], "qr.png"));
    expect(result).toMatchObject({
      currency: "USD",
      recipientLabel: "Test Owner",
    });
    expect((await sharp(result.image).metadata()).format).toBe("png");
    const blank = await sharp({
      create: { width: 300, height: 300, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(
      inspectPaymentQr(new File([blank], "blank.png")),
    ).rejects.toThrow(/readable/);
    await expect(inspectPaymentQr(new File(["bad"], "qr.png"))).rejects.toThrow(
      /read/,
    );
  });
  it("rejects an image with multiple QR symbols, even identical ones", async () => {
    const image = await QRCode.toBuffer(payload(), { width: 400 });
    const double = await sharp({
      create: { width: 900, height: 450, channels: 3, background: "white" },
    })
      .composite([
        { input: image, top: 25, left: 20 },
        { input: image, top: 25, left: 470 },
      ])
      .png()
      .toBuffer();
    await expect(
      inspectPaymentQr(new File([double], "double.png")),
    ).rejects.toThrow();
  });
});
