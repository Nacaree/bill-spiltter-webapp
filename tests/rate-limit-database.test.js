// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, beforeEach, expect, it } from "vitest";
let db;
const h = () => randomBytes(32).toString("hex");
async function consume(buckets) {
  return (
    await db.query("select consume_rate_limits($1) as result", [
      JSON.stringify(buckets),
    ])
  ).rows[0].result;
}
async function claim(id, actor) {
  return (
    await db.query("select claim_receipt_extraction_v3($1,$2) as result", [
      id,
      actor,
    ])
  ).rows[0].result;
}
async function fixture() {
  const {
    rows: [bill],
  } = await db.query(
    "select * from create_bill_with_creator('Limit test','USD',$1,$2,'Owner',$3)",
    [h(), h(), h()],
  );
  const scan = randomUUID();
  await db.query(
    "insert into receipt_scans(id,bill_id,uploaded_by_participant_id,storage_key,original_filename,mime_type,image_width,image_height,currency) values($1,$2,$3,$4,'test.png','image/png',10,10,'USD')",
    [scan, bill.bill_id, bill.participant_id, `test/${scan}`],
  );
  return { scan, bill: bill.bill_id, actor: bill.participant_id };
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  const folder = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(folder))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(new URL(name, folder), "utf8"));
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec("delete from rate_limit_counters;");
});
it("enforces thresholds and isolates policy subjects", async () => {
  const bucket = { policy: "create_ip", subject: "ip-hash" };
  for (let i = 0; i < 10; i++)
    expect((await consume([bucket])).allowed).toBe(true);
  const blocked = await consume([bucket]);
  expect(blocked.allowed).toBe(false);
  expect(blocked.retry_after_seconds).toBeGreaterThan(0);
  expect((await consume([{ ...bucket, subject: "other" }])).allowed).toBe(true);
});
it("consumes all applicable buckets or none and returns the longest blocked wait", async () => {
  const buckets = [
    { policy: "create_ip", subject: "same" },
    { policy: "create_ip_day", subject: "same" },
  ];
  await consume(buckets);
  await db.exec(
    "update rate_limit_counters set used=case policy when 'create_ip' then 10 else 50 end",
  );
  const result = await consume([
    ...buckets,
    { policy: "action_ip", subject: "fresh" },
  ]);
  expect(result.allowed).toBe(false);
  expect(result.policy).toBe("create_ip_day");
  expect(
    (
      await db.query(
        "select used from rate_limit_counters where policy='action_ip'",
      )
    ).rows[0].used,
  ).toBe(0);
});
it("uses UTC calendar days and starts a new window rather than reusing expired counts", async () => {
  await db.exec("set timezone='Asia/Phnom_Penh'");
  await consume([{ policy: "create_ip_day", subject: "ip" }]);
  const {
    rows: [row],
  } = await db.query(
    "select extract(hour from window_start at time zone 'UTC') as hour,extract(epoch from expires_at-window_start) as seconds from rate_limit_counters",
  );
  expect(Number(row.hour)).toBe(0);
  expect(Number(row.seconds)).toBe(86400);
  await db.exec(
    "update rate_limit_counters set window_start=window_start-interval '1 day',expires_at=expires_at-interval '1 day',used=50",
  );
  expect(
    (await consume([{ policy: "create_ip_day", subject: "ip" }])).allowed,
  ).toBe(true);
});
it("cleans at most 100 old windows and preserves current windows", async () => {
  await db.exec(
    "insert into rate_limit_counters select 'action_ip',i::text,now()-interval '3 days',now()-interval '2 days',0 from generate_series(1,105) i",
  );
  expect(
    (await db.query("select cleanup_rate_limits() as count")).rows[0].count,
  ).toBe(100);
  await consume([{ policy: "action_ip", subject: "new" }]);
  expect(
    (
      await db.query(
        "select count(*)::integer as count from rate_limit_counters",
      )
    ).rows[0].count,
  ).toBe(1);
});
it("charges only a winning extraction claim and preserves stale-attempt protection", async () => {
  const f = await fixture();
  const first = await claim(f.scan, f.actor);
  expect(first.claimed).toBe(true);
  expect((await claim(f.scan, f.actor)).claimed).toBe(false);
  expect(
    (
      await db.query(
        "select used from rate_limit_counters where policy='extract_app'",
      )
    ).rows[0].used,
  ).toBe(1);
  await db.query("update receipt_scans set status='failed' where id=$1", [
    f.scan,
  ]);
  const second = await claim(f.scan, f.actor);
  expect(second.attempt_id).not.toBe(first.attempt_id);
  expect(
    (
      await db.query(
        "select fail_receipt_extraction_v2($1,$2,'old') as changed",
        [f.scan, first.attempt_id],
      )
    ).rows[0].changed,
  ).toBe(false);
});
it("persists quota denial without spending another attempt and permits retry after the wait", async () => {
  const f = await fixture();
  await consume([{ policy: "extract_app", subject: "app" }]);
  await db.exec(
    "update rate_limit_counters set used=100 where policy='extract_app'",
  );
  const denied = await claim(f.scan, f.actor);
  expect(denied.rate_limited).toBe(true);
  const {
    rows: [scan],
  } = await db.query("select * from receipt_scans where id=$1", [f.scan]);
  expect(scan.status).toBe("failed");
  expect(scan.error_code).toBe("app_rate_limited");
  expect(scan.attempt_count).toBe(0);
  expect(scan.storage_key).toBeTruthy();
  expect(scan.next_retry_at).toBeTruthy();
  expect((await claim(f.scan, f.actor)).rate_limited).toBe(true);
  await db.exec("update rate_limit_counters set used=0");
  await db.query(
    "update receipt_scans set next_retry_at=now()-interval '1 second' where id=$1",
    [f.scan],
  );
  expect((await claim(f.scan, f.actor)).claimed).toBe(true);
});
it("denies browser roles and retires the legacy extraction claim", async () => {
  const f = await fixture();
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await expect(db.query("select * from rate_limit_counters")).rejects.toThrow(
      /permission/,
    );
    await expect(
      consume([{ policy: "action_ip", subject: "x" }]),
    ).rejects.toThrow(/permission/);
    await expect(claim(f.scan, f.actor)).rejects.toThrow(/permission/);
    await db.exec("reset role");
  }
  await db.exec("set role service_role");
  await expect(
    db.query("select claim_receipt_extraction_v2($1)", [f.scan]),
  ).rejects.toThrow(/permission/);
  await db.exec("reset role");
});
it("rejects a participant from another bill before charging extraction", async () => {
  const first = await fixture(),
    second = await fixture();
  await expect(claim(first.scan, second.actor)).rejects.toThrow(/Participant/);
  expect(
    (
      await db.query(
        "select count(*)::integer as count from rate_limit_counters",
      )
    ).rows[0].count,
  ).toBe(0);
});

