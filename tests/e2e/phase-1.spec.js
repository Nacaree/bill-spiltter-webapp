import { expect, test } from "@playwright/test";

const supabaseConnected = process.env.RUN_SUPABASE_E2E === "1";

test.describe("Phase 1 bill access", () => {
  test.skip(
    !supabaseConnected,
    "Set RUN_SUPABASE_E2E=1 after connecting and migrating Supabase.",
  );

  test("a creator can share a bill and another device can join", async ({
    browser,
    page: creatorPage,
  }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const billName = `Phase 1 test ${uniqueId}`;
    const creatorName = `Creator ${uniqueId}`;
    const participantName = `Guest ${uniqueId}`;

    await creatorPage.goto("/");
    await creatorPage.getByLabel("Bill name").fill(billName);
    await creatorPage.getByLabel("Your name").fill(creatorName);
    await creatorPage.getByLabel("Currency").selectOption("USD");
    await creatorPage.getByRole("button", { name: "Create bill" }).click();

    await expect(creatorPage).toHaveURL(/\/b\/[A-Za-z0-9_-]{43}$/);
    await expect(
      creatorPage.getByRole("heading", { name: billName }),
    ).toBeVisible();
    await expect(creatorPage.getByText("You’re joining as")).toBeVisible();
    await expect(
      creatorPage.locator("aside").getByText(creatorName, { exact: true }),
    ).toBeVisible();

    const privateBillUrl = creatorPage.url();
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();

    await guestPage.goto(privateBillUrl);
    await expect(
      guestPage.getByRole("heading", { name: "Join this bill" }),
    ).toBeVisible();
    await guestPage.getByLabel("Your name").fill(participantName);
    await guestPage.getByRole("button", { name: "Join bill" }).click();

    await expect(guestPage.getByText("You’re joining as")).toBeVisible();
    await expect(
      guestPage.locator("aside").getByText(participantName, { exact: true }),
    ).toBeVisible();

    await guestPage.reload();
    await expect(guestPage.getByText("You’re joining as")).toBeVisible();
    await expect(
      guestPage.locator("aside").getByText(participantName, { exact: true }),
    ).toBeVisible();

    await creatorPage.reload();
    await expect(creatorPage.getByText("You’re joining as")).toBeVisible();
    await expect(
      creatorPage.getByText(participantName, { exact: true }),
    ).toBeVisible();

    await guestContext.close();
  });

  test("duplicate names are rejected case-insensitively", async ({
    browser,
    page: creatorPage,
  }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const participantName = `Dara ${uniqueId}`;

    await creatorPage.goto("/");
    await creatorPage
      .getByLabel("Bill name")
      .fill(`Duplicate test ${uniqueId}`);
    await creatorPage.getByLabel("Your name").fill(`Creator ${uniqueId}`);
    await creatorPage.getByRole("button", { name: "Create bill" }).click();
    await expect(creatorPage).toHaveURL(/\/b\/[A-Za-z0-9_-]{43}$/);

    const privateBillUrl = creatorPage.url();
    const firstContext = await browser.newContext();
    const firstGuest = await firstContext.newPage();
    await firstGuest.goto(privateBillUrl);
    await firstGuest.getByLabel("Your name").fill(participantName);
    await firstGuest.getByRole("button", { name: "Join bill" }).click();
    await expect(firstGuest.getByText("You’re joining as")).toBeVisible();

    const duplicateContext = await browser.newContext();
    const duplicateGuest = await duplicateContext.newPage();
    await duplicateGuest.goto(privateBillUrl);
    await duplicateGuest
      .getByLabel("Your name")
      .fill(participantName.toUpperCase());
    await duplicateGuest.getByRole("button", { name: "Join bill" }).click();
    await expect(
      duplicateGuest.getByText("That name is already being used in this bill."),
    ).toBeVisible();

    await firstContext.close();
    await duplicateContext.close();
  });

  test("a tampered participant cookie does not restore write access", async ({
    context,
    page,
  }) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await page.goto("/");
    await page.getByLabel("Bill name").fill(`Cookie test ${uniqueId}`);
    await page.getByLabel("Your name").fill(`Creator ${uniqueId}`);
    await page.getByRole("button", { name: "Create bill" }).click();
    await expect(page).toHaveURL(/\/b\/[A-Za-z0-9_-]{43}$/);

    const cookies = await context.cookies();
    const participantCookie = cookies.find(
      (cookie) => cookie.name === "bill_participant",
    );
    expect(participantCookie).toBeTruthy();

    await context.addCookies([
      {
        ...participantCookie,
        value: `${participantCookie.value}tampered`,
      },
    ]);
    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Join this bill" }),
    ).toBeVisible();
  });

  test("an unknown full-strength private capability returns 404", async ({
    page,
  }) => {
    await page.goto(`/b/${"z".repeat(43)}`);
    await expect(
      page.getByRole("heading", { name: "That bill could not be found." }),
    ).toBeVisible();
  });
});

test("an invalid private capability returns the not-found page", async ({
  page,
}) => {
  await page.goto("/b/invalid");
  await expect(
    page.getByRole("heading", { name: "That bill could not be found." }),
  ).toBeVisible();
});
