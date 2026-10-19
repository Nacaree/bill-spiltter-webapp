// @vitest-environment node
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createParticipantSession } from "@/lib/participant-session";
import { hashAccessToken } from "@/lib/access-tokens";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  download: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  sign: vi.fn(),
  bill: vi.fn(),
  actor: vi.fn(),
  creator: vi.fn(),
  preview: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({
    rpc: mocks.rpc,
    from: mocks.from,
    storage: {
      from: (bucket) => ({
        download: mocks.download,
        upload: mocks.upload,
        remove: (keys) => mocks.remove(bucket, keys),
        createSignedUploadUrl: mocks.sign,
      }),
    },
  }),
}));
vi.mock("@/server/bills", () => ({
  getBillByShareToken: mocks.bill,
  getSessionParticipant: mocks.actor,
  ParticipantSessionRequiredError: class extends Error {},
}));
vi.mock("@/server/payment-methods", () => ({
  requireCreator: mocks.creator,
  createOwnerQrPreview: mocks.preview,
}));
vi.mock("@/server/settlements", () => ({
  phaseThreeError: (error) => new Error(error.message),
}));
import {
  prepareImageUpload,
  completeImageUpload,
  cleanupImageUploads,
} from "@/server/image-uploads";

const id = "11111111-1111-4111-8111-111111111111";
const billId = "22222222-2222-4222-8222-222222222222";
const actorId = "33333333-3333-4333-8333-333333333333";
const secret = "direct-image-upload-test-secret-long-enough";
let image;
let reservation;
let query;
let changed;
let cleanupRows;
beforeAll(async () => {
  image = await sharp(randomBytes(1500 * 1500 * 3), {
    raw: { width: 1500, height: 1500, channels: 3 },
  })
    .png()
    .toBuffer();
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PARTICIPANT_SESSION_SECRET", secret);
  reservation = {
    id,
    bill_id: billId,
    bill_currency: "USD",
    participant_id: actorId,
    purpose: "receipt",
    status: "finalizing",
    acquired: true,
    lease_id: "lease",
    filename: "image.png",
    size_bytes: image.length,
    mime_type: "image/png",
    storage_key: `${billId}/${id}`,
  };
  cleanupRows = [];
  changed = [{ id }];
  query = {
    select: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(async () => ({ data: cleanupRows })),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ error: null }),
    then: (resolve) => resolve({ data: changed, error: null }),
  };
  mocks.from.mockReturnValue(query);
  mocks.bill.mockResolvedValue({ id: billId, currency: "USD" });
  mocks.actor.mockResolvedValue({ id: actorId });
  mocks.creator.mockResolvedValue({
    bill: { id: billId, currency: "USD" },
    actor: { id: actorId },
  });
  mocks.rpc.mockImplementation(async (name) => ({
    data:
      name === "claim_image_upload"
        ? reservation
        : name === "finish_receipt_upload"
          ? { scan_id: id, should_process: true }
          : null,
    error: null,
  }));
  mocks.download.mockImplementation(async () => ({ data: new Blob([image]) }));
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.sign.mockResolvedValue({ data: { token: "upload-only-token" } });
  mocks.preview.mockResolvedValue({
    recipientLabel: "Owner",
    currency: "KHR",
    token: "signed-preview",
  });
});
afterEach(() => vi.unstubAllEnvs());
function access() {
  return {
    cookieValue: createParticipantSession({
      billId,
      participantId: actorId,
      secret,
      sessionToken: "s".repeat(43),
    }).value,
    recoveryToken: "r".repeat(43),
  };
}

