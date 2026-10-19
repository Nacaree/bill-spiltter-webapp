import { z } from "zod";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_UPLOAD_BUCKET = "image-upload-staging";
export class ImageUploadError extends Error {
  constructor(message, { resetUpload = false } = {}) {
    super(message);
    this.resetUpload = resetUpload;
  }
}

const metadataSchema = z.object({
  shareToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  purpose: z.enum(["receipt", "owner_qr"]),
  filename: z.string().min(1).max(200),
  size: z.number().int().positive().max(MAX_IMAGE_BYTES),
  mimeType: z.string().max(100),
});

export function parseImageUploadMetadata(input) {
  const parsed = metadataSchema.safeParse(input);
  if (!parsed.success)
    throw new ImageUploadError("Choose an image up to 10 MB and try again.");
  const data = parsed.data;
  const byExtension = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    heic: "image/heic",
    heif: "image/heif",
  };
  const mimeType =
    data.mimeType ||
    byExtension[data.filename.split(".").at(-1)?.toLowerCase()];
  const allowed =
    data.purpose === "receipt"
      ? Object.values(byExtension)
      : ["image/jpeg", "image/png"];
  if (!allowed.includes(mimeType))
    throw new ImageUploadError(
      data.purpose === "receipt"
        ? "Choose a JPEG, PNG, or HEIC receipt."
        : "Choose a JPEG or PNG QR image.",
    );
  return {
    ...data,
    mimeType,
    filename:
      data.filename.replace(/[\u0000-\u001f\u007f]/g, "").trim() || "image",
  };
}

export function validUploadId(value) {
  if (!z.uuid().safeParse(value).success)
    throw new ImageUploadError(
      "This upload is invalid. Choose the image again.",
      { resetUpload: true },
    );
  return value;
}
