// @vitest-environment node
import { randomBytes } from "node:crypto";
import { beforeAll, expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("@/app/image-upload-actions", () => ({
  prepareImageUploadAction: vi.fn(),
  completeImageUploadAction: vi.fn(),
}));
import { directImageUpload } from "@/lib/direct-image-upload";
import { validateReceiptFile } from "@/lib/receipt-file";
import { parseImageUploadMetadata } from "@/lib/image-upload";

let file;
const uploadId = "11111111-1111-4111-8111-111111111111";
beforeAll(async () => {
  const image = await sharp(randomBytes(1500 * 1500 * 3), {
    raw: { width: 1500, height: 1500, channels: 3 },
  })
    .png()
    .toBuffer();
  file = new File([image], "large-receipt.png", { type: "image/png" });
});
function setup() {
  let reservation;
  const stages = [];
  const prepare = vi.fn().mockResolvedValue({
    upload: {
      uploadId,
      bucket: "image-upload-staging",
      path: "bill/upload",
      token: "upload-only",
      mimeType: "image/png",
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    },
  });
  const complete = vi.fn().mockResolvedValue({
    result: { receiptScanId: uploadId, purpose: "receipt" },
  });
  const upload = vi.fn().mockResolvedValue({ error: null });
  const storage = () => ({
    storage: { from: () => ({ uploadToSignedUrl: upload }) },
  });
  const input = () => ({
    file,
    shareToken: "a".repeat(43),
    purpose: "receipt",
    reservation,
    onReservation: (r) => {
      reservation = r;
    },
    onStage: (s) => stages.push(s),
  });
  return { input, prepare, complete, upload, storage, stages };
}
it("sends a valid >4.5 MB image only to storage and sends only metadata/ID to server actions", async () => {
  expect(file.size).toBeGreaterThan(4.5 * 1024 * 1024);
  expect(file.size).toBeLessThanOrEqual(10 * 1024 * 1024);
  expect(await validateReceiptFile(file)).toMatchObject({
    width: 1500,
    height: 1500,
  });
  const t = setup();
  expect(await directImageUpload(t.input(), t)).toMatchObject({
    receiptScanId: uploadId,
  });
  expect(t.prepare).toHaveBeenCalledWith({
    filename: file.name,
    size: file.size,
    mimeType: "image/png",
    purpose: "receipt",
    shareToken: "a".repeat(43),
  });
  expect(JSON.stringify(t.prepare.mock.calls[0]).length).toBeLessThan(1024);
  expect(t.upload).toHaveBeenCalledWith("bill/upload", "upload-only", file, {
    contentType: "image/png",
  });
  expect(t.complete).toHaveBeenCalledWith(uploadId);
  expect(t.stages).toEqual(["preparing", "uploading", "processing"]);
});
it("retries an interrupted upload with its original reservation and recovers a lost success response", async () => {
  const t = setup();
  t.upload.mockResolvedValueOnce({ error: { statusCode: "503" } });
  await expect(directImageUpload(t.input(), t)).rejects.toThrow(/connection/);
  expect(t.complete).not.toHaveBeenCalled();
  t.upload.mockResolvedValueOnce({ error: { statusCode: "409" } });
  await directImageUpload(t.input(), t);
  expect(t.prepare).toHaveBeenCalledOnce();
  expect(t.complete).toHaveBeenCalledOnce();
});
it("does not upload again when completion failed after the upload succeeded", async () => {
  const t = setup();
  t.complete.mockResolvedValueOnce({
    error: "Try again shortly.",
    resetUpload: false,
  });
  await expect(directImageUpload(t.input(), t)).rejects.toThrow(/shortly/);
  await directImageUpload(t.input(), t);
  expect(t.upload).toHaveBeenCalledOnce();
  expect(t.complete).toHaveBeenCalledTimes(2);
});
it("rejects over-limit images before any server or storage call", async () => {
  const t = setup();
  const oversized = new File(
    [new Uint8Array(10 * 1024 * 1024 + 1)],
    "large.png",
    { type: "image/png" },
  );
  await expect(
    directImageUpload({ ...t.input(), file: oversized }, t),
  ).rejects.toThrow(/10 MB/);
  expect(t.prepare).not.toHaveBeenCalled();
  expect(t.upload).not.toHaveBeenCalled();
});
it("accepts the exact 10 MB boundary and preserves receipt versus QR format restrictions", () => {
  const metadata = {
    shareToken: "a".repeat(43),
    purpose: "receipt",
    filename: "image.HEIC",
    size: 10 * 1024 * 1024,
    mimeType: "",
  };
  expect(parseImageUploadMetadata(metadata).mimeType).toBe("image/heic");
  expect(() =>
    parseImageUploadMetadata({ ...metadata, purpose: "owner_qr" }),
  ).toThrow(/JPEG or PNG/);
  expect(() =>
    parseImageUploadMetadata({ ...metadata, size: metadata.size + 1 }),
  ).toThrow(/10 MB/);
});
