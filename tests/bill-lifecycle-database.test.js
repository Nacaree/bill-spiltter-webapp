// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

let db;
const hash = () => randomBytes(32).toString("hex");
const folder = new URL("../supabase/migrations/", import.meta.url);
async function bootstrap(withLifecycle = true) {
  const result = new PGlite();
  await result.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  for (const name of (await readdir(folder))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (withLifecycle || !name.includes("bill_lifecycle"))
      await result.exec(await readFile(new URL(name, folder), "utf8"));
  }
  return result;
}
async function bill(database = db) {
  const share = hash(),
    recovery = hash(),
    session = hash();
  const {
    rows: [b],
  } = await database.query(
    "select * from create_bill_with_creator('Lifecycle','USD',$1,$2,'Owner',$3)",
    [share, recovery, session],
  );
  return { id: b.bill_id, owner: b.participant_id, share, recovery, session };
}
async function scan(f, status = "needs_review") {
  const id = randomUUID();
  await db.query(
    "insert into receipt_scans(id,bill_id,uploaded_by_participant_id,storage_key,original_filename,mime_type,image_width,image_height,currency,status,total_minor) values($1,$2,$3,$4,'receipt.png','image/png',10,10,'USD',$5,100)",
    [id, f.id, f.owner, `${f.id}/${id}`, status],
  );
  return id;
}
const state = async (f) =>
  (await db.query("select * from bills where id=$1", [f.id])).rows[0];
const expireBill = (f) =>
  db.query("update bills set expires_at=clock_timestamp() where id=$1", [f.id]);
const expireScan = (id) =>
  db.query(
    "update receipt_scans set expires_at=clock_timestamp() where id=$1",
    [id],
  );
const cleanup = async () =>
  (await db.query("select cleanup_bill_lifecycle() as result")).rows[0].result;
const remove = (f, overrides = {}) => {
  const p = { ...f, ...overrides };
  return db.query("select delete_bill_permanently($1,$2,$3,$4) as id", [
    p.share,
    p.recovery,
    p.owner,
    p.session,
  ]);
};
async function confirm(f, id, key = randomUUID()) {
  return db.query(
    "select * from confirm_receipt_expense($1,$2,$3,$4,$5,'Receipt',$2,'food','2026-10-22','Shop',100,0,0,0,100,'proportional',$6,$7,$8)",
    [
      f.share,
      f.owner,
      f.session,
      id,
      key,
      JSON.stringify([
        {
          client_key: "one",
          position: 0,
          description: "Food",
          quantity: 1,
          unit_price_minor: 100,
          total_minor: 100,
          needs_review: false,
          confidence_basis_points: 9500,
        },
      ]),
      JSON.stringify([
        { client_key: "one", participant_id: f.owner, amount_minor: 100 },
      ]),
      JSON.stringify([{ participant_id: f.owner, amount_minor: 100 }]),
    ],
  );
}
beforeAll(async () => {
  db = await bootstrap();
}, 30000);
afterAll(async () => db?.close());

it("backfills activity with UTC calendar arithmetic and never reopens expired/archived bills", async () => {
  const old = await bootstrap(false);
  try {
    const active = await bill(old),
      expired = await bill(old),
      archived = await bill(old);
    await old.query(
      "update bills set created_at='2027-01-01',expires_at='2035-01-01' where id=$1",
      [active.id],
    );
    await old.query(
      "update activity_log set created_at='2028-02-29 12:00Z' where bill_id=$1",
      [active.id],
    );
    await old.query(
      "update bills set expires_at='2020-01-01 00:00Z' where id=$1",
      [expired.id],
    );
    await old.query("update bills set archived_at=now() where id=$1", [
      archived.id,
    ]);
    await old.exec("set timezone='Asia/Phnom_Penh'");
    await old.exec(
      await readFile(
        new URL("20261022000000_bill_lifecycle.sql", folder),
        "utf8",
      ),
    );
    const rows = (
      await old.query(
        "select id,expires_at,archived_at,last_activity_at from bills",
      )
    ).rows;
    expect(
      new Date(rows.find((r) => r.id === active.id).expires_at).toISOString(),
    ).toBe("2029-02-28T12:00:00.000Z");
    expect(
      Number(
        (
          await old.query(
            "select extract(year from expires_at at time zone 'UTC') as y from bills where id=$1",
            [expired.id],
          )
        ).rows[0].y,
      ),
    ).toBe(2020);
    expect(rows.find((r) => r.id === archived.id).archived_at).toBeTruthy();
    expect(rows).toHaveLength(3);
  } finally {
    await old.close();
  }
});

