import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("expense concepts filter independently, preserve totals and disclose sample details", async ({
  page,
}) => {
  const backend = [];
  const errors = [];
  page.on("request", (request) => {
    if (/supabase\.co|generativelanguage\.googleapis\.com/.test(request.url()))
      backend.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/design-system#expenses-page");
  await expect(
    page.getByRole("link", { name: "Expenses page", exact: true }),
  ).toHaveAttribute("href", "#expenses-page");
  for (const name of [
    "daily",
    "snapshot",
    "journal",
    "atelier",
    "amethyst",
    "collection",
  ]) {
    const preview = page.locator(`[data-expenses-preview="${name}"]`);
    await expect(preview.getByRole("listitem")).toHaveCount(3);
    await preview
      .getByRole("button", { name: "Paid by you", exact: true })
      .click();
    await expect(preview.getByRole("listitem")).toHaveCount(2);
    await preview
      .getByRole("button", { name: "Receipts", exact: true })
      .click();
    await expect(preview.getByRole("listitem")).toHaveCount(1);
    const expense = preview.getByRole("button", { name: /Dinner at Malis/ });
    await expense.click();
    const dialog = page.getByRole("dialog", {
      name: "Dinner at Malis",
      exact: true,
    });
    await expect(dialog).toContainText("$72.00");
    await expect(dialog).toContainText("$24.00");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(expense).toBeFocused();
    const search = preview.getByRole("searchbox");
    await search.fill("no matching expense");
    await expect(preview).toContainText("No expenses found");
    await expect(preview).toContainText("$102.00");
    await preview
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await expect(preview.getByRole("listitem")).toHaveCount(3);
    await search.fill("Sokha");
    await expect(preview.getByRole("listitem")).toHaveCount(1);
    await expect(preview.getByRole("listitem")).toContainText("Tuk-tuk home");
    await search.fill("");
  }
  expect(backend).toEqual([]);
  expect(errors).toEqual([]);
});

test("empty concepts grow with local samples and reset independently", async ({
  page,
}) => {
  await page.goto("/design-system#expenses-page");
  await page.getByRole("button", { name: "Empty bill", exact: true }).click();
  const daily = page.locator('[data-expenses-preview="daily"]');
  const snapshot = page.locator('[data-expenses-preview="snapshot"]');
  const journal = page.locator('[data-expenses-preview="journal"]');
  await expect(daily).toContainText("Your first little cost");
  await expect(snapshot).toContainText("Start small. Share fairly.");
  await expect(journal).toContainText("A story worth sharing");
  await expect(
    page.locator("#expenses-page").getByRole("searchbox"),
  ).toHaveCount(0);
  const trigger = daily.getByRole("button", {
    name: "Add first expense",
    exact: true,
  });
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Enter manually/ })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(daily.getByRole("listitem")).toHaveCount(1);
  await expect(daily).toContainText("$9.00");
  await expect(
    daily.getByRole("button", { name: "Add expense", exact: true }),
  ).toBeFocused();
  await expect(snapshot.getByRole("listitem")).toHaveCount(0);
  await expect(journal.getByRole("listitem")).toHaveCount(0);
  await snapshot
    .getByRole("button", { name: "Add expense", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Scan a receipt/ })
    .click();
  await expect(snapshot.getByRole("listitem")).toHaveCount(1);
  await expect(snapshot).toContainText("Market groceries");
  await expect(snapshot).toContainText("$24.00");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(daily.getByRole("listitem")).toHaveCount(0);
  await expect(snapshot.getByRole("listitem")).toHaveCount(0);
  await page
    .getByRole("button", { name: "With expenses", exact: true })
    .click();
  await expect(daily.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Empty bill", exact: true }).click();
  for (const name of ["atelier", "amethyst", "collection"]) {
    const preview = page.locator(`[data-expenses-preview="${name}"]`);
    await expect(preview.getByRole("listitem")).toHaveCount(0);
    await preview
      .getByRole("button", { name: "Add expense", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Enter manually/ })
      .click();
    await expect(preview).toContainText("Late-night snacks");
    await expect(preview.getByRole("listitem")).toHaveCount(1);
    await expect(
      preview.getByRole("button", { name: "Add expense", exact: true }),
    ).toBeFocused();
  }
});

test("expense concepts fit desktop and narrow screens with accessible controls", async ({
  page,
}) => {
  await page.goto("/design-system#expenses-page");
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const section = page.locator("#expenses-page");
    await section.scrollIntoViewIfNeeded();
    expect(
      await section.evaluate(
        (node) => node.scrollWidth <= node.clientWidth + 1,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const preview of await section
      .locator("[data-expenses-preview]")
      .all()) {
      expect(
        await preview.evaluate(
          (node) => node.scrollWidth <= node.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        await preview
          .getByRole("searchbox")
          .evaluate((node) => getComputedStyle(node).fontSize),
      ).toBe("16px");
    }
  }
  await expect(
    page.locator("#expenses-page").getByRole("heading", { level: 3 }),
  ).toHaveCount(6);
  const scan = async () =>
    expect(
      (await new AxeBuilder({ page }).include("#expenses-page").analyze())
        .violations,
    ).toEqual([]);
  await scan();
  await page.getByRole("button", { name: "Empty bill", exact: true }).click();
  await scan();
});