it("prepares metadata-only grants with a private generated path and overwrite disabled", async () => {
  const ticket = await prepareImageUpload({
    ...access(),
    shareToken: "a".repeat(43),
    purpose: "receipt",
    filename: "image.png",
    size: image.length,
    mimeType: "image/png",
  });
  expect(ticket.bucket).toBe("image-upload-staging");
  expect(ticket.path).toBe(`${billId}/${ticket.uploadId}`);
  expect(mocks.sign).toHaveBeenCalledWith(ticket.path, { upsert: false });
  expect(mocks.upload).not.toHaveBeenCalled();
  expect(query.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      bill_id: billId,
      participant_id: actorId,
      size_bytes: image.length,
    }),
  );
});
it("refuses non-members and non-owners before issuing storage tokens", async () => {
  mocks.actor.mockResolvedValue(null);
  await expect(
    prepareImageUpload({
      ...access(),
      shareToken: "a".repeat(43),
      purpose: "receipt",
      filename: "image.png",
      size: image.length,
      mimeType: "image/png",
    }),
  ).rejects.toThrow();
  mocks.creator.mockRejectedValue(new Error("Creator required"));
  await expect(
    prepareImageUpload({
      ...access(),
      shareToken: "a".repeat(43),
      purpose: "owner_qr",
      filename: "image.png",
      size: image.length,
      mimeType: "image/png",
    }),
  ).rejects.toThrow(/Creator/);
  expect(mocks.sign).not.toHaveBeenCalled();
});
it("validates a >4.5 MB image from storage and commits its scan before deleting staging", async () => {
  const result = await completeImageUpload({ uploadId: id, ...access() });
  expect(result).toEqual({
    purpose: "receipt",
    receiptScanId: id,
    shouldProcess: true,
  });
  expect(mocks.rpc).toHaveBeenCalledWith(
    "claim_image_upload",
    expect.objectContaining({
      target_upload_id: id,
      actor_participant_id: actorId,
      actor_session_hash: hashAccessToken("s".repeat(43)),
      recovery_hash: hashAccessToken("r".repeat(43)),
    }),
  );
  expect(mocks.rpc).toHaveBeenCalledWith(
    "finish_receipt_upload",
    expect.objectContaining({
      validated_width: 1500,
      validated_height: 1500,
      target_lease_id: "lease",
    }),
  );
  expect(mocks.remove).toHaveBeenCalledWith("image-upload-staging", [
    reservation.storage_key,
  ]);
  expect(mocks.upload.mock.calls[0][1].length).toBe(image.length);
});
it("returns the completed scan without downloading or scheduling twice", async () => {
  reservation = {
    ...reservation,
    status: "complete",
    acquired: false,
    receipt_scan_id: id,
  };
  expect(await completeImageUpload({ uploadId: id, ...access() })).toEqual({
    purpose: "receipt",
    receiptScanId: id,
    shouldProcess: false,
  });
  expect(mocks.download).not.toHaveBeenCalled();
  expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual([
    "claim_image_upload",
  ]);
});
it("rejects corrupt content, removes it, and asks the client for a new grant", async () => {
  reservation.size_bytes = 3;
  mocks.download.mockResolvedValue({ data: new Blob(["bad"]) });
  await expect(
    completeImageUpload({ uploadId: id, ...access() }),
  ).rejects.toMatchObject({ resetUpload: true });
  expect(query.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: "rejected" }),
  );
  expect(mocks.remove).toHaveBeenCalledWith("image-upload-staging", [
    reservation.storage_key,
  ]);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("rejects a forged MIME type based on the actual stored bytes", async () => {
  const jpeg = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  reservation.size_bytes = jpeg.length;
  mocks.download.mockResolvedValue({ data: new Blob([jpeg]) });
  await expect(
    completeImageUpload({ uploadId: id, ...access() }),
  ).rejects.toMatchObject({ resetUpload: true });
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("preserves staging for transient errors and recovers an image upload lost after storing final bytes", async () => {
  mocks.upload.mockResolvedValueOnce({ error: { statusCode: "503" } });
  await expect(
    completeImageUpload({ uploadId: id, ...access() }),
  ).rejects.toThrow(/store/);
  expect(query.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: "pending" }),
  );
  expect(mocks.remove).not.toHaveBeenCalled();
  mocks.upload.mockResolvedValueOnce({ error: { statusCode: "409" } });
  expect(
    (await completeImageUpload({ uploadId: id, ...access() })).shouldProcess,
  ).toBe(true);
});
it("inspects owner QR originals privately and retains staging for preview retries", async () => {
  reservation.purpose = "owner_qr";
  const result = await completeImageUpload({ uploadId: id, ...access() });
  expect(result.preview.currency).toBe("KHR");
  expect(mocks.preview).toHaveBeenCalledWith(
    expect.objectContaining({
      bill: { id: billId, currency: "USD" },
      actor: { id: actorId },
    }),
  );
  expect(mocks.rpc).toHaveBeenCalledWith(
    "finish_qr_upload",
    expect.objectContaining({ recovery_hash: hashAccessToken("r".repeat(43)) }),
  );
  expect(mocks.upload).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("never reads an image after database authorization fails", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "P0001" } });
  await expect(
    completeImageUpload({ uploadId: id, ...access() }),
  ).rejects.toThrow();
  expect(mocks.download).not.toHaveBeenCalled();
});
it("cleans only a bounded old batch and preserves completed receipt images", async () => {
  cleanupRows = [
    { id, storage_key: "old/orphan", purpose: "receipt", status: "pending" },
    {
      id: "other",
      storage_key: "old/confirmed",
      purpose: "receipt",
      status: "complete",
    },
  ];
  await cleanupImageUploads();
  expect(query.limit).toHaveBeenCalledWith(20);
  expect(mocks.remove).toHaveBeenCalledWith("image-upload-staging", [
    "old/orphan",
    "old/confirmed",
  ]);
  expect(mocks.remove).toHaveBeenCalledWith("receipt-images", ["old/orphan"]);
  expect(query.delete).toHaveBeenCalledOnce();
});
it("keeps cleanup records after a storage deletion fails so maintenance can retry", async () => {
  cleanupRows = [
    { id, storage_key: "old/orphan", purpose: "receipt", status: "pending" },
  ];
  mocks.remove.mockResolvedValueOnce({
    error: { message: "temporary storage failure" },
  });
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await cleanupImageUploads();
    expect(query.delete).not.toHaveBeenCalled();
  } finally {
    logged.mockRestore();
  }
});
