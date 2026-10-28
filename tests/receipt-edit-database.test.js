// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";
import { calculateBalances } from "@/lib/balances";
let db;
const hash = () => randomBytes(32).toString("hex");
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  const folder = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(folder))
    .filter((name) => name.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(new URL(file, folder), "utf8"));
}, 30000);
afterAll(async () => db?.close());
async function fixture() {
  const share = hash(),
    session = hash();
  const {
    rows: [bill],
  } = await db.query(
    "select * from create_bill_with_creator('Receipt edit','USD',$1,$2,'Owner',$3)",
    [share, hash(), session],
  );
  const {
    rows: [guest],
  } = await db.query("select * from join_bill($1,'Guest',$2)", [share, hash()]);
  const scan = randomUUID(),
    key = randomUUID();
  await db.query(
    "insert into receipt_scans(id,bill_id,uploaded_by_participant_id,storage_key,original_filename,mime_type,image_width,image_height,currency,status,total_minor) values($1,$2,$3,$4,'receipt.png','image/png',10,10,'USD','needs_review',1101)",
    [scan, bill.bill_id, bill.participant_id, `${bill.bill_id}/${scan}`],
  );
  const f = {
    bill: bill.bill_id,
    owner: bill.participant_id,
    guest: guest.participant_id,
    share,
    session,
    scan,
    key,
  };
  f.items = [
    {
      client_key: "one",
      position: 0,
      description: "Dinner",
      quantity: 1,
      unit_price_minor: 1001,
      total_minor: 1001,
      needs_review: false,
    },
  ];
  f.assignments = [
    { client_key: "one", participant_id: f.owner, amount_minor: 501 },
    { client_key: "one", participant_id: f.guest, amount_minor: 500 },
  ];
  f.shares = [
    { participant_id: f.owner, amount_minor: 551 },
    { participant_id: f.guest, amount_minor: 550 },
  ];
  const {
    rows: [saved],
  } = await db.query(
    "select * from confirm_receipt_expense($1,$2,$3,$4,$5,'Dinner',$2,'food','2026-10-28','Cafe',1001,100,0,0,1101,'proportional',$6,$7,$8)",
    [
      share,
      f.owner,
      session,
      scan,
      key,
      JSON.stringify(f.items),
      JSON.stringify(f.assignments),
      JSON.stringify(f.shares),
    ],
  );
  f.expense = saved.expense_id;
  const {
    rows: [item],
  } = await db.query("select id from receipt_items where receipt_scan_id=$1", [
    scan,
  ]);
  f.items[0].saved_item_id = item.id;
  await db.query("update expenses set notes='Keep this note' where id=$1", [
    f.expense,
  ]);
  f.version = (
    await db.query(
      "select updated_at::text as version from expenses where id=$1",
      [f.expense],
    )
  ).rows[0].version;
  return f;
}
async function save(f, overrides = {}) {
  const p = {
    actor: f.owner,
    session: f.session,
    share: f.share,
    expense: f.expense,
    version: f.version,
    items: f.items,
    assignments: f.assignments,
    shares: f.shares,
    ...overrides,
  };
  return db.query(
    "select * from update_receipt_expense($1,$2,$3,$4,$5,$6,'Dinner corrected',$7,'food','2026-10-28','Cafe',1001,100,0,0,1101,'proportional',$8,$9,$10)",
    [
      p.share,
      p.actor,
      p.session,
      f.scan,
      p.expense,
      p.version,
      f.owner,
      JSON.stringify(p.items),
      JSON.stringify(p.assignments),
      JSON.stringify(p.shares),
    ],
  );
}
async function state(f) {
  return (
    await db.query(
      "select row_to_json(e) as expense, (select jsonb_agg(s order by s.participant_id) from expense_shares s where s.expense_id=e.id) as shares, (select jsonb_agg(i order by i.position) from receipt_items i where i.receipt_scan_id=$2) as items from expenses e where e.id=$1",
      [f.expense, f.scan],
    )
  ).rows[0];
}
it("updates the original expense and assignments, preserving payments, notes and confirmation identity", async () => {
  const f = await fixture();
  const payment = randomUUID();
  await db.query(
    "select save_bill_settlement($1,$2,$3,$4,'create',$5,$2,100,'2026-10-28','paid',null)",
    [f.share, f.owner, f.session, payment, f.guest],
  );
  const before = (
    await db.query(
      "select row_to_json(s) as value from settlements s where id=$1",
      [payment],
    )
  ).rows[0].value;
  const confirmed = (
    await db.query(
      "select confirmation_key,confirmed_at::text from receipt_scans where id=$1",
      [f.scan],
    )
  ).rows[0];
  const {
    rows: [third],
  } = await db.query("select * from join_bill($1,'Third',$2)", [
    f.share,
    hash(),
  ]);
  const ids = [f.owner, f.guest, third.participant_id];
  await save(f, {
    assignments: ids.map((id, index) => ({
      client_key: "one",
      participant_id: id,
      amount_minor: index === 2 ? 333 : 334,
    })),
    shares: ids.map((id) => ({ participant_id: id, amount_minor: 367 })),
  });
  const after = await state(f);
  expect(after.expense.id).toBe(f.expense);
  expect(after.expense.notes).toBe("Keep this note");
  expect(after.expense.description).toBe("Dinner corrected");
  expect(after.items[0].id).toBe(f.items[0].saved_item_id);
  expect(after.shares.map((s) => s.amount_minor)).toEqual([367, 367, 367]);
  expect(
    (
      await db.query(
        "select count(*)::int as n from expenses where bill_id=$1",
        [f.bill],
      )
    ).rows[0].n,
  ).toBe(1);
  expect(
    (
      await db.query(
        "select row_to_json(s) as value from settlements s where id=$1",
        [payment],
      )
    ).rows[0].value,
  ).toEqual(before);
  expect(
    (
      await db.query(
        "select confirmation_key,confirmed_at::text from receipt_scans where id=$1",
        [f.scan],
      )
    ).rows[0],
  ).toEqual(confirmed);
  const ledger = (
    await db.query("select get_bill_ledger($1) as value", [f.share])
  ).rows[0].value;
  const balances = calculateBalances({
    ...ledger,
    expenses: ledger.expenses.map((e) => ({
      ...e,
      amount_minor: Number(e.amount_minor),
      shares: e.shares.map((s) => ({
        ...s,
        amountMinor: Number(s.amountMinor),
      })),
    })),
    settlements: ledger.settlements.map((s) => ({
      ...s,
      amount_minor: Number(s.amount_minor),
    })),
  });
  expect(balances.find((p) => p.id === f.guest).netMinor).toBe(-267);
  expect(balances.find((p) => p.id === third.participant_id).netMinor).toBe(
    -367,
  );
  const replay = await db.query(
    "select * from confirm_receipt_expense($1,$2,$3,$4,$5,'old',$2,'food','2026-10-28','Cafe',1001,100,0,0,1101,'proportional',$6,$7,$8)",
    [
      f.share,
      f.owner,
      f.session,
      f.scan,
      f.key,
      JSON.stringify(f.items),
      JSON.stringify(f.assignments),
      JSON.stringify(f.shares),
    ],
  );
  expect(replay.rows[0].expense_id).toBe(f.expense);
  expect((await state(f)).expense.description).toBe("Dinner corrected");
});
it("allows another joined participant but rejects stale retries without overwriting the saved result", async () => {
  const f = await fixture();
  const session = hash();
  await db.query(
    "update bill_participants set session_token_hash=$1 where id=$2",
    [session, f.guest],
  );
  await save(f, { actor: f.guest, session });
  const after = await state(f);
  await expect(save(f)).rejects.toMatchObject({ code: "P0005" });
  expect(await state(f)).toEqual(after);
});
it("rolls back invalid item allocations and rejects foreign items, sessions and share links", async () => {
  const f = await fixture(),
    before = await state(f);
  const invalid = [
    { assignments: [{ ...f.assignments[0], amount_minor: 1000 }] },
    { items: [{ ...f.items[0], saved_item_id: randomUUID() }] },
    { assignments: [...f.assignments, f.assignments[0]] },
    {
      assignments: [
        ...f.assignments,
        { client_key: "missing", participant_id: f.owner, amount_minor: 0 },
      ],
    },
    { shares: [{ participant_id: f.owner, amount_minor: 100 }] },
    { session: hash() },
    { share: hash() },
    { expense: randomUUID() },
  ];
  for (const options of invalid) {
    await expect(save(f, options)).rejects.toThrow();
    expect(await state(f)).toEqual(before);
  }
});
it("retains historical inactive assignments but prevents adding them to a new item", async () => {
  const f = await fixture();
  await db.query(
    "update bill_participants set deactivated_at=now() where id=$1",
    [f.guest],
  );
  await save(f);
  const version = (
    await db.query(
      "select updated_at::text as value from expenses where id=$1",
      [f.expense],
    )
  ).rows[0].value;
  await expect(
    save(f, { version, items: [{ ...f.items[0], saved_item_id: null }] }),
  ).rejects.toMatchObject({ code: "P0004" });
  await expect(
    save(f, {
      version,
      assignments: [
        { client_key: "one", participant_id: f.owner, amount_minor: 601 },
        { client_key: "one", participant_id: f.guest, amount_minor: 400 },
      ],
    }),
  ).rejects.toMatchObject({ code: "P0004" });
});
it("blocks generic receipt expense edits and never restores a removed expense", async () => {
  const f = await fixture();
  await expect(
    db.query(
      "select * from update_manual_expense($1,$2,$3,$4,'changed',1101,$2,'exact','food','2026-10-28','notes',$5)",
      [f.share, f.owner, f.session, f.expense, JSON.stringify(f.shares)],
    ),
  ).rejects.toMatchObject({ code: "P0004" });
  await db.query("update expenses set deleted_at=now() where id=$1", [
    f.expense,
  ]);
  await expect(save(f)).rejects.toMatchObject({ code: "P0004" });
});
it.each(["expired", "archived"])("rejects %s bills", async (kind) => {
  const f = await fixture();
  await db.query(
    kind === "expired"
      ? "update bills set expires_at=clock_timestamp() where id=$1"
      : "update bills set archived_at=clock_timestamp() where id=$1",
    [f.bill],
  );
  await expect(save(f)).rejects.toMatchObject({ code: "P0001" });
});
it("does not expose the editing RPC to anonymous or authenticated database clients", async () => {
  const {
    rows: [row],
  } = await db.query(
    "select has_function_privilege('anon','update_receipt_expense(text,uuid,text,uuid,uuid,timestamptz,text,uuid,text,date,text,bigint,bigint,bigint,bigint,bigint,receipt_adjustment_method,jsonb,jsonb,jsonb)','execute') as anon,has_function_privilege('authenticated','update_receipt_expense(text,uuid,text,uuid,uuid,timestamptz,text,uuid,text,date,text,bigint,bigint,bigint,bigint,bigint,receipt_adjustment_method,jsonb,jsonb,jsonb)','execute') as authenticated",
  );
  expect(row).toEqual({ anon: false, authenticated: false });
});

it("allows service-role execution including the receipt version trigger", async () => {
  const f = await fixture();
  await db.exec("set role service_role");
  try {
    expect((await save(f)).rows[0].expense_id).toBe(f.expense);
  } finally {
    await db.exec("reset role");
  }
});