it("renews on successful user changes and uploads, never on reads, failures or extraction", async () => {
  const f = await bill();
  await db.query(
    "update bills set last_activity_at=now()-interval '10 days',expires_at=now()+interval '1 day' where id=$1",
    [f.id],
  );
  await db.query("select * from join_bill($1,'Guest',$2)", [f.share, hash()]);
  let current = await state(f);
  expect(new Date(current.expires_at).getTime()).toBeGreaterThan(
    Date.now() + 360 * 86400_000,
  );
  await db.query("select get_bill_ledger($1)", [f.share]);
  await expect(
    db.query("select * from join_bill($1,'Guest',$2)", [f.share, hash()]),
  ).rejects.toThrow();
  expect((await state(f)).last_activity_at).toEqual(current.last_activity_at);
  const id = await scan(f, "uploaded");
  current = await state(f);
  const claimed = (
    await db.query("select claim_receipt_extraction_v3($1,$2) as result", [
      id,
      f.owner,
    ])
  ).rows[0].result;
  expect(claimed.claimed).toBe(true);
  await db.query("select fail_receipt_extraction_v2($1,$2,'failed')", [
    id,
    claimed.attempt_id,
  ]);
  expect((await state(f)).last_activity_at).toEqual(current.last_activity_at);
});

it("rejects expired draft confirmation and late worker writes while retaining confirmed receipts", async () => {
  const f = await bill(),
    id = await scan(f);
  await expireScan(id);
  await expect(confirm(f, id)).rejects.toThrow(/not ready|expired/);
  expect(
    (
      await db.query("select claim_receipt_extraction_v3($1,$2) as r", [
        id,
        f.owner,
      ])
    ).rows[0].r.claimed,
  ).toBe(false);
  const worker = await scan(f, "processing"),
    attempt = randomUUID();
  await db.query(
    "update receipt_scans set extraction_attempt_id=$2 where id=$1",
    [worker, attempt],
  );
  await expireScan(worker);
  expect(
    (
      await db.query("select fail_receipt_extraction_v2($1,$2,'failed') as r", [
        worker,
        attempt,
      ])
    ).rows[0].r,
  ).toBe(false);
  expect(
    (
      await db.query(
        "select store_receipt_extraction_v2($1,$2,'Shop',null,'USD',100,0,0,0,100,'fixture',null,'[]') as r",
        [worker, attempt],
      )
    ).rows[0].r,
  ).toBe(false);
  const ready = await scan(f),
    key = randomUUID();
  const confirmed = await confirm(f, ready, key);
  expect((await confirm(f, ready, key)).rows[0].expense_id).toBe(
    confirmed.rows[0].expense_id,
  );
  await cleanup();
  expect(
    (await db.query("select status from receipt_scans where id=$1", [ready]))
      .rows[0].status,
  ).toBe("confirmed");
  expect(
    (
      await db.query("select * from lifecycle_file_jobs where object_key=$1", [
        `${f.id}/${ready}`,
      ])
    ).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select * from receipt_scans where id=$1", [id])).rows,
  ).toHaveLength(0);
});

it("rejects guest, cross-bill, missing and tampered creator capabilities", async () => {
  const f = await bill(),
    other = await bill();
  const guest = (
    await db.query("select * from join_bill($1,'Guest',$2)", [f.share, hash()])
  ).rows[0];
  for (const overrides of [
    { recovery: null },
    { recovery: hash() },
    { session: hash() },
    { owner: other.owner },
    { owner: guest.participant_id },
  ])
    await expect(remove(f, overrides)).rejects.toThrow(/Creator access/);
  expect(await state(f)).toBeTruthy();
  expect(
    (
      await db.query("select * from lifecycle_file_jobs where bill_id=$1", [
        f.id,
      ])
    ).rows,
  ).toHaveLength(0);
});

