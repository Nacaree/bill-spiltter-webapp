// @vitest-environment node

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const integrationEnabled = process.env.RUN_SUPABASE_INTEGRATION === "1";
const liveDescribe = integrationEnabled ? describe : describe.skip;
const originalCurrentSecret = process.env.PARTICIPANT_SESSION_SECRET;
const originalPreviousSecret = process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET;
const createdBillIds = [];
let BillNotFoundError;
let createBillWithCreator;
let getBillByShareToken;
let getServerSupabase;
let getSessionParticipant;

function uniqueName(prefix) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createTestBill(prefix) {
  const created = await createBillWithCreator({
    billName: uniqueName(prefix),
    currency: "USD",
    participantName: uniqueName("Creator"),
  });
  createdBillIds.push(created.billId);
  return created;
}

liveDescribe("Phase 1 live credential boundaries", () => {
  beforeAll(async () => {
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
    expect(originalCurrentSecret?.length).toBeGreaterThanOrEqual(32);
    ({
      BillNotFoundError,
      createBillWithCreator,
      getBillByShareToken,
      getSessionParticipant,
    } = await import("@/server/bills"));
    ({ getServerSupabase } = await import("@/lib/supabase-server"));
  });

  afterEach(() => {
    process.env.PARTICIPANT_SESSION_SECRET = originalCurrentSecret;
    if (originalPreviousSecret) {
      process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET = originalPreviousSecret;
    } else {
      delete process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET;
    }
  });

  afterAll(async () => {
    if (!createdBillIds.length) return;
    const { error } = await getServerSupabase()
      .from("bills")
      .delete()
      .in("id", createdBillIds);
    if (error) throw error;
  });

  it("rejects an expired bill capability against the live database", async () => {
    const created = await createTestBill("Expired credential");
    const { error } = await getServerSupabase()
      .from("bills")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", created.billId);
    expect(error).toBeNull();

    await expect(
      getBillByShareToken(created.shareToken),
    ).rejects.toBeInstanceOf(BillNotFoundError);
  });

  it("accepts a live participant session during signing-key rotation", async () => {
    const previousSecret = "previous-live-integration-secret-123456";
    const currentSecret = "current-live-integration-secret-1234567";
    process.env.PARTICIPANT_SESSION_SECRET = previousSecret;
    delete process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET;
    const created = await createTestBill("Rotated credential");

    process.env.PARTICIPANT_SESSION_SECRET = currentSecret;
    process.env.PARTICIPANT_SESSION_PREVIOUS_SECRET = previousSecret;
    const participant = await getSessionParticipant(
      created.billId,
      created.sessionValue,
    );

    expect(participant).toMatchObject({
      id: expect.any(String),
      is_creator: true,
    });
  });

  it("rejects a valid participant credential on another live bill", async () => {
    const first = await createTestBill("Cross-bill source");
    const second = await createTestBill("Cross-bill target");

    await expect(
      getSessionParticipant(second.billId, first.sessionValue),
    ).resolves.toBeNull();
  });
});
