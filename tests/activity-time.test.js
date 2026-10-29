import { describe, expect, it } from "vitest";
import { formatActivityTime } from "@/lib/activity-time";
import { createExampleActivity } from "@/app/screen2/example-ledger";

const now = Date.parse("2026-10-29T12:00:00Z");
const utc = { timeZone: "UTC" };
const label = (createdAt, at = now, options = utc) =>
  formatActivityTime(createdAt, at, options)?.label;

describe("activity time formatting", () => {
  it.each([
    [0, "Just now"],
    [59_999, "Just now"],
    [60_000, "1 min ago"],
    [5 * 60_000 + 59_999, "5 min ago"],
    [3_599_999, "59 min ago"],
    [3_600_000, "1 hr ago"],
    [2 * 3_600_000 + 59 * 60_000, "2 hr ago"],
  ])("formats elapsed %s ms as %s", (elapsed, expected) => {
    expect(label(new Date(now - elapsed).toISOString())).toBe(expected);
  });

  it("uses calendar dates after the first minute, including month/year boundaries", () => {
    expect(label("2026-10-28T22:00:00Z")).toBe("Yesterday");
    expect(label("2026-10-24T12:00:00Z")).toBe("24 Oct");
    expect(label("2025-10-24T12:00:00Z")).toBe("24 Oct 2025");
    expect(
      label("2026-09-30T18:00:00Z", Date.parse("2026-10-01T08:00:00Z")),
    ).toBe("Yesterday");
    expect(
      label("2025-12-31T18:00:00Z", Date.parse("2026-01-01T08:00:00Z")),
    ).toBe("Yesterday");
    const midnight = Date.parse("2026-10-30T00:00:00Z");
    expect(label("2026-10-29T23:59:30Z", midnight)).toBe("Just now");
    expect(label("2026-10-29T23:59:00Z", midnight)).toBe("Yesterday");
  });

  it("uses the supplied local calendar, not UTC, for yesterday", () => {
    const at = Date.parse("2026-10-29T17:10:00Z");
    const event = "2026-10-29T16:00:00Z";
    expect(label(event, at, { timeZone: "Asia/Phnom_Penh" })).toBe("Yesterday");
    expect(label(event, at, { timeZone: "America/Los_Angeles" })).toBe(
      "1 hr ago",
    );
    const value = formatActivityTime(event, at, {
      timeZone: "Asia/Phnom_Penh",
    });
    expect(value.dateTime).toBe("2026-10-29T16:00:00.000Z");
    expect(value.exact).toContain("29 Oct 2026");
    expect(value.exact).toContain("23:00");
    expect(value.exact).toContain("GMT+7");
  });

  it.each([
    ["2026-03-09T07:30:00Z", "2026-03-08T08:00:00Z"],
    ["2026-11-02T08:30:00Z", "2026-11-01T07:00:00Z"],
  ])("handles yesterday across DST: %s", (at, event) => {
    expect(
      label(event, Date.parse(at), { timeZone: "America/Los_Angeles" }),
    ).toBe("Yesterday");
  });

  it("clamps future times and rejects missing, invalid, or uninitialized input", () => {
    expect(label("2026-10-30T12:00:00Z")).toBe("Just now");
    for (const input of [null, undefined, "", "not a timestamp", 0, NaN]) {
      expect(formatActivityTime(input, now, utc)).toBeNull();
    }
    expect(formatActivityTime("2026-10-29T12:00:00Z", null, utc)).toBeNull();
  });
});

it("seeds synthetic events from one opening/reset time", () => {
  const entries = createExampleActivity(now);
  expect(entries.map((entry) => entry.actorId)).toEqual([
    "nary",
    "sokha",
    "mali",
  ]);
  expect(Date.parse(entries[0].createdAt)).toBe(now - 5 * 60_000);
  expect(Date.parse(entries[1].createdAt)).toBe(now - 2 * 3_600_000);
  const yesterday = new Date(entries[2].createdAt);
  const expected = new Date(now);
  expected.setDate(expected.getDate() - 1);
  expected.setHours(0, 0, 0, 0);
  expect(yesterday.getTime()).toBe(expected.getTime());
  expect(createExampleActivity(now + 60_000)[0].createdAt).not.toBe(
    entries[0].createdAt,
  );
  expect(
    createExampleActivity(null).every((entry) => entry.createdAt === null),
  ).toBe(true);
});
