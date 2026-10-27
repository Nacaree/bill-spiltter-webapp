import { createHash, randomBytes, randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createParticipantSession } from "../../src/lib/participant-session.js";

async function accessible(page) {
  const result = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  // Measure interactive menu triggers, excluding hidden native form bridges.
  const heights = await page
    .getByRole("combobox")
    .evaluateAll((selects) =>
      selects.map((select) => select.getBoundingClientRect().height),
    );
  expect(heights.every((height) => height >= 44)).toBe(true);
}

async function fits(page) {
  const width = await page.evaluate(() => window.innerWidth);
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(width);
}

test("home supports keyboard navigation, labelled controls and narrow layouts", async ({
  page,
  isMobile,
  browserName,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Create a bill" }),
  ).toBeVisible();
  if (!isMobile) {
    // Safari uses Option+Tab for links when full keyboard access is off.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Bill name")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Your name", { exact: true })).toBeFocused();
  }
  await accessible(page);
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await fits(page);
  }
  await page.goto("/b/invalid");
  await expect(
    page.getByRole("heading", { name: "That bill could not be found." }),
  ).toBeVisible();
  await fits(page);
  await accessible(page);
});

test("bill, expense, settlement and receipt controls remain accessible on small screens", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.RUN_SUPABASE_E2E !== "1",
    "Opt in with npm run test:e2e:a11y:live; creates and removes synthetic data.",
  );
  test.setTimeout(180_000);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const token = () => randomBytes(32).toString("base64url");
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const shareToken = token();
  const sessionToken = token();
  const recoveryToken = token();
  const name = `Mobile a11y ${Date.now()} ${"LongBillName".repeat(6)}`;
  let billId;
  try {
    // Seed only this test bill; no image extraction or scan quota is needed.
    const { data, error } = await db.rpc("create_bill_with_creator", {
      bill_name: name,
      bill_currency: "USD",
      creator_name: "OwnerWithALongNameWithoutSpacesForResponsiveLayoutChecks",
      share_hash: hash(shareToken),
      recovery_hash: hash(recoveryToken),
      participant_session_hash: hash(sessionToken),
    });
    expect(error).toBeNull();
    const created = Array.isArray(data) ? data[0] : data;
    billId = created.bill_id;
    const session = createParticipantSession({
      billId,
      participantId: created.participant_id,
      sessionToken,
      secret: process.env.PARTICIPANT_SESSION_SECRET,
    });
    await context.addCookies([
      {
        name: "bill_participant",
        value: session.value,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
      {
        name: "bill_creator",
        value: recoveryToken,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const billUrl = `/b/${shareToken}`;
    await page.goto(billUrl);
    await page
      .getByLabel("Add someone")
      .fill("GuestWithALongNameWithoutSpacesForResponsiveLayoutChecks");
    await page.getByRole("button", { name: "Add person", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Person added." }),
    ).toBeVisible();
    await page
      .getByLabel("What was it?", { exact: true })
      .fill("DinnerWithAnUnbrokenDescriptionThatNeedsToWrapOnPhones");
    await page
      .getByRole("group", { name: "Split between", exact: true })
      .getByRole("checkbox", {
        name: "GuestWithALongNameWithoutSpacesForResponsiveLayoutChecks",
        exact: true,
      })
      .check();
    await page.getByLabel("Total (USD)", { exact: true }).fill("bad amount");
    await page
      .getByRole("button", { name: "Add expense", exact: true })
      .click();
    const amount = page.getByRole("textbox", {
      name: "Total (USD)",
      exact: true,
    });
    await expect(amount).toBeFocused();
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(amount).toHaveValue("bad amount");
    await amount.fill("10.00");
    await page
      .getByRole("button", { name: "Add expense", exact: true })
      .click();
    const expense = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        name: "DinnerWithAnUnbrokenDescriptionThatNeedsToWrapOnPhones",
      }),
    });
    await expect(expense).toBeVisible();
    await expense.getByRole("button", { name: "Edit", exact: true }).click();
    await expense.getByRole("combobox", { name: "Split", exact: true }).click();
    await page
      .getByRole("option", { name: "Exact amounts", exact: true })
      .click();
    await page.getByText("Owner ABA QR settings", { exact: true }).click();
    await page.getByText("Record this payment", { exact: true }).click();
    await accessible(page);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      await fits(page);
      if (width === 320)
        await page.screenshot({
          path: test.info().outputPath("bill-320.png"),
          fullPage: true,
        });
    }
    await expense.getByRole("combobox", { name: "Split", exact: true }).click();
    await page.getByRole("option", { name: "Equally", exact: true }).click();
    await expense.getByRole("button", { name: "Save changes" }).click();
    await expect(
      expense.getByRole("button", { name: "Edit", exact: true }),
    ).toBeFocused();

    // Ready draft fixture exercises the real receipt page without Gemini calls.
    const scanId = randomUUID();
    const { error: scanError } = await db.from("receipt_scans").insert({
      id: scanId,
      bill_id: billId,
      uploaded_by_participant_id: created.participant_id,
      status: "needs_review",
      storage_key: `${billId}/${scanId}.png`,
      original_filename: `${"LongReceiptFilename".repeat(8)}.png`,
      mime_type: "image/png",
      image_width: 1,
      image_height: 1,
      currency: "USD",
      merchant_name: "Synthetic receipt",
      subtotal_minor: 1000,
      tax_minor: 0,
      tip_minor: 0,
      discount_minor: 0,
      total_minor: 1000,
    });
    expect(scanError).toBeNull();
    const { error: itemError } = await db.from("receipt_items").insert({
      receipt_scan_id: scanId,
      position: 0,
      description: "Synthetic item",
      quantity: 1,
      total_minor: 1000,
      unit_price_minor: 1000,
      needs_review: true,
    });
    expect(itemError).toBeNull();
    await page.goto(`${billUrl}/receipts/${scanId}`);
    await expect(page).toHaveTitle("Review receipt · Bill Splitter");
    await expect(
      page.getByRole("group", { name: "Receipt items", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "+ Add item" }).click();
    const secondItem = page.getByRole("group", { name: "Item 2", exact: true });
    await expect(
      secondItem.getByLabel("Description", { exact: true }),
    ).toBeFocused();
    await secondItem.getByRole("button", { name: "Remove item 2" }).click();
    await expect(
      page
        .getByRole("group", { name: "Item 1", exact: true })
        .getByLabel("Description", { exact: true }),
    ).toBeFocused();
    await page
      .getByLabel("Allocate tax, tip, discount, and rounding difference")
      .click();
    await page
      .getByRole("option", { name: "Custom amounts", exact: true })
      .click();
    await accessible(page);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      await fits(page);
      if (width === 320)
        await page.screenshot({
          path: test.info().outputPath("receipt-320.png"),
          fullPage: true,
        });
    }
    await page.screenshot({
      path: test.info().outputPath("receipt.png"),
      fullPage: true,
    });
  } finally {
    if (billId) {
      const { error } = await db
        .from("bills")
        .delete()
        .eq("id", billId)
        .eq("name", name);
      expect(error).toBeNull();
    }
  }
});
