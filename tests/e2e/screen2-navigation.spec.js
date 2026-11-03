import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Quiet bar fits both bill states and preserves routes, keyboard use and history", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 852 });
    for (const state of ["populated", "empty"]) {
      await page.goto(`/screen2?preview=${state}`);
      const nav = page.getByRole("navigation", { name: "Bill sections" });
      const indicator = nav.locator('[data-navigation-indicator="quiet"]');
      await expect(nav.locator('svg[data-icon="receipt-text"]')).toHaveCount(1);
      await expect(nav.locator('[aria-current="page"]')).toHaveText("Overview");
      const geometry = await nav.evaluate((node) => ({
        rect: node.getBoundingClientRect().toJSON(),
        shadow: getComputedStyle(node).boxShadow,
        background: getComputedStyle(node).backgroundColor,
        controls: Array.from(node.querySelectorAll("button"), (button) => ({
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height,
          fits: button.scrollWidth <= button.clientWidth,
          background: getComputedStyle(button).backgroundColor,
        })),
      }));
      expect(geometry.rect.x).toBeGreaterThanOrEqual(0);
      expect(geometry.rect.right).toBeLessThanOrEqual(width);
      expect(geometry.rect.bottom).toBe(852 - (width > 600 ? 24 : 0));
      expect(geometry.background).toBe("rgb(255, 255, 255)");
      expect(geometry.shadow).toBe("none");
      expect(
        geometry.controls.every(
          (item) =>
            item.height === 64 &&
            item.width >= 48 &&
            item.fits &&
            item.background === "rgba(0, 0, 0, 0)",
        ),
      ).toBe(true);
      const chip = await indicator.evaluate((node) => ({
        width: getComputedStyle(node, "::before").width,
        height: getComputedStyle(node, "::before").height,
      }));
      expect(chip).toEqual({ width: "44px", height: "32px" });
      await nav.getByRole("button", { name: "Expenses", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", { name: "Expenses", exact: true }),
      ).toBeFocused();
      await expect(page).toHaveURL(/#expenses$/);
      await nav.getByRole("button", { name: "Settle", exact: true }).click();
      await expect(nav.locator('[aria-current="page"]')).toHaveText("Settle");
      await page.goBack();
      await expect(nav.locator('[aria-current="page"]')).toHaveText("Expenses");
      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      expect(
        (await nav.boundingBox()).y + (await nav.boundingBox()).height,
      ).toBe(geometry.rect.bottom);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    }
  }
  expect(
    (
      await new AxeBuilder({ page })
        .include('nav[aria-label="Bill sections"]')
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("Screen 2 waits for the highlight before playing the 600ms receipt icon", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/screen2?preview=populated");
  const nav = page.getByRole("navigation", { name: "Bill sections" });
  const waiting = await nav.evaluate(async (node) => {
    node.querySelectorAll("button")[1].click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const transition = node
      .querySelector('[data-navigation-indicator="quiet"]')
      .getAnimations()[0];
    if (!transition) return false;
    transition.pause();
    transition.currentTime = 120;
    await new Promise((resolve) => setTimeout(resolve, 350));
    const idle = Array.from(
      node.querySelectorAll("[data-receipt-detail]"),
    ).every((line) => getComputedStyle(line).opacity === "1");
    transition.finish();
    return idle;
  });
  expect(waiting).toBe(true);
  const firstLine = nav.locator("[data-receipt-detail]").first();
  await expect
    .poll(async () =>
      Number(
        await firstLine.evaluate((node) =>
          parseFloat(getComputedStyle(node).strokeDasharray),
        ),
      ),
    )
    .toBeLessThan(0.999);
  // Retargeting cancels pending/playing SVGs without affecting the route.
  await nav.getByRole("button", { name: "Settle", exact: true }).click();
  await nav.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(nav.locator('[aria-current="page"]')).toHaveText("Overview");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await nav.getByRole("button", { name: "Expenses", exact: true }).click();
  await expect(nav.locator('[data-navigation-indicator="quiet"]')).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(firstLine).toHaveCSS("opacity", "1");
  await page.emulateMedia({ forcedColors: "active" });
  await expect(
    nav
      .getByRole("button", { name: "Expenses", exact: true })
      .locator("span")
      .last(),
  ).toHaveCSS("text-decoration-line", "underline");
  expect(errors).toEqual([]);
});

test("comparison frames keep independent Quiet bar selections", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto("/screen2");
  const populated = page.frameLocator('iframe[title="Populated bill preview"]');
  const empty = page.frameLocator('iframe[title="Empty bill preview"]');
  const populatedNav = populated.getByRole("navigation", {
    name: "Bill sections",
  });
  const emptyNav = empty.getByRole("navigation", { name: "Bill sections" });
  await populatedNav
    .getByRole("button", { name: "Expenses", exact: true })
    .click();
  await emptyNav.getByRole("button", { name: "Settle", exact: true }).click();
  await expect(populatedNav.locator('[aria-current="page"]')).toHaveText(
    "Expenses",
  );
  await expect(emptyNav.locator('[aria-current="page"]')).toHaveText("Settle");
  expect(new URL(page.url()).hash).toBe("");
});
