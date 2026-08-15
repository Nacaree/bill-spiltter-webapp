import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashAccessToken } from "@/lib/access-tokens";
import {
  createParticipantSession,
  verifyParticipantSession,
} from "@/lib/participant-session";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({ rpc: mocks.rpc }),
}));

import {
  addParticipant,
  claimParticipant,
  createBillWithCreator,
  joinBill,
  ParticipantNameTakenError,
  ParticipantSessionRequiredError,
  ParticipantUnavailableError,
} from "@/server/bills";

const billId = "018f0f67-2a03-7e9d-8e1c-75dcfcb18be7";
const participantId = "018f0f67-4d58-7ee1-8cc8-b24c75e64a42";
const secret = "repository-test-secret-that-is-long-enough";

describe("bill repository capability boundary", () => {
  beforeEach(() => {
    process.env.PARTICIPANT_SESSION_SECRET = secret;
    mocks.rpc.mockReset();
  });

  afterEach(() => {
    delete process.env.PARTICIPANT_SESSION_SECRET;
  });

  it("creates atomically with hashes and signs the matching participant token", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ bill_id: billId, participant_id: participantId }],
      error: null,
    });

    const created = await createBillWithCreator({
      billName: "Beach weekend",
      currency: "USD",
      participantName: "Sokha",
    });
    const [, parameters] = mocks.rpc.mock.calls[0];

    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_bill_with_creator",
      expect.objectContaining({
        bill_currency: "USD",
        bill_name: "Beach weekend",
        creator_name: "Sokha",
      }),
    );
    expect(parameters.share_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(parameters.recovery_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(parameters.participant_session_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(parameters)).not.toContain(created.shareToken);
    expect(JSON.stringify(parameters)).not.toContain(created.recoveryToken);

    const session = verifyParticipantSession(created.sessionValue, {
      expectedBillId: billId,
      secrets: [secret],
    });
    expect(session.participantId).toBe(participantId);
    expect(hashAccessToken(session.sessionToken)).toBe(
      parameters.participant_session_hash,
    );
  });

  it("joins atomically and maps a duplicate active name", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [{ bill_id: billId, participant_id: participantId }],
      error: null,
    });
    const joined = await joinBill({
      participantName: "Dara",
      shareToken: "a".repeat(43),
    });
    expect(joined.billId).toBe(billId);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "join_bill",
      expect.objectContaining({
        participant_name: "Dara",
        share_hash: hashAccessToken("a".repeat(43)),
      }),
    );

    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "23505" },
    });
    await expect(
      joinBill({ participantName: "Dara", shareToken: "b".repeat(43) }),
    ).rejects.toBeInstanceOf(ParticipantNameTakenError);
  });

  it("claims an unclaimed participant with a new server-side capability", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ bill_id: billId, participant_id: participantId }],
      error: null,
    });

    const claimed = await claimParticipant({
      participantId,
      shareToken: "c".repeat(43),
    });
    const [, parameters] = mocks.rpc.mock.calls[0];

    expect(mocks.rpc).toHaveBeenCalledWith(
      "claim_bill_participant",
      expect.objectContaining({
        share_hash: hashAccessToken("c".repeat(43)),
        target_participant_id: participantId,
      }),
    );
    expect(parameters.participant_session_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      verifyParticipantSession(claimed.sessionValue, {
        expectedBillId: billId,
        secrets: [secret],
      }),
    ).toMatchObject({ participantId });

    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0003" },
    });
    await expect(
      claimParticipant({ participantId, shareToken: "d".repeat(43) }),
    ).rejects.toBeInstanceOf(ParticipantUnavailableError);
  });

  it("adds an unclaimed participant only with a valid signed session", async () => {
    const sessionToken = "s".repeat(43);
    const session = createParticipantSession({
      billId,
      participantId,
      secret,
      sessionToken,
    });
    mocks.rpc.mockResolvedValue({
      data: [{ participant_id: participantId }],
      error: null,
    });

    await addParticipant({
      cookieValue: session.value,
      participantName: "Dara",
      shareToken: "e".repeat(43),
    });

    expect(mocks.rpc).toHaveBeenCalledWith("add_bill_participant", {
      actor_participant_id: participantId,
      actor_session_hash: hashAccessToken(sessionToken),
      participant_name: "Dara",
      share_hash: hashAccessToken("e".repeat(43)),
    });

    mocks.rpc.mockClear();
    await expect(
      addParticipant({
        cookieValue: `${session.value}tampered`,
        participantName: "Malis",
        shareToken: "e".repeat(43),
      }),
    ).rejects.toBeInstanceOf(ParticipantSessionRequiredError);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
