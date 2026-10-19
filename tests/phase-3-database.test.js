// @vitest-environment node
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { calculateBalances } from "@/lib/balances";

let db;
const hash = () => randomBytes(32).toString("hex");
async function fixture() {
  const share = hash();
  const recovery = hash();
  const session = hash();
  const {
    rows: [created],
  } = await db.query(
    "select * from create_bill_with_creator($1, 'USD', $2, $3, 'Owner', $4)",
    ["Phase 3 test", share, recovery, session],
  );
  const {
    rows: [guest],
  } = await db.query("select * from join_bill($1, 'Guest', $2)", [
    share,
    hash(),
  ]);
  return {
    billId: created.bill_id,
    owner: created.participant_id,
    guest: guest.participant_id,
    share,
    recovery,
    session,
  };
}
async function save(f, options = {}) {
  const input = {
    id: randomUUID(),
    operation: "create",
    from: f.guest,
    to: f.owner,
    amount: 500,
    date: "2026-10-17",
    notes: "",
    version: null,
    ...options,
  };
  const {
    rows: [row],
  } = await db.query(
    "select save_bill_settlement($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as id",
    [
      f.share,
      f.owner,
      f.session,
      input.id,
      input.operation,
      input.from,
      input.to,
      input.amount,
      input.date,
      input.notes,
      input.version,
    ],
  );
  return row.id;
}
async function ledger(f) {
  const {
    rows: [row],
  } = await db.query("select get_bill_ledger($1) as ledger", [f.share]);
  const data = row.ledger;
  return {
    ...data,
    expenses: data.expenses.map((e) => ({
      ...e,
      amount_minor: Number(e.amount_minor),
      shares: e.shares.map((s) => ({
        ...s,
        amountMinor: Number(s.amountMinor),
      })),
    })),
    settlements: data.settlements.map((s) => ({
      ...s,
      amount_minor: Number(s.amount_minor),
    })),
  };
}
async function qr(f, changes = {}) {
  const p = {
    operation: "save",
    methodId: null,
    version: null,
    key: `${f.billId}/${randomUUID()}.png`,
    currency: "USD",
    payloadHash: hash(),
    recovery: f.recovery,
    actor: f.owner,
    fixed: null,
    ...changes,
  };
  return db.query(
    changes.v2
      ? "select save_bill_payment_method_v2($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,null,$13)"
      : "select save_bill_payment_method($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,null)",
    [
      f.share,
      p.recovery,
      p.actor,
      f.session,
      p.operation,
      p.methodId,
      p.version,
      p.key,
      "Test Owner",
      p.currency,
      p.payloadHash,
      p.fixed,
      ...(changes.v2 ? [changes.currencies ?? null] : []),
    ],
  );
}

