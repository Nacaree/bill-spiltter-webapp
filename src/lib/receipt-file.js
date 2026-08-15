const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const MAX_RECEIPT_EDGE = 20_000;
const MAX_RECEIPT_PIXELS = 40_000_000;

export class ReceiptFileError extends Error {}

function uint32(bytes, offset) {
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function pngDimensions(bytes) {
  return { height: uint32(bytes, 20), width: uint32(bytes, 16) };
}

function jpegDimensions(bytes) {
  const startOfFrame = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (startOfFrame.has(marker)) {
      return {
        height: bytes[offset + 5] * 256 + bytes[offset + 6],
        width: bytes[offset + 7] * 256 + bytes[offset + 8],
      };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = bytes[offset + 2] * 256 + bytes[offset + 3];
    if (length < 2) break;
    offset += length + 2;
  }
  throw new ReceiptFileError("We couldn’t read this JPEG’s dimensions.");
}

function heicDimensions(bytes) {
  for (let offset = 4; offset + 12 <= bytes.length; offset += 1) {
    if (
      bytes[offset] === 0x69 &&
      bytes[offset + 1] === 0x73 &&
      bytes[offset + 2] === 0x70 &&
      bytes[offset + 3] === 0x65
    ) {
      return {
        height: uint32(bytes, offset + 8),
        width: uint32(bytes, offset + 4),
      };
    }
  }
  throw new ReceiptFileError("We couldn’t read this HEIC image’s dimensions.");
}

function detectedType(bytes) {
  if (
    bytes.length >= 24 &&
    bytes
      .slice(0, 8)
      .every(
        (value, index) =>
          value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index],
      )
  ) {
    const hasEndChunk = bytes.some(
      (_, index) =>
        bytes[index] === 0x49 &&
        bytes[index + 1] === 0x45 &&
        bytes[index + 2] === 0x4e &&
        bytes[index + 3] === 0x44,
    );
    if (!hasEndChunk)
      throw new ReceiptFileError("This PNG image is incomplete or corrupt.");
    return {
      extension: "png",
      mimeType: "image/png",
      dimensions: pngDimensions,
    };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    const hasEndMarker = bytes.some(
      (_, index) => bytes[index] === 0xff && bytes[index + 1] === 0xd9,
    );
    if (!hasEndMarker) {
      throw new ReceiptFileError("This JPEG image is incomplete or corrupt.");
    }
    return {
      extension: "jpg",
      mimeType: "image/jpeg",
      dimensions: jpegDimensions,
    };
  }
  if (
    bytes.length >= 20 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
    ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(
      String.fromCharCode(...bytes.slice(8, 12)),
    )
  ) {
    return {
      extension: "heic",
      mimeType: "image/heic",
      dimensions: heicDimensions,
    };
  }
  throw new ReceiptFileError("Upload a valid JPEG, PNG, or HEIC image.");
}

export async function validateReceiptFile(file) {
  if (!(file instanceof File) || file.size === 0) {
    throw new ReceiptFileError("Choose a receipt image to upload.");
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new ReceiptFileError("Receipt images must be 10 MB or smaller.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectedType(bytes);
  const { height, width } = detected.dimensions(bytes);
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_RECEIPT_EDGE ||
    height > MAX_RECEIPT_EDGE ||
    width * height > MAX_RECEIPT_PIXELS
  ) {
    throw new ReceiptFileError("The receipt image dimensions are too large.");
  }
  return {
    bytes,
    extension: detected.extension,
    height,
    mimeType: detected.mimeType,
    width,
  };
}