it("deletes dependent financial/receipt/upload records and scoped quotas, preserving another bill and global/IP quotas", async () => {
  const f = await bill(),
    other = await bill(),
    id = await scan(f);
  await confirm(f, id);
  await db.query(
    "insert into image_upload_reservations(id,bill_id,participant_id,share_hash,purpose,filename,size_bytes,mime_type,storage_key,receipt_scan_id,status) values($5,$1,$2,$3,'receipt','receipt.png',100,'image/png',$4,$5,'complete')",
    [f.id, f.owner, f.share, `${f.id}/${id}`, id],
  );
  await db.query(
    "select save_bill_settlement($1,$2,$3,$4,'create',$2,$5,100,'2026-10-22','',null)",
    [
      f.share,
      f.owner,
      f.session,
      randomUUID(),
      (
        await db.query("select * from join_bill($1,'Guest',$2)", [
          f.share,
          hash(),
        ])
      ).rows[0].participant_id,
    ],
  );
  await db.query(
    "select save_bill_payment_method($1,$2,$3,$4,'save',null,null,$5,'Owner','USD',$6,null,null)",
    [f.share, f.recovery, f.owner, f.session, `${f.id}/qr.png`, hash()],
  );
  await db.query("select consume_rate_limits($1)", [
    JSON.stringify([
      { policy: "write_bill", subject: f.id },
      { policy: "write_actor", subject: f.owner },
      { policy: "extract_app", subject: "app" },
      { policy: "action_ip", subject: hash() },
    ]),
  ]);
  await remove(f);
  await remove(f);
  expect(await state(f)).toBeUndefined();
  expect(await state(other)).toBeTruthy();
  for (const table of [
    "bill_participants",
    "expenses",
    "expense_shares",
    "receipt_scans",
    "settlements",
    "bill_payment_methods",
    "image_upload_reservations",
    "activity_log",
  ])
    expect(
      (
        await db.query(
          `select count(*)::int n from ${table} where bill_id=$1`,
          [f.id],
        )
      ).rows[0].n,
    ).toBe(0);
  expect(
    (
      await db.query("select * from lifecycle_file_jobs where bill_id=$1", [
        f.id,
      ])
    ).rows,
  ).toHaveLength(3);
  expect(
    (
      await db.query(
        "select * from rate_limit_counters where subject in ($1,$2)",
        [f.id, f.owner],
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query(
        "select * from rate_limit_counters where policy in ('extract_app','action_ip')",
      )
    ).rows.length,
  ).toBeGreaterThanOrEqual(2);
});

it("expiry blocks all subsequent changes and cleanup immediately purges the bill", async () => {
  const f = await bill(),
    id = await scan(f, "processing");
  const before = (await state(f)).last_activity_at;
  await expireBill(f);
  await expect(
    db.query("select * from join_bill($1,'Late',$2)", [f.share, hash()]),
  ).rejects.toThrow();
  await expect(scan(f)).rejects.toThrow(/no longer available/);
  expect(
    (await db.query("select get_bill_ledger($1) as r", [f.share])).rows[0].r,
  ).toBeNull();
  expect(
    (
      await db.query("select claim_receipt_extraction_v3($1,$2) as r", [
        id,
        f.owner,
      ])
    ).rows[0].r.claimed,
  ).toBe(false);
  expect((await state(f)).last_activity_at).toEqual(before);
  await cleanup();
  expect(await state(f)).toBeUndefined();
});

it("file jobs survive interruptions, reject stale acknowledgements and require a successful final sweep", async () => {
  const f = await bill();
  await remove(f);
  let jobs = (
    await db.query("select * from claim_lifecycle_file_jobs(3,$1)", [f.id])
  ).rows;
  expect(jobs).toHaveLength(3);
  expect(
    (await db.query("select * from claim_lifecycle_file_jobs(3,$1)", [f.id]))
      .rows,
  ).toHaveLength(0);
  await db.query("select finish_lifecycle_file_job($1,$2,true,true)", [
    jobs[0].id,
    randomUUID(),
  ]);
  expect(
    (
      await db.query("select lease_id from lifecycle_file_jobs where id=$1", [
        jobs[0].id,
      ])
    ).rows[0].lease_id,
  ).toBe(jobs[0].lease_id);
  await db.query("select finish_lifecycle_file_job($1,$2,true,true)", [
    jobs[0].id,
    jobs[0].lease_id,
  ]);
  expect(
    (
      await db.query(
        "select next_attempt_at=final_sweep_after as waiting from lifecycle_file_jobs where id=$1",
        [jobs[0].id],
      )
    ).rows[0].waiting,
  ).toBe(true);
  await db.query(
    "update lifecycle_file_jobs set lease_until=now()-interval '1 minute',final_sweep_after=now()-interval '1 second',next_attempt_at=now()-interval '1 second' where bill_id=$1",
    [f.id],
  );
  jobs = (
    await db.query("select * from claim_lifecycle_file_jobs(3,$1)", [f.id])
  ).rows;
  await db.query("select finish_lifecycle_file_job($1,$2,false,false)", [
    jobs[0].id,
    jobs[0].lease_id,
  ]);
  for (const job of jobs.slice(1))
    await db.query("select finish_lifecycle_file_job($1,$2,true,true)", [
      job.id,
      job.lease_id,
    ]);
  expect(
    (
      await db.query("select * from lifecycle_file_jobs where bill_id=$1", [
        f.id,
      ])
    ).rows,
  ).toHaveLength(1);
});

it("exposes lifecycle RPCs and queue metadata only to the service role", async () => {
  expect(
    (
      await db.query(
        "select has_function_privilege('anon','delete_bill_permanently(text,text,uuid,text)','EXECUTE') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
  expect(
    (
      await db.query(
        "select has_table_privilege('authenticated','lifecycle_file_jobs','SELECT') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
});

it("deletion wins over previously claimed uploads/extractions without resurrecting rows", async () => {
  const f = await bill(),
    id = await scan(f, "uploaded"),
    uploadId = randomUUID();
  const attempt = (
    await db.query("select claim_receipt_extraction_v3($1,$2) as r", [
      id,
      f.owner,
    ])
  ).rows[0].r;
  await db.query(
    "insert into image_upload_reservations(id,bill_id,participant_id,share_hash,purpose,filename,size_bytes,mime_type,storage_key) values($1,$2,$3,$4,'receipt','receipt.png',100,'image/png',$5)",
    [uploadId, f.id, f.owner, f.share, `${f.id}/${uploadId}`],
  );
  const upload = (
    await db.query("select claim_image_upload($1,$2,$3) as r", [
      uploadId,
      f.owner,
      f.session,
    ])
  ).rows[0].r;
  await remove(f);
  await expect(
    db.query("select finish_receipt_upload($1,$2,$3,$4,'image/png',10,10)", [
      uploadId,
      f.owner,
      f.session,
      upload.lease_id,
    ]),
  ).rejects.toThrow(/unavailable/);
  expect(
    (
      await db.query(
        "select store_receipt_extraction_v2($1,$2,'Shop',null,'USD',100,0,0,0,100,'fixture',null,'[]') as r",
        [id, attempt.attempt_id],
      )
    ).rows[0].r,
  ).toBe(false);
  expect(
    (
      await db.query("select fail_receipt_extraction_v2($1,$2,'failed') as r", [
        id,
        attempt.attempt_id,
      ])
    ).rows[0].r,
  ).toBe(false);
  expect(
    (await db.query("select * from receipt_scans where bill_id=$1", [f.id]))
      .rows,
  ).toHaveLength(0);
});

it("bounds expiry cleanup batches and rejects invalid batch limits", async () => {
  const fixtures = [];
  for (let i = 0; i < 21; i++) {
    const f = await bill();
    await expireBill(f);
    fixtures.push(f.id);
  }
  await expect(db.query("select cleanup_bill_lifecycle(21)")).rejects.toThrow(
    /between 1 and 20/,
  );
  const result = await cleanup();
  expect(result.bills_removed).toBe(20);
  expect(
    (
      await db.query(
        "select count(*)::int n from bills where id=any($1::uuid[])",
        [fixtures],
      )
    ).rows[0].n,
  ).toBe(1);
  await cleanup();
});