describe("Phase 3 PostgreSQL transactions and permissions", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);",
    );
    const folder = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(folder))
      .filter((p) => p.endsWith(".sql"))
      .sort())
      await db.exec(await readFile(new URL(name, folder), "utf8"));
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });

  it("applies all migrations and keeps expense shares and settlements zero-sum", async () => {
    const f = await fixture();
    await db.query(
      "select create_manual_expense($1,$2,$3,'Dinner',1001,$2,'equal','food','2026-10-17','',$4)",
      [
        f.share,
        f.owner,
        f.session,
        JSON.stringify([
          { participant_id: f.owner, amount_minor: 501 },
          { participant_id: f.guest, amount_minor: 500 },
        ]),
      ],
    );
    let data = await ledger(f);
    expect(calculateBalances(data).map((p) => p.netMinor)).toEqual([500, -500]);
    const id = await save(f);
    data = await ledger(f);
    expect(calculateBalances(data).map((p) => p.netMinor)).toEqual([0, 0]);
    // Identical retries do not duplicate payments or activity.
    await save(f, { id });
    expect((await ledger(f)).settlements).toHaveLength(1);
    expect(
      (
        await db.query(
          "select count(*)::int as count from activity_log where entity_id=$1",
          [id],
        )
      ).rows[0].count,
    ).toBe(1);
    await expect(save(f, { id, amount: 499 })).rejects.toThrow(/already/);
    const version = data.settlements[0].updated_at;
    await save(f, { id, operation: "update", amount: 200, version });
    expect(calculateBalances(await ledger(f)).map((p) => p.netMinor)).toEqual([
      300, -300,
    ]);
    await expect(save(f, { id, operation: "remove", version })).rejects.toThrow(
      /changed/,
    );
    const current = (await ledger(f)).settlements[0];
    await save(f, { id, operation: "remove", version: current.updated_at });
    expect((await ledger(f)).settlements).toHaveLength(0);
    expect(calculateBalances(await ledger(f)).map((p) => p.netMinor)).toEqual([
      500, -500,
    ]);
    expect(
      (
        await db.query(
          "select action from activity_log where entity_id=$1 order by created_at",
          [id],
        )
      ).rows.map((r) => r.action),
    ).toEqual([
      "settlement.created",
      "settlement.updated",
      "settlement.removed",
    ]);
  });
  it("rejects invalid sessions, cross-bill participants and self-payments without writes", async () => {
    const f = await fixture();
    const other = await fixture();
    await expect(save({ ...f, session: hash() })).rejects.toThrow(/Join/);
    await expect(save({ ...f, share: other.share })).rejects.toThrow(/Join/);
    await expect(save(f, { to: other.owner })).rejects.toThrow(/participants/);
    await expect(save(f, { to: f.guest })).rejects.toThrow(/participants/);
    await expect(save(f, { amount: 0 })).rejects.toThrow(/amount/);
    expect((await ledger(f)).settlements).toHaveLength(0);
    await db.query(
      "update bill_participants set deactivated_at=now() where id=$1",
      [f.guest],
    );
    await save(f);
    expect((await ledger(f)).participants).toHaveLength(2);
  });
  it("requires both creator credentials, validates currency and atomically replaces/removes a QR", async () => {
    const f = await fixture();
    await expect(qr(f, { recovery: hash() })).rejects.toThrow(/Creator/);
    await expect(qr(f, { actor: f.guest })).rejects.toThrow(/Creator/);
    await expect(qr(f, { currency: "KHR" })).rejects.toThrow(/Invalid/);
    const payloadHash = hash();
    await qr(f, { payloadHash });
    let {
      rows: [method],
    } = await db.query("select * from bill_payment_methods where bill_id=$1", [
      f.billId,
    ]);
    const version = method.updated_at.toISOString();
    await expect(qr(f)).rejects.toThrow(/changed/);
    await expect(
      qr(f, { methodId: method.id, version, payloadHash }),
    ).rejects.toThrow(/already/);
    const oldKey = method.qr_storage_key;
    const replaced = await qr(f, { methodId: method.id, version, fixed: 500 });
    expect(replaced.rows[0].save_bill_payment_method).toBe(oldKey);
    ({
      rows: [method],
    } = await db.query("select * from bill_payment_methods where bill_id=$1", [
      f.billId,
    ]));
    await qr(f, {
      operation: "remove",
      methodId: method.id,
      version: method.updated_at.toISOString(),
    });
    expect(
      (
        await db.query("select * from bill_payment_methods where bill_id=$1", [
          f.billId,
        ])
      ).rows,
    ).toHaveLength(0);
    const events = (
      await db.query(
        "select metadata from activity_log where bill_id=$1 and entity_type='payment_method'",
        [f.billId],
      )
    ).rows;
    expect(events).toHaveLength(3);
    expect(events.every((e) => JSON.stringify(e.metadata) === "{}")).toBe(true);
  });
  it("allows a confirmed dual-currency QR with KHR default on a USD bill and permits correcting a previously saved QR", async () => {
    const f = await fixture();
    await qr(f, { v2: true, currency: "KHR", currencies: ["USD", "KHR"] });
    let {
      rows: [method],
    } = await db.query("select * from bill_payment_methods where bill_id=$1", [
      f.billId,
    ]);
    expect(method.supported_currencies).toEqual(["KHR", "USD"]);
    expect(method.fixed_amount_minor).toBe(null);
    // Correct a dual-currency selection without changing the actual QR image.
    const changes = {
      v2: true,
      currency: "USD",
      currencies: ["USD"],
      payloadHash: method.qr_payload_hash,
      methodId: method.id,
      version: method.updated_at.toISOString(),
    };
    await qr(f, changes);
    ({
      rows: [method],
    } = await db.query("select * from bill_payment_methods where bill_id=$1", [
      f.billId,
    ]));
    expect(method.supported_currencies).toEqual(["USD"]);
    await qr(f, {
      ...changes,
      currencies: ["KHR", "USD"],
      version: method.updated_at.toISOString(),
    });
    ({
      rows: [method],
    } = await db.query("select * from bill_payment_methods where bill_id=$1", [
      f.billId,
    ]));
    await expect(
      qr(f, {
        ...changes,
        currencies: ["KHR", "USD"],
        version: method.updated_at.toISOString(),
      }),
    ).rejects.toThrow(/already/);
    await expect(
      qr(f, {
        ...changes,
        currencies: ["USD"],
        recovery: hash(),
        version: method.updated_at.toISOString(),
      }),
    ).rejects.toThrow(/Creator/);
  });
  it("rejects invalid currency selections and never applies a fixed amount to two currencies", async () => {
    const f = await fixture();
    for (const currencies of [
      [],
      ["KHR"],
      ["EUR"],
      ["USD", "USD"],
      ["USD", null],
    ]) {
      await expect(qr(f, { v2: true, currencies })).rejects.toThrow(
        /currencies/,
      );
    }
    await expect(
      qr(f, { v2: true, currency: "KHR", currencies: ["USD"] }),
    ).rejects.toThrow(/currencies/);
    await expect(
      qr(f, { v2: true, currencies: ["KHR", "USD"], fixed: 500 }),
    ).rejects.toThrow(/fixed/);
    expect(
      (
        await db.query("select * from bill_payment_methods where bill_id=$1", [
          f.billId,
        ])
      ).rows,
    ).toHaveLength(0);
    await qr(f, { v2: true, currencies: ["USD"], fixed: 500 });
    const {
      rows: [method],
    } = await db.query("select * from bill_payment_methods where bill_id=$1", [
      f.billId,
    ]);
    await expect(
      db.query(
        "update bill_payment_methods set supported_currencies=array['KHR','USD'] where id=$1",
        [method.id],
      ),
    ).rejects.toThrow(/fixed_currency_check/);
  });
  it("denies anon/authenticated direct reads and RPC execution and keeps storage private", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      try {
        await expect(db.query("select * from settlements")).rejects.toThrow(
          /permission/,
        );
        await expect(
          db.query("select * from bill_payment_methods"),
        ).rejects.toThrow(/permission/);
        await expect(
          db.query("select get_bill_ledger($1)", [hash()]),
        ).rejects.toThrow(/permission/);
        await expect(
          db.query("select save_bill_payment_method_v2($1,$2,$3,$4,'save')", [
            hash(),
            hash(),
            randomUUID(),
            hash(),
          ]),
        ).rejects.toThrow(/permission/);
        await expect(
          db.query("select save_bill_settlement($1,$2,$3,$4,'create')", [
            hash(),
            randomUUID(),
            hash(),
            randomUUID(),
          ]),
        ).rejects.toThrow(/permission/);
      } finally {
        await db.exec("reset role");
      }
    }
    expect(
      (
        await db.query(
          "select public from storage.buckets where id='payment-qrs'",
        )
      ).rows[0].public,
    ).toBe(false);
  });
});
