// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const integrationEnabled = process.env.RUN_SUPABASE_INTEGRATION === "1";
const liveDescribe = integrationEnabled ? describe : describe.skip;
const createdBillIds = [];
let addParticipant;
let allocateReceipt;
let confirmReceiptExpense;
let createBillWithCreator;
let createReceiptScan;
let deleteReceiptImage;
let getExpenses;
let getReceiptScan;
let getServerSupabase;

function uniqueName(prefix) {
  return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function tinyPng() {
  const bytes = new Uint8Array(36);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 10, 0, 0, 0, 10], 16);
  bytes.set([0x49, 0x45, 0x4e, 0x44], 28);
  return new File([bytes], "receipt.png", { type: "image/png" });
}

liveDescribe("Phase 2 live receipt confirmation", () => {
  beforeAll(async () => {
    ({ addParticipant, createBillWithCreator } =
      await import("@/server/bills"));
    ({ getExpenses } = await import("@/server/expenses"));
    ({ allocateReceipt } = await import("@/lib/receipt-allocation"));
    ({
      confirmReceiptExpense,
      createReceiptScan,
      deleteReceiptImage,
      getReceiptScan,
    } = await import("@/server/receipts"));
    ({ getServerSupabase } = await import("@/lib/supabase-server"));
    const { data: staleBills } = await getServerSupabase()
      .from("bills")
      .select("id")
      .like("name", "Receipt transaction %");
    if (staleBills?.length) {
      const { error } = await getServerSupabase()
        .from("bills")
        .delete()
        .in(
          "id",
          staleBills.map((bill) => bill.id),
        );
      if (error) throw error;
    }
  });

  afterAll(async () => {
    if (!createdBillIds.length) return;
    const { error } = await getServerSupabase()
      .from("bills")
      .delete()
      .in("id", createdBillIds);
    if (error) throw error;
  });

  it("keeps a draft out of balances and confirms it exactly once", async () => {
    const created = await createBillWithCreator({
      billName: uniqueName("Receipt transaction"),
      currency: "USD",
      participantName: uniqueName("Creator"),
    });
    createdBillIds.push(created.billId);
    const second = await addParticipant({
      cookieValue: created.sessionValue,
      participantName: uniqueName("Friend"),
      shareToken: created.shareToken,
    });
    const { data: creator } = await getServerSupabase()
      .from("bill_participants")
      .select("id")
      .eq("bill_id", created.billId)
      .eq("is_creator", true)
      .single();

    const uploaded = await createReceiptScan({
      cookieValue: created.sessionValue,
      file: tinyPng(),
      shareToken: created.shareToken,
    });
    expect(await getExpenses(created.billId)).toHaveLength(0);

    const supabase = getServerSupabase();
    const { error: claimError } = await supabase.rpc(
      "claim_receipt_extraction",
      { target_scan_id: uploaded.scanId },
    );
    expect(claimError).toBeNull();
    const { error: storeError } = await supabase.rpc(
      "store_receipt_extraction",
      {
        extracted_currency: "USD",
        extracted_discount_minor: 0,
        extracted_items: [
          {
            confidence_basis_points: 9500,
            description: "Dinner",
            needs_review: false,
            position: 0,
            quantity: 1,
            total_minor: 1001,
            unit_price_minor: 1001,
          },
        ],
        extracted_merchant_name: "Live receipt",
        extracted_receipt_date: "2026-08-16",
        extracted_subtotal_minor: 1001,
        extracted_tax_minor: 80,
        extracted_tip_minor: 119,
        extracted_total_minor: 1200,
        extraction_provider: "integration-fixture",
        extraction_provider_request_id: "fixture-1",
        target_scan_id: uploaded.scanId,
      },
    );
    expect(storeError).toBeNull();
    expect(await getExpenses(created.billId)).toHaveLength(0);

    const scan = await getReceiptScan(created.billId, uploaded.scanId);
    expect(scan).toMatchObject({ status: "needs_review", total_minor: 1200 });
    const itemRows = [
      {
        clientKey: "0",
        confidenceBasisPoints: 9500,
        description: "Dinner",
        needsReview: false,
        participantIds: [creator.id, second.participantId],
        position: 0,
        totalMinor: 1001,
      },
    ];
    const allocated = allocateReceipt({
      adjustmentMethod: "proportional",
      items: itemRows,
      totalMinor: 1200,
    });
    const confirmationKey = crypto.randomUUID();
    const confirmation = {
      adjustmentMethod: "proportional",
      assignmentRows: allocated.itemAssignments,
      category: "food",
      confirmationKey,
      cookieValue: created.sessionValue,
      description: "Live receipt",
      discountMinor: 0,
      expenseDate: "2026-08-16",
      finalShares: allocated.finalShares,
      itemRows,
      merchantName: "Live receipt",
      paidByParticipantId: creator.id,
      receiptScanId: uploaded.scanId,
      shareToken: created.shareToken,
      subtotalMinor: 1001,
      taxMinor: 80,
      tipMinor: 119,
      totalMinor: 1200,
    };
    const first = await confirmReceiptExpense(confirmation);
    const repeated = await confirmReceiptExpense(confirmation);
    expect(repeated.expenseId).toBe(first.expenseId);

    const expenses = await getExpenses(created.billId);
    expect(expenses).toHaveLength(1);
    expect(
      expenses[0].shares.reduce((sum, share) => sum + share.amountMinor, 0),
    ).toBe(1200);
    await deleteReceiptImage(uploaded.scanId);
    const { error: missingImage } = await supabase.storage
      .from("receipt-images")
      .download(scan.storage_key);
    expect(missingImage).toBeTruthy();
  });
});
