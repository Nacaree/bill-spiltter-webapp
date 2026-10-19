// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

let db;
const hash = () => randomBytes(32).toString("hex");
async function fixture(purpose = "receipt") {
  const share = hash(),
    recovery = hash(),
    session = hash();
  const {
    rows: [bill],
  } = await db.query(
    "select * from create_bill_with_creator('Upload test','USD',$1,$2,'Owner',$3)",
    [share, recovery, session],
  );
  const id = randomUUID();
  await db.query(
    "insert into image_upload_reservations(id,bill_id,participant_id,share_hash,purpose,filename,size_bytes,mime_type,storage_key) values($1,$2,$3,$4,$5,'image.png',100,'image/png',$6)",
    [
      id,
      bill.bill_id,
      bill.participant_id,
      share,
      purpose,
      `${bill.bill_id}/${id}`,
    ],
  );
  return {
    id,
    billId: bill.bill_id,
    actor: bill.participant_id,
    share,
    recovery,
    session,
    purpose,
  };
}
async function claim(f, changes = {}) {
  const p = { ...f, ...changes };
  return (
    await db.query("select claim_image_upload($1,$2,$3,$4) as upload", [
      p.id,
      p.actor,
      p.session,
      p.purpose === "owner_qr" ? p.recovery : null,
    ])
  ).rows[0].upload;
}
async function finish(f, lease) {
  return (
    await db.query(
      "select finish_receipt_upload($1,$2,$3,$4,'image/png',10,10) as finished",
      [f.id, f.actor, f.session, lease],
    )
  ).rows[0].finished;
}
async function store(scanId, attemptId) {
  return (
    await db.query(
      "select store_receipt_extraction_v2($1,$2,'Test','2026-10-20','USD',100,0,0,0,100,'fixture','request',$3) as saved",
      [
        scanId,
        attemptId,
        JSON.stringify([
          {
            position: 0,
            description: "Test item",
            quantity: 1,
            unit_price_minor: 100,
            total_minor: 100,
            confidence_basis_points: 9500,
            needs_review: true,
          },
        ]),
      ],
    )
  ).rows[0].saved;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  const folder = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(folder))
    .filter((p) => p.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(new URL(name, folder), "utf8"));
}, 30000);
afterAll(async () => db?.close());

it("finalizes exactly one receipt and schedules only the winning completion", async () => {
  const f = await fixture();
  const uploaded = await claim(f);
  expect(uploaded.acquired).toBe(true);
  await expect(claim(f)).rejects.toThrow(/still being processed/);
  expect(await finish(f, uploaded.lease_id)).toEqual({
    scan_id: f.id,
    should_process: true,
  });
  expect((await claim(f)).acquired).toBe(false);
  expect(await finish(f, uploaded.lease_id)).toEqual({
    scan_id: f.id,
    should_process: false,
  });
  expect(
    (
      await db.query(
        "select count(*)::int as n from receipt_scans where id=$1",
        [f.id],
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await db.query(
        "select count(*)::int as n from expenses where bill_id=$1",
        [f.billId],
      )
    ).rows[0].n,
  ).toBe(0);
});
it("rejects cross-bill/participant/session completion and requires the recovery key again for QR completion", async () => {
  const f = await fixture();
  const other = await fixture();
  await expect(
    claim(f, { actor: other.actor, session: other.session }),
  ).rejects.toThrow(/unavailable/);
  await expect(claim(f, { session: hash() })).rejects.toThrow(/unavailable/);
  const qr = await fixture("owner_qr");
  await expect(claim(qr, { recovery: hash() })).rejects.toThrow(/unavailable/);
  const ownerUpload = await claim(qr);
  await expect(
    db.query("select finish_qr_upload($1,$2,$3,$4,$5)", [
      qr.id,
      qr.actor,
      qr.session,
      hash(),
      ownerUpload.lease_id,
    ]),
  ).rejects.toThrow(/unavailable/);
  await db.query("select finish_qr_upload($1,$2,$3,$4,$5)", [
    qr.id,
    qr.actor,
    qr.session,
    qr.recovery,
    ownerUpload.lease_id,
  ]);
  expect((await claim(qr)).status).toBe("complete");
});
it("rejects expired/rejected uploads and stale leases without creating a scan", async () => {
  const expired = await fixture();
  await db.query(
    "update image_upload_reservations set expires_at=now()-interval '1 second' where id=$1",
    [expired.id],
  );
  await expect(claim(expired)).rejects.toThrow(/expired/);
  const rejected = await fixture();
  await db.query(
    "update image_upload_reservations set status='rejected' where id=$1",
    [rejected.id],
  );
  await expect(claim(rejected)).rejects.toThrow(/rejected/);
  const f = await fixture();
  const first = await claim(f);
  await db.query(
    "update image_upload_reservations set lease_started_at=now()-interval '121 seconds' where id=$1",
    [f.id],
  );
  const second = await claim(f);
  expect(second.lease_id).not.toBe(first.lease_id);
  await expect(finish(f, first.lease_id)).rejects.toThrow(/processing changed/);
  await finish(f, second.lease_id);
});
it("recovers stale extraction with a new attempt and refuses old results or failures", async () => {
  const f = await fixture();
  const uploaded = await claim(f);
  await finish(f, uploaded.lease_id);
  const first = (
    await db.query("select * from claim_receipt_extraction_v2($1)", [f.id])
  ).rows[0];
  expect(
    (await db.query("select * from claim_receipt_extraction_v2($1)", [f.id]))
      .rows,
  ).toHaveLength(0);
  await db.query(
    "update receipt_scans set processing_started_at=now()-interval '151 seconds' where id=$1",
    [f.id],
  );
  const second = (
    await db.query("select * from claim_receipt_extraction_v2($1)", [f.id])
  ).rows[0];
  expect(second.attempt_id).not.toBe(first.attempt_id);
  expect(await store(f.id, first.attempt_id)).toBe(false);
  expect(
    (
      await db.query(
        "select fail_receipt_extraction_v2($1,$2,'extraction_timed_out') as changed",
        [f.id, first.attempt_id],
      )
    ).rows[0].changed,
  ).toBe(false);
  expect(await store(f.id, second.attempt_id)).toBe(true);
  expect(
    (
      await db.query(
        "select fail_receipt_extraction_v2($1,$2,'failed') as changed",
        [f.id, second.attempt_id],
      )
    ).rows[0].changed,
  ).toBe(false);
  expect(
    (await db.query("select status from receipt_scans where id=$1", [f.id]))
      .rows[0].status,
  ).toBe("needs_review");
  expect(
    (
      await db.query(
        "select count(*)::int as n from receipt_items where receipt_scan_id=$1",
        [f.id],
      )
    ).rows[0].n,
  ).toBe(1);
});
it("denies public access and retires unguarded extraction workers", async () => {
  const f = await fixture();
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try {
      await expect(
        db.query("select * from image_upload_reservations"),
      ).rejects.toThrow(/permission/);
      await expect(claim(f)).rejects.toThrow(/permission/);
    } finally {
      await db.exec("reset role");
    }
  }
  await db.exec("set role service_role");
  try {
    await expect(
      db.query("select * from claim_receipt_extraction($1)", [f.id]),
    ).rejects.toThrow(/permission/);
  } finally {
    await db.exec("reset role");
  }
  const bucket = (
    await db.query(
      "select * from storage.buckets where id='image-upload-staging'",
    )
  ).rows[0];
  expect(bucket.public).toBe(false);
  expect(Number(bucket.file_size_limit)).toBe(10 * 1024 * 1024);
});
