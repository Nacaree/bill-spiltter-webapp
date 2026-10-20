// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
const suite =
  process.env.RUN_RATE_LIMIT_INTEGRATION === "1" ? describe : describe.skip;
suite("hosted atomic rate limiting", () => {
  let db, fixture;
  const subject = `integration-${randomUUID()}`;
  beforeAll(() => {
    db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  });
  afterAll(async () => {
    const outcomes = [];
    if (fixture) {
      outcomes.push(await db.from("bills").delete().eq("id", fixture.billId));
      outcomes.push(
        await db
          .from("rate_limit_counters")
          .delete()
          .in("subject", [fixture.billId, fixture.actorId].filter(Boolean)),
      );
    }
    outcomes.push(
      await db.from("rate_limit_counters").delete().eq("subject", subject),
    );
    if (outcomes.some((result) => result.error))
      throw new Error("Synthetic rate-limit fixture cleanup failed.");
  });
  it("admits exactly the quota under concurrent independent requests", async () => {
    // Daily window avoids a short-window reset while the concurrency test runs.
    const results = await Promise.all(
      Array.from({ length: 60 }, () =>
        db.rpc("consume_rate_limits", {
          buckets: [{ policy: "create_ip_day", subject }],
        }),
      ),
    );
    expect(results.every((r) => !r.error)).toBe(true);
    expect(results.filter((r) => r.data.allowed)).toHaveLength(50);
  }, 30000);
  it("starts only one concurrent extraction attempt without contacting Gemini", async () => {
    const { createBillWithCreator } = await import("@/server/bills");
    const { getSessionParticipant } = await import("@/server/bills");
    const created = await createBillWithCreator({
      billName: "Synthetic limiter concurrency",
      currency: "USD",
      participantName: "Synthetic owner",
    });
    fixture = { billId: created.billId };
    const actor = await getSessionParticipant(
      created.billId,
      created.sessionValue,
    );
    fixture = { billId: created.billId, actorId: actor.id };
    const scan = randomUUID();
    const { error } = await db.from("receipt_scans").insert({
      id: scan,
      bill_id: created.billId,
      uploaded_by_participant_id: actor.id,
      storage_key: `synthetic/${scan}`,
      original_filename: "synthetic.png",
      mime_type: "image/png",
      image_width: 10,
      image_height: 10,
      currency: "USD",
    });
    expect(error).toBeNull();
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        db.rpc("claim_receipt_extraction_v3", {
          target_scan_id: scan,
          actor_participant_id: actor.id,
        }),
      ),
    );
    expect(results.every((r) => !r.error)).toBe(true);
    expect(results.filter((r) => r.data.claimed)).toHaveLength(1);
  }, 30000);
});
