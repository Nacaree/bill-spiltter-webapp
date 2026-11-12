import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

const ledger = (page) => page.locator("[data-atelier-expenses]");
const dialog = (page, name) => page.getByRole("dialog", { name, exact: true });
async function closeDetails(page) {
  await page.getByRole("button", { name: "Close expense details" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function addManual(page, name = "Owner only") {
  await ledger(page)
    .getByRole("button", { name: "Add expense", exact: true })
    .click();
  await page.getByRole("button", { name: /Enter manually/ }).click();
  const form = dialog(page, "Add an expense");
  await form.getByLabel("Description", { exact: true }).fill(name);
  await form.getByLabel("Amount · USD", { exact: true }).fill("10");
  return form;
}

test("Atelier searches payer/category and filters by assigned shares without filtering totals", async ({
  page,
}) => {
  const backend = [];
  page.on("request", (request) => {
    if (/supabase\.co|generativelanguage\.googleapis\.com/.test(request.url()))
      backend.push(request.url());
  });
  await page.goto("/screen2?preview=populated#expenses");
  const list = ledger(page);
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.locator("number-flow-react")).toHaveAccessibleName(
    "$102.00",
  );
  await expect(list).toContainText("Your share $37.00");
  await expect(list.getByText("OCTOBER 2026", { exact: true })).toBeVisible();
  const search = list.getByRole("searchbox");
  for (const [query, count] of [
    ["  sokha  ", 1],
    ["coffee", 1],
    ["transport", 1],
    ["absent", 0],
  ]) {
    await search.fill(query);
    await expect(list.getByRole("listitem")).toHaveCount(count);
    await expect(list.locator("number-flow-react")).toHaveAccessibleName(
      "$102.00",
    );
  }
  await list
    .getByRole("button", { name: "Clear search", exact: true })
    .last()
    .click();
  const form = await addManual(page);
  await form.getByRole("checkbox", { name: "Sokha", exact: true }).uncheck();
  await form.getByRole("checkbox", { name: "Mali", exact: true }).uncheck();
  await form.getByText("Category & notes", { exact: true }).click();
  await form.getByRole("combobox", { name: "Category", exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(15);
  await page.getByRole("option", { name: "Gifts", exact: true }).click();
  await form.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByRole("combobox", { name: "View as" }).selectOption("settler");
  await list
    .getByRole("button", { name: "Your expenses", exact: true })
    .click();
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByRole("button", { name: /Owner only/ })).toHaveCount(0);
  await expect(list.locator("number-flow-react")).toHaveAccessibleName(
    "$112.00",
  );
  await expect(list).toContainText("Your share $37.00");
  await list.getByRole("button", { name: "All", exact: true }).click();
  await list.getByRole("searchbox").fill("gifts");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await list.getByRole("button", { name: /Owner only/ }).click();
  const detail = dialog(page, "Owner only");
  await expect(detail).toContainText("Your share$0.00");
  await expect(detail.locator("[data-person]")).toHaveCount(1);
  await expect(detail.locator("[data-person='nary']")).toContainText("Nary");
  await expect(detail.locator("[data-person='nary']")).not.toContainText(
    "(you)",
  );
  await closeDetails(page);
  await expect(list.getByRole("searchbox")).toHaveValue("gifts");
  expect(backend).toEqual([]);
});

test("receipt edits preserve allocations and source while zoom and nested removal restore focus", async ({
  page,
}) => {
  await page.goto("/screen2?preview=populated#expenses");
  const list = ledger(page);
  await list.getByRole("button", { name: "Receipts", exact: true }).click();
  const card = list.getByRole("button", { name: /Dinner at Malis/ });
  await card.click();
  const detail = dialog(page, "Dinner at Malis");
  const receipt = detail.getByRole("button", { name: "View original receipt" });
  await receipt.click();
  const viewer = dialog(page, "Receipt preview");
  await viewer.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(viewer.getByRole("status")).toHaveText("125%");
  await viewer.getByRole("button", { name: "Fit receipt" }).click();
  await expect(viewer.getByRole("status")).toHaveText("100%");
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(receipt).toBeFocused();
  await detail.getByRole("button", { name: "Edit expense" }).click();
  const edit = dialog(page, "Edit expense");
  await edit
    .getByLabel("Description", { exact: true })
    .fill("Changed and cancelled");
  await edit.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Edit expense" }).click();
  await expect(edit.getByLabel("Description", { exact: true })).toHaveValue(
    "Dinner at Malis",
  );
  await edit.getByLabel(/^Notes/).fill("Updated note only");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(detail.locator("[data-person='nary']")).toContainText("$24.00");
  await expect(detail.locator("[data-person='sokha']")).toContainText("$24.00");
  await expect(detail).toContainText("Updated note only");
  await expect(receipt).toBeVisible();
  await detail
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  const removal = page.getByRole("alertdialog");
  await expect(
    removal.getByRole("button", { name: "Keep expense" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(removal).toHaveCount(0);
  await expect(
    detail.getByRole("button", { name: "Remove expense", exact: true }),
  ).toBeFocused();
  await closeDetails(page);
  await expect(card).toBeFocused();
  await card.click();
  await detail
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  await removal
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toHaveCount(0);
  await expect(
    list.getByRole("button", { name: "Add expense", exact: true }),
  ).toBeFocused();
  await expect(
    list.getByRole("button", { name: "Receipts", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(list.locator("number-flow-react")).toHaveAccessibleName(
    "$30.00",
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Recent activity" }),
  ).toContainText("Removed Dinner at Malis");
});

test("Overview, legacy links and browser history open the same drawer over their originating tab", async ({
  page,
}) => {
  await page.goto("/screen2?preview=populated");
  const card = page.getByRole("button", { name: /Dinner at Malis/ });
  await card.click();
  await expect(page).toHaveURL(/#overview\/detail-dinner$/);
  await expect(dialog(page, "Dinner at Malis")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Add expense", exact: true }),
  ).toHaveCount(0);
  await card.click();
  await dialog(page, "Dinner at Malis")
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "See all", exact: true }),
  ).toBeFocused();
  await expect(page).toHaveURL(/(?:populated|#overview)$/);
  await page.goto("/screen2?preview=populated#detail-ride");
  await expect(dialog(page, "Tuk-tuk home")).toBeVisible();
  await closeDetails(page);
  await expect(page).toHaveURL(/#expenses$/);
  await expect(
    ledger(page).getByRole("button", { name: "Add expense", exact: true }),
  ).toBeFocused();
});

test("new participants, exact shares and edited dates stay connected to Screen 2 balances", async ({
  page,
}) => {
  await page.goto("/screen2?preview=empty");
  await page.getByRole("button", { name: /Just you, for now/ }).click();
  const people = dialog(page, "The people at your table");
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  await people.getByLabel("Person’s name").fill("Dara");
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  await people.getByRole("button", { name: "Close menu" }).click();
  await page.getByRole("button", { name: "Expenses", exact: true }).click();
  const form = await addManual(page, "Scooter to dinner");
  await form.getByRole("checkbox", { name: "Dara", exact: true }).check();
  await form.getByRole("button", { name: "Exact amounts" }).click();
  await form.getByLabel("Nary’s share").fill("7");
  await form.getByLabel("Dara’s share").fill("3");
  await form.getByText("Category & notes", { exact: true }).click();
  await form.getByRole("combobox", { name: "Category" }).click();
  await page
    .getByRole("option", { name: "Transport & taxis", exact: true })
    .click();
  await form.getByRole("button", { name: "Add expense", exact: true }).click();
  const card = ledger(page).getByRole("button", { name: /Scooter to dinner/ });
  await expect(card.locator('[data-expense-icon="motorbike"]')).toBeVisible();
  await card.click();
  const detail = dialog(page, "Scooter to dinner");
  await expect(detail.locator("[data-person]")).toHaveCount(2);
  await expect(detail).toContainText("Dara");
  await detail.getByRole("button", { name: "Edit expense" }).click();
  const edit = dialog(page, "Edit expense");
  await expect(edit.getByLabel("Dara’s share")).toHaveValue("3.00");
  await edit.getByLabel("Dara’s share").fill("2");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(edit.getByRole("alert")).toContainText("add up to the total");
  await edit.getByLabel("Dara’s share").fill("3");
  await edit.getByLabel(/^Notes/).fill("Keep our exact split");
  await edit.getByRole("button", { name: "Expense date 29 Oct 2026" }).click();
  const calendar = dialog(page, "Expense date calendar");
  await calendar.getByRole("button", { name: /next month/i }).click();
  await calendar.getByRole("button", { name: /November 2nd.*2026/ }).click();
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(detail.locator("[data-person='nary']")).toContainText("$7.00");
  await closeDetails(page);
  await expect(ledger(page)).toContainText("NOVEMBER 2026");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Your balance" })
      .locator("number-flow-react"),
  ).toHaveAccessibleName("$3.00");
});

test("Atelier page and layered dialogs fit narrow, short and desktop viewports with accessible controls", async ({
  page,
}) => {
  test.setTimeout(60_000);
  for (const [width, height] of [
    [320, 740],
    [393, 500],
    [1280, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/screen2?preview=populated#expenses");
    await expect(ledger(page).getByRole("listitem")).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "Expenses", exact: true }),
    ).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `/private/tmp/screen2-atelier-${width}.png`,
      fullPage: true,
    });
    const card = ledger(page).getByRole("button", { name: /Dinner at Malis/ });
    await card.click();
    const detail = dialog(page, "Dinner at Malis");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `/private/tmp/screen2-paper-${width}.png` });
    await detail.getByRole("button", { name: "View original receipt" }).click();
    const viewer = dialog(page, "Receipt preview");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await viewer.getByRole("button", { name: "Back to expense" }).click();
    await detail
      .getByRole("button", { name: "Remove expense", exact: true })
      .click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Keep expense" })
      .click();
    await closeDetails(page);
    await page.goto("/screen2?preview=empty#expenses");
    await expect(
      ledger(page).getByRole("heading", { name: "No expenses yet." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Expenses", exact: true }),
    ).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

test("embedded drawers keep previews independent and reset only their own ledger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto("/screen2");
  const populated = page.frameLocator('iframe[title="Populated bill preview"]');
  const empty = page.frameLocator('iframe[title="Empty bill preview"]');
  await populated
    .getByRole("button", { name: "Expenses", exact: true })
    .click();
  await empty.getByRole("button", { name: "Expenses", exact: true }).click();
  await populated.getByRole("button", { name: /Dinner at Malis/ }).click();
  await expect(
    populated.getByRole("dialog", { name: "Dinner at Malis", exact: true }),
  ).toBeVisible();
  await expect(empty.getByRole("dialog")).toHaveCount(0);
  await populated
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  await populated
    .getByRole("alertdialog")
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  await expect(
    populated.locator("[data-atelier-expenses] number-flow-react"),
  ).toHaveAccessibleName("$30.00");
  await expect(
    empty.locator("[data-atelier-expenses] number-flow-react"),
  ).toHaveAccessibleName("$0.00");
  await populated.getByRole("button", { name: "Bill menu" }).click();
  await populated
    .getByRole("button", { name: "Reset example", exact: true })
    .click();
  await populated
    .getByRole("button", { name: "Expenses", exact: true })
    .click();
  await expect(
    populated.locator("[data-atelier-expenses] number-flow-react"),
  ).toHaveAccessibleName("$102.00");
  await expect(
    empty.getByRole("heading", { name: "No expenses yet." }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
});

test("normal motion pauses behind details and reduced motion and forced colors keep controls usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/screen2?preview=populated#expenses");
  const list = ledger(page);
  const card = list.getByRole("button", { name: /Tuk-tuk home/ });
  const icon = list.locator('[data-expense-icon="tuk-tuk"]');
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  await expect(icon).toHaveAttribute("data-icon-playing", "true");
  await card.click();
  const sourceScroll = await page.evaluate(() => scrollY);
  await expect(icon).toHaveAttribute("data-icon-playing", "false");
  await closeDetails(page);
  await expect(card).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(sourceScroll, 0);
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await expect(icon).toHaveAttribute("data-icon-playing", "false");
  await list.getByRole("searchbox").fill("tuk");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await list.getByRole("button", { name: "Clear search" }).click();
  await expect(list.getByRole("searchbox")).toBeFocused();
  await expect(list.getByRole("listitem")).toHaveCount(3);
});

test("empty Expenses keeps the quiet float and pauses around local entry", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/screen2?preview=empty#expenses");
  await expect(
    page.getByRole("heading", { name: "Expenses", exact: true }),
  ).toBeFocused();
  const art = ledger(page).locator("[data-receipt-art]");
  await art.locator("..").scrollIntoViewIfNeeded();
  await expect(art).toHaveAttribute("data-receipt-motion", "running");
  await expect(art).toHaveAttribute("aria-hidden", "true");
  await expect(art.locator("[data-receipt-scan]")).toHaveCount(0);
  const float = await art.evaluate((node) => {
    window.expensesEmptyArt = node;
    const [animation] = node.getAnimations();
    animation.pause();
    animation.currentTime = 0;
    const rest = node.getBoundingClientRect().top;
    animation.currentTime = 1200;
    const lift = rest - node.getBoundingClientRect().top;
    const duration = animation.effect.getTiming().duration;
    animation.play();
    return { lift, duration, count: node.getAnimations().length };
  });
  expect(float).toEqual({ lift: 7, duration: 2400, count: 1 });
  await art.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(art).toHaveAttribute("data-receipt-motion", "paused");
  await art.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(art).toHaveAttribute("data-receipt-motion", "running");
  await ledger(page)
    .getByRole("button", { name: "Add expense", exact: true })
    .click();
  await expect
    .poll(() => art.evaluate((node) => node.getAnimations().length))
    .toBe(0);
  await page
    .getByRole("dialog", { name: "Add to the bill", exact: true })
    .getByRole("button", { name: "Close menu" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Add to the bill", exact: true }),
  ).toHaveCount(0);
  await expect(art).toHaveAttribute("data-receipt-motion", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      art.evaluate((node) => node.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height: 852 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `/private/tmp/expenses-empty-receipt-${width}.png`,
      fullPage: true,
    });
  }
  const form = await addManual(page, "First little cost");
  await form.getByRole("button", { name: "Add expense", exact: true }).click();
  await expect(ledger(page).getByRole("listitem")).toHaveCount(1);
  await expect(art).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.expensesEmptyArt.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  expect(errors).toEqual([]);
});
