import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("receipt alternatives disclose details and preview without losing expenses", async ({
  page,
}) => {
  await page.goto("/design-system#expense-cards");
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  await expect(atelier.getByRole("searchbox")).toBeEditable();
  await atelier
    .getByRole("button", { name: "Add expense", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Enter manually/ })
    .click();
  await expect(atelier.getByRole("listitem")).toHaveCount(4);

  for (const design of ["perforation", "ticket", "stack", "fold"]) {
    const option = page.locator(`[data-receipt-option="${design}"]`);
    const sample = option.getByRole("button", { name: /Dinner at Malis/ });
    await sample.click();
    const dialog = page.getByRole("dialog", {
      name: "Dinner at Malis",
      exact: true,
    });
    await expect(dialog).toContainText("$72.00");
    await expect(dialog).toContainText("$24.00");
    await page.keyboard.press("Escape");
    await expect(sample).toBeFocused();

    await atelier.getByRole("searchbox").fill("no matching expense");
    await expect(atelier).toContainText("No expenses found");
    await option.getByRole("button", { name: /Preview in Atelier:/ }).click();
    await expect(
      atelier.locator(`[data-receipt-design="${design}"]`),
    ).toHaveCount(4);
    await expect(
      atelier.getByText("Your share $40.00", { exact: true }),
    ).toBeVisible();
    await expect(
      atelier.getByRole("listitem").first().getByRole("button"),
    ).toBeFocused();
    const expense = atelier.getByRole("button", { name: /Dinner at Malis/ });
    await expense.click();
    await expect(dialog).toContainText("Nary");
    await page.keyboard.press("Escape");
    await expect(expense).toBeFocused();
  }

  await page
    .getByRole("button", { name: "Original receipt", exact: true })
    .click();
  await expect(atelier.locator("[data-receipt-design]")).toHaveCount(0);
  await expect(atelier.getByRole("listitem")).toHaveCount(4);
  await page.getByRole("button", { name: "Empty bill", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Preview in Atelier: Ticket stub",
      exact: true,
    })
    .click();
  await expect(atelier.locator('[data-receipt-design="ticket"]')).toHaveCount(
    3,
  );
});

test("chosen glass search uses the shared material and respects reduced motion", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/design-system#expenses-premium");
  const search = page.locator("#atelier-expense-search");
  const input = search.getByRole("searchbox");
  const bar = input.locator("..");
  const icon = search.locator("label");
  await expect(input).toBeEditable();
  await expect(search).toHaveAttribute("data-search-design", "tint");
  await expect(bar).toHaveAttribute("data-search-material", "glass");
  const glass = page
    .getByRole("heading", { name: "Liquid glass", exact: true })
    .first()
    .locator("..");
  const material = await glass.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.backgroundColor,
      image: style.backgroundImage,
      blur: style.backdropFilter,
      shadow: style.boxShadow,
      border: style.borderTopColor,
    };
  });
  await expect(bar).toHaveCSS("background-color", material.color);
  await expect(bar).toHaveCSS("background-image", material.image);
  await expect(bar).toHaveCSS("backdrop-filter", material.blur);
  await expect(bar).toHaveCSS("box-shadow", material.shadow);
  await expect(icon.locator("svg")).toBeVisible();
  await expect(icon).toHaveCSS("transform", "none");

  const expectGesture = async () => {
    await expect
      .poll(() =>
        icon.evaluate((element) => {
          const transform = getComputedStyle(element).transform;
          return (
            transform !== "none" && transform !== "matrix(1, 0, 0, 1, 0, 0)"
          );
        }),
      )
      .toBe(true);
    const matrix = await icon.evaluate((element) => {
      const transform = getComputedStyle(element).transform;
      const matrix = new DOMMatrix(
        transform === "none" ? undefined : transform,
      );
      return { scale: matrix.a, skewX: matrix.b, skewY: matrix.c };
    });
    expect(matrix.scale).toBeLessThanOrEqual(1.081);
    expect(matrix.skewX).toBe(0);
    expect(matrix.skewY).toBe(0);
    await expect(icon).toHaveCSS("transform", "none");
  };

  if (testInfo.project.name === "iphone") await icon.tap();
  else await icon.click();
  await expect(input).toBeFocused();
  await expectGesture();
  await expect(bar).toHaveCSS("border-top-color", "rgb(102, 51, 153)");
  await expect(bar).not.toHaveCSS("box-shadow", "none");
  await input.click();
  await expectGesture();
  await input.press("Enter");
  await expectGesture();

  await input.fill("Nary");
  await expect(bar).toHaveCSS("border-top-color", "rgb(102, 51, 153)");
  await search.getByRole("button", { name: "Clear search" }).click();
  await expect(input).toBeFocused();
  await expect(icon).toHaveCSS("transform", "none");

  await input.click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(icon).toHaveCSS("transform", "none");
  await input.click();
  expect(await icon.evaluate((element) => element.getAnimations().length)).toBe(
    0,
  );
  expect(await bar.evaluate((element) => element.getAnimations().length)).toBe(
    0,
  );
  await input.press("Tab");
  await expect(bar).toHaveCSS("box-shadow", material.shadow);
  await expect(bar).toHaveCSS("border-top-color", material.border);
});

