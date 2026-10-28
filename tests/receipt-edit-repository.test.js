// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createParticipantSession } from "@/lib/participant-session";
import { hashAccessToken } from "@/lib/access-tokens";
const m = vi.hoisted(() => ({
  read: vi.fn(),
  rpc: vi.fn(),
  exists: vi.fn(),
  sign: vi.fn(),
}));
vi.mock("@/lib/supabase-server", () => ({
  getServerSupabase: () => ({
    from(table) {
      const query = { table, fields: "", filters: [], single: false };
      const builder = {
        select(fields) {
          query.fields = fields;
          return builder;
        },
        eq(key, value) {
          query.filters.push([key, value]);
          return builder;
        },
        is() {
          return builder;
        },
        in() {
          return builder;
        },
        order() {
          return builder;
        },
        maybeSingle() {
          query.single = true;
          return builder;
        },
        then(resolve, reject) {
          return Promise.resolve(m.read(query)).then(resolve, reject);
        },
      };
      return builder;
    },
    rpc: m.rpc,
    storage: { from: () => ({ exists: m.exists, createSignedUrl: m.sign }) },
  }),
}));
vi.mock("@/server/monitoring", () => ({ reportAppError: vi.fn() }));
import {
  getReceiptForEditing,
  updateReceiptExpense,
  ReceiptConflictError,
  ReceiptEditSetupError,
} from "@/server/receipts";
const owner = "00000000-0000-4000-8000-000000000001",
  guest = "00000000-0000-4000-8000-000000000002",
  secret = "receipt-edit-test-secret-at-least-32-characters";
let scan, expense, items, people;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("PARTICIPANT_SESSION_SECRET", secret);
  scan = {
    id: "scan",
    status: "confirmed",
    updated_at: "revision1",
    storage_key: "bill/image",
    total_minor: "1001",
    expires_at: "2020-01-01T00:00:00Z",
  };
  expense = {
    id: "expense",
    amount_minor: "1001",
    paid_by_participant_id: owner,
    updated_at: "revision1",
    deleted_at: null,
    notes: "kept",
  };
  items = [{ id: "item", total_minor: "1001", unit_price_minor: "1001" }];
  people = [
    { id: owner, display_name: "Owner" },
    { id: guest, display_name: "Old guest", deactivated_at: "2020-01-01" },
    {
      id: "other",
      display_name: "Unrelated inactive",
      deactivated_at: "2020-01-01",
    },
  ];
  m.exists.mockResolvedValue({ data: false });
  m.read.mockImplementation((query) => {
    const values = {
      bills: { id: "bill", expires_at: "2099-01-01T00:00:00Z" },
      receipt_scans: scan,
      expenses: expense,
      receipt_items: items,
      receipt_item_assignments: [
        { receipt_item_id: "item", participant_id: owner, amount_minor: "501" },
        { receipt_item_id: "item", participant_id: guest, amount_minor: "500" },
      ],
      expense_shares: [
        { participant_id: owner, amount_minor: "501" },
        { participant_id: guest, amount_minor: "500" },
      ],
      bill_participants: people,
    };
    return { data: values[query.table] };
  });
});
afterEach(() => vi.unstubAllEnvs());
it("hydrates saved assignments, shares and historical people even without an image", async () => {
  const result = await getReceiptForEditing("bill", "scan");
  expect(result.imageUrl).toBeNull();
  expect(result.expense).toMatchObject({
    amount_minor: 1001,
    notes: "kept",
    shares: [
      { participantId: owner, amountMinor: 501 },
      { participantId: guest, amountMinor: 500 },
    ],
  });
  expect(result.items[0]).toMatchObject({
    total_minor: 1001,
    unit_price_minor: 1001,
    assignments: [
      { participantId: owner, amountMinor: 501 },
      { participantId: guest, amountMinor: 500 },
    ],
  });
  expect(result.reviewParticipants.map((p) => p.id)).toEqual([owner, guest]);
  expect(m.sign).not.toHaveBeenCalled();
});
it("does not offer an editor for a removed expense", async () => {
  expense = null;
  expect(await getReceiptForEditing("bill", "scan")).toMatchObject({
    expense: null,
  });
});
it("retries overlapping reads and rejects a continually changing receipt", async () => {
  const read = m.read.getMockImplementation();
  let revisions = 0;
  m.read.mockImplementation((query) =>
    query.table === "receipt_scans" &&
    query.fields === "updated_at" &&
    revisions++ === 0
      ? { data: { updated_at: "changed" } }
      : read(query),
  );
  expect((await getReceiptForEditing("bill", "scan")).expense.id).toBe(
    "expense",
  );
  expect(revisions).toBe(2);
  m.read.mockImplementation((query) =>
    query.table === "receipt_scans" && query.fields === "updated_at"
      ? { data: { updated_at: "always-changed" } }
      : read(query),
  );
  await expect(getReceiptForEditing("bill", "scan")).rejects.toBeInstanceOf(
    ReceiptConflictError,
  );
});
function input() {
  return {
    shareToken: "a".repeat(43),
    cookieValue: createParticipantSession({
      billId: "00000000-0000-4000-8000-000000000003",
      participantId: owner,
      sessionToken: "b".repeat(43),
      secret,
    }).value,
    expenseId: "expense",
    receiptScanId: "scan",
    expectedUpdatedAt: "revision1",
    adjustmentMethod: "proportional",
    category: "food",
    expenseDate: "2026-10-28",
    description: "Dinner",
    merchantName: "Cafe",
    paidByParticipantId: owner,
    totalMinor: 1001,
    subtotalMinor: 1001,
    taxMinor: 0,
    tipMinor: 0,
    discountMinor: 0,
    itemRows: [
      {
        clientKey: "0",
        savedItemId: "item",
        description: "Dinner",
        position: 0,
        totalMinor: 1001,
        quantity: 1,
        unitPriceMinor: 1001,
      },
    ],
    assignmentRows: [
      { clientKey: "0", participantId: owner, amountMinor: 1001 },
    ],
    finalShares: [{ participantId: owner, amountMinor: 1001 }],
  };
}
it("writes through the dedicated RPC using hashed credentials and the original expense version", async () => {
  m.rpc.mockResolvedValue({
    data: [{ expense_id: "expense", updated_at: "revision2" }],
  });
  expect(await updateReceiptExpense(input())).toEqual({
    expenseId: "expense",
    updatedAt: "revision2",
  });
  const [name, args] = m.rpc.mock.calls[0];
  expect(name).toBe("update_receipt_expense");
  expect(args).toMatchObject({
    share_hash: hashAccessToken("a".repeat(43)),
    actor_session_hash: hashAccessToken("b".repeat(43)),
    target_expense_id: "expense",
    expected_updated_at: "revision1",
    item_rows: [expect.objectContaining({ saved_item_id: "item" })],
  });
  expect(args).not.toHaveProperty("confirmation_key");
});
it("maps database conflicts and missing migrations to dedicated failures", async () => {
  m.rpc.mockResolvedValue({ error: { code: "P0005" } });
  await expect(updateReceiptExpense(input())).rejects.toBeInstanceOf(
    ReceiptConflictError,
  );
  m.rpc.mockResolvedValue({ error: { code: "PGRST202" } });
  await expect(updateReceiptExpense(input())).rejects.toBeInstanceOf(
    ReceiptEditSetupError,
  );
});
