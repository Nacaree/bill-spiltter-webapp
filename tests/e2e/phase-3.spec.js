import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";

test("create bill → join → expense → owner QR → settle → correct → remove", async ({
  browser,
  page,
}) => {
  test.skip(
    process.env.RUN_SUPABASE_E2E !== "1",
    "Apply migrations and run npm run test:e2e:phase3.",
  );
  const billName = `Phase 3 browser ${Date.now()}`;
  let shareToken;
  const guestContext = await browser.newContext();
  try {
    await page.goto("/");
    await page.getByLabel("Bill name").fill(billName);
    await page.getByLabel("Your name", { exact: true }).fill("Test Owner");
    await page
      .getByRole("button", { name: "Create bill", exact: true })
      .click();
    await expect(page).toHaveURL(/\/b\/[A-Za-z0-9_-]{43}$/);
    shareToken = new URL(page.url()).pathname.split("/").at(-1);
    const url = page.url();
    const guest = await guestContext.newPage();
    await guest.goto(url);
    await guest.getByLabel("Your name", { exact: true }).fill("Test Guest");
    await guest.getByRole("button", { name: "Join bill", exact: true }).click();
    await expect(guest.getByText("You’re joining as")).toBeVisible();
    await expect(guest.getByText("Owner ABA QR settings")).toHaveCount(0);
    await page.reload();

    // Synthetic, non-payable KHQR with a valid CRC for upload validation.
    const prefix =
      "00020101021129200016phase3@testbankx5204599953038405802KH5910Test Owner6010Phnom Penh6304";
    let crc = 0xffff;
    for (const byte of Buffer.from(prefix)) {
      crc ^= byte << 8;
      for (let bit = 0; bit < 8; bit++)
        crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
    }
    const image = await QRCode.toBuffer(
      prefix + crc.toString(16).toUpperCase().padStart(4, "0"),
      { width: 500 },
    );
    await page.getByText("Owner ABA QR settings", { exact: true }).click();
    await page.getByLabel("QR image", { exact: true }).setInputFiles({
      name: "synthetic-qr.png",
      mimeType: "image/png",
      buffer: image,
    });
    await page.getByRole("button", { name: "Inspect QR image" }).click();
    await expect(page.getByText("Decoded recipient:")).toBeVisible();
    await page
      .getByLabel(
        "I confirm this is my recipient name and the correct currency.",
      )
      .check();
    await page
      .getByRole("button", { name: "Save owner QR", exact: true })
      .click();
    await expect(page.getByText("Current recipient:")).toHaveCount(1);

    const expenseSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Add an expense", exact: true }),
    });
    await expenseSection.getByLabel("What was it?").fill("Browser dinner");
    await expenseSection.getByLabel("Total (USD)").fill("10.00");
    await expenseSection
      .getByRole("button", { name: "Add expense", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Browser dinner", exact: true }),
    ).toBeVisible();
    await guest.reload();
    const balances = guest.locator("#balances");
    await expect(balances.getByText("Test Guest → Test Owner")).toBeVisible();
    await balances.getByRole("button", { name: "Pay with ABA QR" }).click();
    await expect(
      balances.getByRole("img", { name: "Payment QR for Test Owner" }),
    ).toBeVisible();
    await expect(balances.getByText("No payments recorded yet.")).toBeVisible();
    await balances.getByText("Record this payment", { exact: true }).click();
    const payment = balances
      .locator("form")
      .filter({
        has: guest.getByRole("button", { name: "Record payment", exact: true }),
      })
      .first();
    await payment
      .getByLabel("I confirm this payment already happened outside the app.")
      .check();
    await payment
      .getByRole("button", { name: "Record payment", exact: true })
      .click();
    await expect(
      balances.getByText("All settled! Everyone’s balance is zero."),
    ).toBeVisible();
    await expect(
      balances.getByText("Test Guest paid Test Owner $5.00"),
    ).toHaveCount(1);
    await balances.getByText("Correct payment record", { exact: true }).click();
    await balances.getByLabel("Payment amount (USD)").last().fill("2.00");
    const correction = balances.locator("form").filter({
      has: guest.getByRole("button", { name: "Save payment changes" }),
    });
    await correction
      .getByLabel("I confirm this payment already happened outside the app.")
      .check();
    await correction
      .getByRole("button", { name: "Save payment changes" })
      .click();
    await expect(
      balances.getByText("Owes $3.00", { exact: true }),
    ).toBeVisible();
    guest.once("dialog", (dialog) => dialog.accept());
    await balances
      .getByRole("button", { name: "Remove payment record" })
      .click();
    await expect(
      balances.getByText("Owes $5.00", { exact: true }),
    ).toBeVisible();
  } finally {
    await guestContext.close();
    // Only remove the synthetic bill this test just created.
    if (shareToken && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      );
      const { data: bill } = await db
        .from("bills")
        .select("id")
        .eq(
          "public_id_hash",
          createHash("sha256").update(shareToken).digest("hex"),
        )
        .eq("name", billName)
        .maybeSingle();
      if (bill) {
        const { data: images } = await db.storage
          .from("payment-qrs")
          .list(bill.id);
        if (images?.length)
          await db.storage
            .from("payment-qrs")
            .remove(images.map((i) => `${bill.id}/${i.name}`));
        const { error } = await db.from("bills").delete().eq("id", bill.id);
        if (error) throw error;
      }
    }
  }
});
