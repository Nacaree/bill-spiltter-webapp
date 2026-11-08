import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function visitEmpty(page) {
  await page.goto("/screen2?preview=empty");
  await expect(
    page.getByRole("heading", { name: "Weekend dinner", exact: true }),
  ).toBeFocused();
}

async function expectDialogAlignment(panel, descriptionVisible = false) {
  const header = panel.locator("[data-panel-header]");
  const close = header.getByRole("button");
  await expect(close).toHaveAccessibleName(/Close/);
  const geometry = await header.evaluate((node) => {
    const title = node.querySelector("h2");
    const control = node.querySelector("button");
    const description = node.querySelector('[id][class*="description"]');
    const t = title.getBoundingClientRect();
    const a = control.getBoundingClientRect();
    const h = node.getBoundingClientRect();
    const p = node.closest('[role="dialog"]').getBoundingClientRect();
    return {
      delta:
        a.top +
        a.height / 2 -
        t.top -
        parseFloat(getComputedStyle(title).lineHeight) / 2,
      width: a.width,
      height: a.height,
      inside: a.top >= p.top && a.right <= p.right && a.bottom <= p.bottom,
      titleLeft: t.left,
      titleBottom: t.bottom,
      actionRight: a.right,
      description: description
        ? description.getBoundingClientRect().toJSON()
        : null,
      overflow: node.scrollWidth > node.clientWidth,
      header: h.toJSON(),
    };
  });
  expect(Math.abs(geometry.delta)).toBeLessThan(1);
  expect(geometry.width).toBe(48);
  expect(geometry.height).toBe(48);
  expect(geometry.inside).toBe(true);
  expect(geometry.overflow).toBe(false);
  if (descriptionVisible) {
    expect(geometry.description.left).toBe(geometry.titleLeft);
    expect(geometry.description.right).toBe(geometry.actionRight);
    expect(geometry.description.top - geometry.titleBottom).toBeCloseTo(12, 0);
  }
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("overview text keeps a compact stack while Share bill follows its first title line", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    }),
  );
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 852 });
    for (const preset of ["empty", "populated"]) {
      await page.goto(`/screen2?preview=${preset}`);
      await expect(
        page.getByRole("heading", { name: "Weekend dinner", exact: true }),
      ).toBeFocused();
      const header = page.locator("[data-page-title]");
      const share = header.locator("button[data-copy-state]");
      await expect(share).toHaveAccessibleName("Share bill");
      const measure = () =>
        header.evaluate((node) => {
          const title = node.querySelector("h1");
          const t = title.getBoundingClientRect();
          const a = node.querySelector("button").getBoundingClientRect();
          const paragraphs = node.querySelectorAll("p");
          const e = paragraphs[0].getBoundingClientRect();
          const s = paragraphs[1].getBoundingClientRect();
          const bounds = node.getBoundingClientRect();
          return {
            delta:
              a.top +
              a.height / 2 -
              t.top -
              parseFloat(getComputedStyle(title).lineHeight) / 2,
            title: t.toJSON(),
            action: a.toJSON(),
            eyebrow: e.toJSON(),
            subtitle: s.toJSON(),
            bounds: bounds.toJSON(),
            overflow: node.scrollWidth > node.clientWidth,
          };
        });
      const before = await measure();
      expect(Math.abs(before.delta)).toBeLessThan(1);
      expect(before.action.height).toBe(48);
      expect(before.title.left).toBe(before.eyebrow.left);
      expect(before.subtitle.left).toBe(before.title.left);
      expect(before.subtitle.right).toBe(before.bounds.right);
      expect(before.title.top - before.eyebrow.bottom).toBeCloseTo(8, 0);
      expect(before.subtitle.top - before.title.bottom).toBeCloseTo(8, 0);
      expect(before.action.left - before.title.right).toBeCloseTo(16, 0);
      expect(before.action.bottom).toBeLessThanOrEqual(before.subtitle.top);
      expect(before.overflow).toBe(false);
      await share.click();
      await expect(share).toHaveAttribute("data-copy-state", "copied");
      const after = await measure();
      expect(after.title).toEqual(before.title);
      expect(after.subtitle).toEqual(before.subtitle);
      expect(after.action).toEqual(before.action);
    }
  }
});

test("drawer close follows the first title line with a full-width description and tighter keyboard focus", async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    }),
  );
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 852 });
    await visitEmpty(page);
    await page.getByRole("button", { name: /Just you, for now/ }).focus();
    await page.keyboard.press("Enter");
    const panel = page.getByRole("dialog", {
      name: "The people at your table",
    });
    const close = panel.getByRole("button", { name: "Close menu" });
    await expect(close).toBeFocused();
    await expectDialogAlignment(panel, true);
    await expect(close).toHaveCSS("outline-width", "2px");
    await expect(close).toHaveCSS("outline-offset", "2px");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (width === 393) {
      const copy = panel.locator("form [data-copy-state]");
      await copy.click();
      await expect(copy).toHaveAttribute("data-copy-state", "copied");
      await expect(copy).toHaveAccessibleName("Copied");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    if (width === 320) {
      await page.setViewportSize({ width, height: 230 });
      await expect(panel).toHaveAttribute("data-compact", "true");
      await expectDialogAlignment(panel);
      if (browserName === "chromium") {
        await page.emulateMedia({ forcedColors: "active" });
        await expect(close).toHaveCSS("outline-style", "solid");
        await expect(close).toHaveCSS("outline-width", "2px");
        await page.emulateMedia({ forcedColors: "none" });
      }
    }
  }
});

test("shared chooser, expense, confirmation and studio headers use the same title anchor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await visitEmpty(page);
  await page.getByRole("button", { name: "Add your first expense" }).click();
  const chooser = page.getByRole("dialog", {
    name: "Add to the bill",
    exact: true,
  });
  await expectDialogAlignment(chooser);
  await chooser.getByRole("button", { name: /Enter manually/ }).click();
  const expense = page.getByRole("dialog", {
    name: "Add an expense",
    exact: true,
  });
  await expectDialogAlignment(expense);
  await expense.getByRole("button", { name: "Close expense form" }).click();
  await expect(expense).toBeHidden();
  await page.getByRole("button", { name: "Bill menu" }).click();
  const menu = page.getByRole("dialog", { name: "Bill menu", exact: true });
  await expectDialogAlignment(menu);
  await menu.getByRole("button", { name: "Delete bill", exact: true }).click();
  await expectDialogAlignment(
    page.getByRole("dialog", { name: "Delete this bill?", exact: true }),
  );
  await page.goto("/design-system#forms");
  await page
    .getByRole("button", { name: "Preview expense drawer", exact: true })
    .click();
  await expectDialogAlignment(
    page.getByRole("dialog", { name: "Add an expense", exact: true }),
  );
});
