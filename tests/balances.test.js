import { describe, expect, it } from "vitest";
import { calculateBalances, suggestTransfers } from "@/lib/balances";

const participants = [
  { id: "a" },
  { id: "b" },
  { id: "c", deactivated_at: "2026-10-01" },
];
function expense(amount = 1001) {
  return {
    id: "dinner",
    description: "Dinner",
    paid_by_participant_id: "a",
    amount_minor: amount,
    shares: [
      { participantId: "a", amountMinor: 501 },
      { participantId: "b", amountMinor: 500 },
    ],
  };
}
function payment(amount = 200) {
  return {
    from_participant_id: "b",
    to_participant_id: "a",
    amount_minor: amount,
  };
}
const net = (rows) => rows.map((p) => p.netMinor);

describe("derived balances", () => {
  it("explains paid amounts and shares and applies partial payments with correct signs", () => {
    const balances = calculateBalances({
      participants,
      expenses: [expense()],
      settlements: [payment()],
    });
    expect(net(balances)).toEqual([300, -300, 0]);
    expect(balances[0]).toMatchObject({
      paidMinor: 1001,
      shareMinor: 501,
      receivedMinor: 200,
      entries: [{ expenseId: "dinner", paidMinor: 1001, shareMinor: 501 }],
    });
    expect(suggestTransfers(balances)).toEqual([
      { fromParticipantId: "b", toParticipantId: "a", amountMinor: 300 },
    ]);
  });
  it("ignores removed records and updates derived totals after a correction", () => {
    expect(
      net(
        calculateBalances({
          participants,
          expenses: [expense()],
          settlements: [{ ...payment(), deleted_at: "now" }],
        }),
      ),
    ).toEqual([500, -500, 0]);
    expect(
      net(
        calculateBalances({
          participants,
          expenses: [{ ...expense(), deleted_at: "now" }],
          settlements: [],
        }),
      ),
    ).toEqual([0, 0, 0]);
    expect(
      net(
        calculateBalances({
          participants,
          expenses: [expense()],
          settlements: [payment(500)],
        }),
      ),
    ).toEqual([0, 0, 0]);
  });
  it("preserves overpayments and deactivated participants instead of hiding debt", () => {
    const balances = calculateBalances({
      participants,
      expenses: [expense()],
      settlements: [
        payment(600),
        { from_participant_id: "c", to_participant_id: "a", amount_minor: 50 },
      ],
    });
    expect(net(balances)).toEqual([-150, 100, 50]);
    expect(suggestTransfers(balances)).toHaveLength(2);
  });
  it("rejects inconsistent shares, unknown people, invalid payments and unsafe totals", () => {
    const base = { participants, expenses: [expense()], settlements: [] };
    expect(() =>
      calculateBalances({ ...base, expenses: [expense(1000)] }),
    ).toThrow();
    expect(() =>
      calculateBalances({ ...base, participants: [{ id: "a" }] }),
    ).toThrow();
    expect(() =>
      calculateBalances({ ...base, settlements: [payment(1.5)] }),
    ).toThrow();
    expect(() =>
      calculateBalances({
        ...base,
        settlements: [{ ...payment(), to_participant_id: "b" }],
      }),
    ).toThrow();
    const large = {
      ...expense(),
      amount_minor: Number.MAX_SAFE_INTEGER,
      shares: [{ participantId: "b", amountMinor: Number.MAX_SAFE_INTEGER }],
    };
    expect(() =>
      calculateBalances({ ...base, expenses: [large, large] }),
    ).toThrow(/large/);
  });
  it("deterministically settles zero-sum ledgers in at most n−1 transfers", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const nets = [
        seed * 17,
        -seed * 7,
        seed % 11,
        -seed * 10 - (seed % 11),
        0,
      ];
      const balances = nets.map((netMinor, i) => ({ id: String(i), netMinor }));
      const transfers = suggestTransfers(balances);
      expect(suggestTransfers([...balances].reverse())).toEqual(transfers);
      const remaining = new Map(balances.map((p) => [p.id, p.netMinor]));
      for (const t of transfers) {
        expect(t.amountMinor).toBeGreaterThan(0);
        remaining.set(
          t.fromParticipantId,
          remaining.get(t.fromParticipantId) + t.amountMinor,
        );
        remaining.set(
          t.toParticipantId,
          remaining.get(t.toParticipantId) - t.amountMinor,
        );
      }
      expect([...remaining.values()]).toEqual([0, 0, 0, 0, 0]);
      expect(transfers.length).toBeLessThanOrEqual(balances.length - 1);
    }
  });
});
