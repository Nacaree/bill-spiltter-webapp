import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openChooser(page, preset = "empty") {
  await page.goto(`/screen2?preview=${preset}#expenses`);
  await expect(
    page.getByRole("heading", { name: "Expenses", exact: true }),
  ).toBeFocused();
  const trigger = page.getByRole("button", {
    name: "Add expense",
    exact: true,
  });
  await trigger.click();
  return {
    trigger,
    dialog: page.getByRole("dialog", { name: "Add to the bill", exact: true }),
  };
}

test("approved entry choices fit both bills with steady hover surfaces and accessible actions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 852 });
    for (const preset of ["empty", "populated"]) {
      const { trigger, dialog } = await openChooser(page, preset);
      await expect(
        dialog.getByRole("button", { name: "Close menu" }),
      ).toBeFocused();
      await expect(dialog).toHaveAccessibleDescription(
        "Choose what’s easiest. We’ll handle the math.",
      );
      await expect(
        dialog.locator('[data-bill-entry-choices="spotlight"]'),
      ).toBeVisible();
      await expect(dialog).not.toContainText("Design preview");
      await expect(dialog.getByRole("button")).toHaveCount(3);
      await expect(
        dialog.getByRole("button", { name: /animation|Motion off/i }),
      ).toHaveCount(0);
      const scan = dialog.getByRole("button", { name: /Scan a receipt/ });
      const manual = dialog.getByRole("button", { name: /Enter manually/ });
      await page.mouse.move(1, 1);
      const surface = () =>
        scan.evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            background: style.backgroundColor,
            border: style.borderTopColor,
          };
        });
      const resting = await surface();
      await scan.hover();
      expect(await surface()).toEqual(resting);
      await manual.hover();
      await expect(manual).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(manual).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
      const icons = await manual.evaluate((node) => {
        const pencil = node
          .querySelector('[data-icon="pencil"] svg')
          .getBoundingClientRect();
        const chevron = node
          .querySelector("[data-choice-chevron] svg")
          .getBoundingClientRect();
        const text = node
          .querySelector("strong")
          .parentElement.getBoundingClientRect();
        return {
          pencilSize: pencil.width,
          chevronSize: chevron.width,
          pencilDelta:
            pencil.top + pencil.height / 2 - text.top - text.height / 2,
          chevronDelta:
            chevron.top + chevron.height / 2 - text.top - text.height / 2,
        };
      });
      expect(icons.pencilSize).toBe(22);
      expect(icons.chevronSize).toBe(20);
      expect(Math.abs(icons.pencilDelta)).toBeLessThan(0.1);
      expect(Math.abs(icons.chevronDelta)).toBeLessThan(0.1);
      expect(
        await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      const bounds = await dialog.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      if (width === 393)
        expect(
          (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
            .violations,
        ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
  }
  await page.setViewportSize({ width: 320, height: 360 });
  const { dialog } = await openChooser(page);
  await dialog.getByRole("button", { name: /Enter manually/ }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Add an expense", exact: true })
      .getByLabel("Description", { exact: true }),
  ).toBeFocused();
});

test("entry motion respects reduced motion and cleans up on dismissal and receipt or expense entry", async ({
  page,
}) => {
  const backend = [];
  const errors = [];
  page.on("request", (request) => {
    if (/supabase\.co|generativelanguage\.googleapis\.com/.test(request.url()))
      backend.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 393, height: 852 });
  const { trigger, dialog } = await openChooser(page);
  const art = dialog.locator("[data-receipt-art]");
  await expect(art).toHaveAttribute("data-receipt-motion", "running");
  const motion = await art.evaluate((node) => ({
    floating: node.getAnimations()[0].effect.getTiming().duration,
    lift: node
      .getAnimations()[0]
      .effect.getKeyframes()
      .map((frame) => frame.transform),
    scanning: node
      .querySelector("[data-receipt-scan]")
      .getAnimations()[0]
      .effect.getTiming().duration,
  }));
  expect(motion.floating).toBe(2400);
  expect(motion.lift).toContain("translateY(-7px)");
  expect(motion.scanning).toBe(4500);
  await art.evaluate((node) => {
    window.dismissedEntryArt = node;
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => window.dismissedEntryArt.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await trigger.click();
  await expect(art).toHaveAttribute("data-receipt-motion", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      art.evaluate((node) => node.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await expect(
    dialog.getByRole("button", { name: /animation|Motion off/i }),
  ).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(art).toHaveAttribute("data-receipt-motion", "running");
  await art.evaluate((node) => {
    window.outgoingEntryArt = node;
  });
  await dialog.getByRole("button", { name: /Scan a receipt/ }).click();
  await expect(
    page.getByRole("heading", { name: "Scan a receipt", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Choose receipt image", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.outgoingEntryArt.isConnected))
    .toBe(false);
  expect(
    await page.evaluate(
      () => window.outgoingEntryArt.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  const next = await openChooser(page, "populated");
  await next.dialog.getByRole("button", { name: /Enter manually/ }).click();
  const form = page.getByRole("dialog", {
    name: "Add an expense",
    exact: true,
  });
  await expect(form.getByLabel("Description", { exact: true })).toBeFocused();
  await form
    .getByLabel("Description", { exact: true })
    .fill("Shared chooser draft");
  await form.getByLabel("Amount · USD", { exact: true }).fill("12");
  await page.keyboard.press("Escape");
  await expect(next.trigger).toBeFocused();
  await next.trigger.click();
  await next.dialog.getByRole("button", { name: /Enter manually/ }).click();
  await expect(form.getByLabel("Description", { exact: true })).toHaveValue(
    "Shared chooser draft",
  );
  expect(backend).toEqual([]);
  expect(errors).toEqual([]);
});

test("embedded bills keep entry drawers and motion independent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto("/screen2");
  const populated = page.frameLocator('iframe[title="Populated bill preview"]');
  const empty = page.frameLocator('iframe[title="Empty bill preview"]');
  for (const frame of [populated, empty]) {
    await expect(
      frame.getByRole("heading", { name: "Weekend dinner", exact: true }),
    ).toBeVisible();
    await frame.getByRole("button", { name: "Expenses", exact: true }).click();
    await frame
      .getByRole("button", { name: "Add expense", exact: true })
      .click();
    await expect(
      frame.getByRole("dialog").locator("[data-receipt-art]"),
    ).toHaveAttribute("data-receipt-motion", "running");
  }
  await empty
    .getByRole("dialog")
    .locator("[data-receipt-art]")
    .evaluate((node) => {
      window.independentEntryArt = node;
    });
  await empty.getByRole("button", { name: "Close menu", exact: true }).click();
  await expect(empty.getByRole("dialog")).toBeHidden();
  expect(
    await empty
      .locator("body")
      .evaluate(
        () =>
          window.independentEntryArt.getAnimations({ subtree: true }).length,
      ),
  ).toBe(0);
  await expect(
    populated.getByRole("dialog").locator("[data-receipt-art]"),
  ).toHaveAttribute("data-receipt-motion", "running");
  await empty.getByRole("button", { name: "Add expense", exact: true }).click();
  await empty.getByRole("button", { name: /Enter manually/ }).click();
  await expect(
    empty.getByRole("dialog", { name: "Add an expense", exact: true }),
  ).toBeVisible();
  await expect(
    populated.getByRole("dialog", { name: "Add to the bill", exact: true }),
  ).toBeVisible();
});
