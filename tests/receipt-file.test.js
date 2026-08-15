import { describe, expect, it } from "vitest";
import { ReceiptFileError, validateReceiptFile } from "@/lib/receipt-file";

function png({ height = 20, width = 10, withEnd = true } = {}) {
  const bytes = new Uint8Array(36);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set(
    [
      (width >>> 24) & 255,
      (width >>> 16) & 255,
      (width >>> 8) & 255,
      width & 255,
      (height >>> 24) & 255,
      (height >>> 16) & 255,
      (height >>> 8) & 255,
      height & 255,
    ],
    16,
  );
  if (withEnd) bytes.set([0x49, 0x45, 0x4e, 0x44], 28);
  return new File([bytes], "receipt.png", { type: "image/png" });
}

describe("receipt image validation", () => {
  it("uses the decoded signature and dimensions instead of the browser MIME", async () => {
    const file = png();
    Object.defineProperty(file, "type", { value: "text/plain" });

    await expect(validateReceiptFile(file)).resolves.toMatchObject({
      height: 20,
      mimeType: "image/png",
      width: 10,
    });
  });

  it("rejects an incomplete image with a valid-looking signature", async () => {
    await expect(
      validateReceiptFile(png({ withEnd: false })),
    ).rejects.toBeInstanceOf(ReceiptFileError);
  });

  it("rejects excessive decoded dimensions", async () => {
    await expect(
      validateReceiptFile(png({ height: 20_001, width: 10 })),
    ).rejects.toThrow("dimensions are too large");
  });
});