it("keeps the complete live-testing policy matrix in one private configuration", async () => {
  const rows = (
    await db.query(
      "select name,quota,window_seconds from rate_limit_policies order by name",
    )
  ).rows;
  const actual = Object.fromEntries(
    rows.map((r) => [r.name, [r.quota, r.window_seconds]]),
  );
  expect(actual).toEqual({
    action_ip: [300, 60],
    create_ip: [10, 600],
    create_ip_day: [50, 86400],
    people_ip: [60, 600],
    people_bill: [100, 600],
    upload_actor: [20, 600],
    upload_bill: [60, 600],
    upload_bill_day: [100, 86400],
    upload_ip: [120, 600],
    complete_actor: [60, 600],
    complete_bill: [180, 600],
    write_actor: [60, 60],
    write_bill: [300, 60],
    extract_actor: [10, 600],
    extract_bill: [30, 3600],
    extract_app: [100, 86400],
  });
});
it("allows the service role to use the new counters and extraction claim", async () => {
  const f = await fixture();
  await db.exec("set role service_role");
  try {
    expect(
      (await consume([{ policy: "action_ip", subject: "hash" }])).allowed,
    ).toBe(true);
    expect((await claim(f.scan, f.actor)).claimed).toBe(true);
  } finally {
    await db.exec("reset role");
  }
});

it("rejects empty or malformed bucket sets instead of allowing unchecked work", async () => {
  for (const value of [null, [], {}, [{ policy: "unknown", subject: "x" }]])
    await expect(consume(value)).rejects.toThrow();
  expect(
    (
      await db.query(
        "select count(*)::integer as count from rate_limit_counters",
      )
    ).rows[0].count,
  ).toBe(0);
});