test("search alternatives stay independent and preview in Atelier", async ({
  page,
}) => {
  await page.goto("/design-system#expense-search");
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  for (const design of ["line", "tint", "frame", "toolbar"]) {
    const option = page.locator(`[data-search-option="${design}"]`);
    const input = option.getByRole("searchbox");
    await input.fill("Sokha");
    await expect(option.getByRole("listitem")).toHaveCount(1);
    await expect(option.getByRole("listitem")).toContainText("Tuk-tuk home");
    await expect(atelier.getByRole("listitem")).toHaveCount(3);
    await expect(input).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(input).toHaveCSS("border-radius", "0px");
    await expect(input).toHaveCSS("box-shadow", "none");
    await option.getByRole("button", { name: "Clear search" }).click();
    await expect(input).toBeFocused();
    await expect(option.getByRole("listitem")).toHaveCount(3);
    await option
      .getByRole("button", { name: "Paid by you", exact: true })
      .click();
    await expect(option.getByRole("listitem")).toHaveCount(2);
    await option.getByRole("button", { name: "All", exact: true }).click();
    await option.getByRole("button", { name: /Preview in Atelier:/ }).click();
    const activeSearch = atelier.locator(`[data-search-design="${design}"]`);
    await expect(activeSearch).toBeFocused();
    await expect(atelier).toContainText("$102.00");
    await atelier.getByRole("searchbox").fill("coffee");
    await expect(atelier.getByRole("listitem")).toHaveCount(1);
    await atelier.getByRole("button", { name: "Clear search" }).click();
  }
  await page.getByRole("button", { name: "Empty bill", exact: true }).click();
  await page
    .getByRole("button", { name: "Preview in Atelier: Liquid glass" })
    .click();
  await expect(atelier.getByRole("searchbox")).toBeVisible();
  await expect(atelier.locator('[data-search-design="tint"]')).toBeFocused();
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
    if (name === "atelier")
      await expect(
        preview.getByText("Your share $37.00", { exact: true }),
      ).toBeVisible();
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
    page.locator("[data-expenses-preview]").getByRole("searchbox"),
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
    const atelier = page.locator('[data-expenses-preview="atelier"]');
    const title = atelier.getByRole("heading", {
      name: "Expenses",
      exact: true,
    });
    expect(
      await title.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    ).toBe(true);
    const titleBounds = await title.boundingBox();
    const addBounds = await atelier
      .getByRole("button", { name: "Add expense", exact: true })
      .boundingBox();
    const searchBounds = await atelier
      .getByRole("searchbox")
      .locator("..")
      .boundingBox();
    expect(addBounds.y).toBeGreaterThan(titleBounds.y + titleBounds.height);
    expect(addBounds.height).toBeGreaterThanOrEqual(48);
    expect(Math.abs(addBounds.x - searchBounds.x)).toBeLessThan(1);
    expect(Math.abs(addBounds.width - searchBounds.width)).toBeLessThan(1);
    expect(searchBounds.y - addBounds.y - addBounds.height).toBe(16);
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
  ).toHaveCount(14);
  const scan = async () =>
    expect(
      (await new AxeBuilder({ page }).include("#expenses-page").analyze())
        .violations,
    ).toEqual([]);
  await scan();
  await page.getByRole("button", { name: "Empty bill", exact: true }).click();
  await scan();
});
