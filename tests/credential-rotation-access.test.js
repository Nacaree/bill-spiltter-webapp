// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createParticipantSession } from "@/lib/participant-session";
import { hashAccessToken } from "@/lib/access-tokens";

const mocks = vi.hoisted(() => ({ from: vi.fn(), bill: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({ from: mocks.from }),
}));
vi.mock("@/server/bills", async (original) => ({
  ...(await original()),
  getBillByShareToken: mocks.bill,
}));
import {
  requireCreator,
  CreatorAccessRequiredError,
} from "@/server/payment-methods";

const billId = "018f0f67-2a03-7e9d-8e1c-75dcfcb18be7";
const participantId = "018f0f67-4d58-7ee1-8cc8-b24c75e64a42";
const oldSecret = "old-disposable-session-secret-32-bytes";
const newSecret = "new-disposable-session-secret-32-bytes";
const recoveryToken = "disposable-creator-recovery-capability";
let cookieValue;
let creator;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PARTICIPANT_SESSION_SECRET", newSecret);
  vi.stubEnv("PARTICIPANT_SESSION_PREVIOUS_SECRET", oldSecret);
  creator = true;
  const session = createParticipantSession({
    billId,
    participantId,
    secret: oldSecret,
  });
  cookieValue = session.value;
  mocks.bill.mockResolvedValue({ id: billId });
  // Offline database boundary: real cookie verification and creator checks run.
  mocks.from.mockImplementation((table) => {
    const filters = {};
    return {
      select() {
        return this;
      },
      eq(key, value) {
        filters[key] = value;
        return this;
      },
      is(key, value) {
        filters[key] = value;
        return this;
      },
      async maybeSingle() {
        if (table === "bill_participants") {
          expect(filters).toEqual({
            id: participantId,
            bill_id: billId,
            session_token_hash: hashAccessToken(session.sessionToken),
            deactivated_at: null,
          });
          return { data: { id: participantId, is_creator: creator } };
        }
        expect(table).toBe("bills");
        return {
          data:
            filters.id === billId &&
            filters.creator_key_hash === hashAccessToken(recoveryToken)
              ? { id: billId }
              : null,
        };
      },
    };
  });
});
afterEach(() => vi.unstubAllEnvs());

it("keeps the creator accessible during overlap but the recovery cookie cannot bypass retirement", async () => {
  const input = { shareToken: "share", cookieValue, recoveryToken };
  expect(await requireCreator(input)).toMatchObject({
    actor: { id: participantId },
  });
  vi.stubEnv("PARTICIPANT_SESSION_PREVIOUS_SECRET", "");
  mocks.from.mockClear();
  await expect(requireCreator(input)).rejects.toThrow(
    CreatorAccessRequiredError,
  );
  expect(mocks.from).not.toHaveBeenCalled();
});

it("still requires a creator session and matching private recovery capability during overlap", async () => {
  for (const recovery of [undefined, "tampered-disposable-recovery-token"]) {
    await expect(
      requireCreator({
        shareToken: "share",
        cookieValue,
        recoveryToken: recovery,
      }),
    ).rejects.toThrow(CreatorAccessRequiredError);
  }
  creator = false;
  await expect(
    requireCreator({ shareToken: "share", cookieValue, recoveryToken }),
  ).rejects.toThrow(CreatorAccessRequiredError);
});
