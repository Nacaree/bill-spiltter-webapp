import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

const clearOptions = [
  ["clear-soft-twist", "twist"],
  ["clear-stroke-erase", "erase"],
  ["clear-soft-pop", "pop"],
];

test("clear effect previews clear immediately, refill and apply in Atelier", async ({
  page,
}) => {
  await page.goto("/design-system#expense-search-clear");
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [id, variant] of clearOptions) {
      const option = page.locator(`[data-search-option="${id}"]`);
      const input = option.getByRole("searchbox");
      if ((await input.inputValue()) !== "coffee")
        await option.getByRole("button", { name: /Refill example:/ }).click();
      await expect(input).toHaveValue("coffee");
      await expect(option.getByRole("listitem")).toHaveCount(1);
      const clear = option.getByRole("button", { name: "Clear search" });
      const bounds = await clear.boundingBox();
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await clear.click();
      await expect(input).toHaveValue("");
      await expect(input).toBeFocused();
      await expect(option.getByRole("listitem")).toHaveCount(3);
      await expect(clear).toBeHidden();
      await option.getByRole("button", { name: /Refill example:/ }).click();
      await expect(clear).toBeEnabled();
      await option.getByRole("button", { name: /Preview in Atelier:/ }).click();
      await expect(
        atelier.locator(`[data-search-clear="${variant}"]`),
      ).toBeFocused();
      await expect(atelier.getByRole("searchbox")).toHaveValue("coffee");
      await atelier.getByRole("searchbox").fill("coffee");
      await atelier.getByRole("button", { name: "Clear search" }).click();
      await expect(atelier.getByRole("searchbox")).toBeFocused();
      await expect(atelier.getByRole("listitem")).toHaveCount(3);
      await expect(atelier).toContainText("$102.00");
    }
  }
  const scan = new AxeBuilder({ page });
  clearOptions.forEach(([id]) => scan.include(`[data-search-option="${id}"]`));
  expect((await scan.analyze()).violations).toEqual([]);
});

test("clear effects animate exits safely and recover during rapid retyping", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/design-system#expense-search-clear");
  for (const [id, variant] of clearOptions) {
    const option = page.locator(`[data-search-option="${id}"]`);
    const input = option.getByRole("searchbox");
    const button = option.locator(`[data-clear-motion="${variant}"]`);
    // Record the short exit in-browser so assertions cannot miss its 220ms window.
    await option.evaluate((element) => {
      element.clearEvidence = [];
      const observer = new MutationObserver(() => {
        const button = element.querySelector("[data-clear-motion]");
        if (!button) {
          observer.disconnect();
          return;
        }
        element.clearEvidence.push({
          disabled: button.disabled,
          hidden:
            button
              .closest('[data-clear-present="false"]')
              ?.getAttribute("aria-hidden") === "true",
          scale: new DOMMatrix(getComputedStyle(button).transform).a,
          erasing: [...button.querySelectorAll("svg line")].some(
            (line) => parseFloat(getComputedStyle(line).strokeDashoffset) < 0,
          ),
        });
      });
      observer.observe(element, {
        subtree: true,
        attributes: true,
        childList: true,
      });
    });
    if (testInfo.project.name === "iphone") await button.tap();
    else await button.click();
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(button).toHaveCount(0);
    const evidence = await option.evaluate((element) => element.clearEvidence);
    expect(evidence.some((frame) => frame.disabled && frame.hidden)).toBe(true);
    if (variant === "erase") {
      expect(evidence.some((frame) => frame.erasing)).toBe(true);
    } else {
      expect(evidence.some((frame) => frame.scale < 1)).toBe(true);
    }
    await option.getByRole("button", { name: /Refill example:/ }).click();
    await expect(button).toBeEnabled();
    await button.click();
    await input.fill("Sokha");
    await expect(button).toBeEnabled();
    await expect(option.getByRole("listitem")).toHaveCount(1);
    await input.press("Tab");
    await expect(button).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await expect(button).toHaveCount(0);
    await option.getByRole("button", { name: /Refill example:/ }).click();
    await input.fill("Sokha");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await button.click();
    await expect(input).toBeFocused();
    await expect(button).toHaveCount(0);
    await option.screenshot({
      path: `test-results/search-clear-${variant}-${testInfo.project.name}.png`,
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
});

test("approved search draws the magnifier on repeated presses without interrupting release", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/design-system#expenses-premium");
  const search = page.locator("#atelier-expense-search");
  const input = search.getByRole("searchbox");
  const bar = input.locator("..");
  const paths = search.locator("label svg").locator("circle, path");
  await expect(
    search.locator(
      'label svg[data-icon-library="animate-ui"][data-icon="search"]',
    ),
  ).toBeVisible();
  await expect(
    search.locator('label svg[data-icon-motion="circle-then-handle"]'),
  ).toBeVisible();
  await expect(paths).toHaveCount(2);
  await expect(search.locator("label svg circle")).toHaveAttribute("r", "8");
  const geometry = await search.locator("label svg path").evaluate((path) => {
    const end = path.getPointAtLength(path.getTotalLength());
    return { x: end.x, y: end.y };
  });
  expect(geometry).toEqual({ x: 21, y: 21 });
  const surface = search.locator('[data-mobile-effect="press"] > span');
  await expect(input).toBeEditable();
  await input.scrollIntoViewIfNeeded();
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  const tap = async (target, options) =>
    testInfo.project.name === "iphone"
      ? target.tap(options)
      : target.click(options);
  const expectDrawing = async () => {
    const svg = search.locator("label svg");
    await svg.evaluate((element) => {
      element.drawFrames = [];
      const record = () => {
        const circle = element.querySelector('[data-search-phase="circle"]');
        const handle = element.querySelector('[data-search-phase="handle"]');
        element.drawFrames.push({
          circle: parseFloat(getComputedStyle(circle).strokeDasharray),
          handle: parseFloat(getComputedStyle(handle).strokeDasharray),
          handleOpacity: parseFloat(getComputedStyle(handle).opacity),
        });
      };
      const observer = new MutationObserver(record);
      observer.observe(element, { attributes: true, subtree: true });
      element.drawObserver = observer;
      record();
    });
    // Step every frame so a slow WebKit renderer cannot skip the 120ms handle.
    for (let frame = 0; frame < 40; frame++) {
      await page.clock.runFor(16);
    }
    await expect
      .poll(() =>
        svg.evaluate((element) =>
          element.drawFrames.some(
            (frame) =>
              frame.circle > 0.05 &&
              frame.circle < 0.99 &&
              frame.handleOpacity < 0.01,
          ),
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        paths.evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              parseFloat(getComputedStyle(node).strokeDasharray) >= 0.999 &&
              parseFloat(getComputedStyle(node).opacity) >= 0.999,
          ),
        ),
      )
      .toBe(true);
    const frames = await svg.evaluate((element) => {
      element.drawObserver.disconnect();
      return element.drawFrames;
    });
    expect(
      frames.some(
        (frame) =>
          frame.circle > 0.05 &&
          frame.circle < 0.99 &&
          frame.handleOpacity < 0.01,
      ),
    ).toBe(true);
    expect(
      frames.some(
        (frame) =>
          frame.circle >= 0.999 &&
          frame.handle > 0.05 &&
          frame.handle < 0.99 &&
          frame.handleOpacity > 0.99,
      ),
    ).toBe(true);
    expect(
      frames.every(
        (frame) => frame.handleOpacity < 0.01 || frame.circle >= 0.99,
      ),
    ).toBe(true);
    await expect(surface).toHaveCSS("opacity", "0");
  };
  await tap(input);
  await expect(input).toBeFocused();
  await expectDrawing();
  await tap(input);
  await expectDrawing();
  await tap(bar, { position: { x: 5, y: 25 } });
  await expect(input).toBeFocused();
  await expectDrawing();
  await tap(search.locator("label"));
  await expectDrawing();
  await input.fill("Nary");
  await search.getByRole("button", { name: "Clear search" }).click();
  await expect(input).toBeFocused();
  expect(
    await paths.evaluateAll((nodes) =>
      nodes.every(
        (node) => parseFloat(getComputedStyle(node).strokeDasharray) >= 0.999,
      ),
    ),
  ).toBe(true);
  await input.press("Escape");
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await expectDrawing();
  await tap(input);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(64);
  await expect
    .poll(() =>
      paths.evaluateAll((nodes) =>
        nodes.every(
          (node) => parseFloat(getComputedStyle(node).strokeDasharray) >= 0.999,
        ),
      ),
    )
    .toBe(true);
  await tap(input);
  expect(
    await paths.evaluateAll((nodes) =>
      nodes.every(
        (node) => parseFloat(getComputedStyle(node).strokeDasharray) >= 0.999,
      ),
    ),
  ).toBe(true);
});

const surfaceOptions = [
  ["quiet-glass", "quiet"],
  ["borderless-glass", "borderless"],
  ["fine-underline", "underline"],
];

test("lighter search surfaces use one edge and preview the combined interaction", async ({
  page,
}, testInfo) => {
  await page.goto("/design-system#expense-search-surfaces");
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  await expect(
    atelier.locator('[data-search-surface="borderless"]'),
  ).toBeAttached();
  await expect(
    atelier.locator('[data-search-effect="morph-press"]'),
  ).toBeAttached();
  await expect(atelier.locator('[data-search-clear="pop"]')).toBeAttached();
  await expect(
    page.getByRole("button", {
      name: "Preview in Atelier: Soft pop",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [id, surface] of surfaceOptions) {
      const option = page.locator(`[data-search-option="${id}"]`);
      const input = option.getByRole("searchbox");
      const bar = input.locator("..");
      await expect(input).toBeEditable();
      if (testInfo.project.name === "iphone") await input.tap();
      else await input.click();
      await expect(input).toBeFocused();
      await expect(bar).toHaveCSS("outline-style", "none");
      if (surface === "borderless") {
        await expect(bar).toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
      } else {
        await expect(bar).toHaveCSS("box-shadow", "none");
        await expect(bar).toHaveCSS("border-bottom-color", "rgb(102, 51, 153)");
        await expect(bar).toHaveCSS(
          "border-top-width",
          surface === "underline" ? "0px" : "1px",
        );
      }
      const cancel = option.getByRole("button", {
        name: "Cancel",
        exact: true,
      });
      await expect(cancel).toBeVisible();
      const bounds = await cancel.boundingBox();
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await expect(
        option.locator('[data-mobile-effect="press"]'),
      ).toBeAttached();
      await input.fill("Sokha");
      await expect(option.getByRole("listitem")).toHaveCount(1);
      await option.getByRole("button", { name: "Clear search" }).click();
      await expect(input).toBeFocused();
      await expect(cancel).toBeVisible();
      await option.screenshot({
        path: `test-results/search-surface-${surface}-${width}-${testInfo.project.name}.png`,
      });
      await cancel.click();
      await expect(cancel).toBeHidden();
      await option.getByRole("button", { name: /Preview in Atelier:/ }).click();
      await expect(
        atelier.locator(`[data-search-surface="${surface}"]`),
      ).toBeFocused();
      await expect(
        atelier.locator('[data-search-effect="morph-press"]'),
      ).toBeAttached();
      await atelier.getByRole("searchbox").fill("coffee");
      await expect(atelier.getByRole("listitem")).toHaveCount(1);
      await expect(atelier).toContainText("$102.00");
      await atelier.getByRole("button", { name: "Clear search" }).click();
    }
  }
  const scan = new AxeBuilder({ page });
  surfaceOptions.forEach(([id]) =>
    scan.include(`[data-search-option="${id}"]`),
  );
  expect((await scan.analyze()).violations).toEqual([]);
});

test("borderless search keeps keyboard focus and surfaces retain press motion", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/design-system#expense-search-surfaces");
  for (const [id] of surfaceOptions) {
    const option = page.locator(`[data-search-option="${id}"]`);
    const input = option.getByRole("searchbox");
    const bar = input.locator("..");
    await input.click();
    await expect(
      option.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();
    const bounds = await input.boundingBox();
    const press = option.locator('[data-mobile-effect="press"] > span');
    await input.dispatchEvent("pointerdown", {
      button: 0,
      pointerType: "touch",
      clientX: bounds.x + 5,
      clientY: bounds.y + 5,
    });
    await expect(press).toHaveCSS("opacity", "1");
    await input.dispatchEvent("pointerup", { button: 0, pointerType: "touch" });
    await expect(press).toHaveCSS("opacity", "0");
    if (id === "borderless-glass") {
      await expect(bar).toHaveCSS("outline-style", "none");
      await input.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(input).toBeFocused();
      await expect(bar).toHaveCSS("outline-width", "2px");
      await expect(bar).toHaveCSS("outline-offset", "-2px");
      if (testInfo.project.name === "chromium") {
        await page.emulateMedia({ forcedColors: "active" });
        await expect(bar).toHaveCSS("outline-style", "solid");
        await expect(option.locator('[data-mobile-effect="press"]')).toHaveCSS(
          "display",
          "none",
        );
        await page.emulateMedia({ forcedColors: "none" });
      }
    }
    await input.press("Escape");
    await expect(
      option.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeHidden();
  }
});

const mobileOptions = [
  ["tap-ripple", "ripple"],
  ["glass-press", "press"],
  ["center-underline", "underline"],
  ["magnifier-draw", "draw"],
  ["search-morph", "morph"],
  ["search-morph-press", "morph-press"],
];

test("mobile search treatments preserve search and preview with accessible phone controls", async ({
  page,
}) => {
  await page.goto("/design-system#expense-search-mobile");
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  for (const [optionId, effect] of mobileOptions) {
    const option = page.locator(`[data-search-option="${optionId}"]`);
    const input = option.getByRole("searchbox");
    await input.fill("Sokha");
    await expect(option.getByRole("listitem")).toHaveCount(1);
    await option.getByRole("button", { name: "Clear search" }).click();
    await expect(input).toBeFocused();
    await expect(option.getByRole("listitem")).toHaveCount(3);
    await option.getByRole("button", { name: "Receipts", exact: true }).click();
    await expect(option.getByRole("listitem")).toHaveCount(1);
    await option.getByRole("button", { name: /Preview in Atelier:/ }).click();
    await expect(
      atelier.locator(`[data-search-effect="${effect}"]`),
    ).toBeFocused();
    await atelier.getByRole("searchbox").fill("coffee");
    await expect(atelier.getByRole("listitem")).toHaveCount(1);
    await expect(atelier).toContainText("$102.00");
    await atelier.getByRole("button", { name: "Clear search" }).click();
  }
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [optionId, effect] of mobileOptions) {
      const option = page.locator(`[data-search-option="${optionId}"]`);
      const input = option.getByRole("searchbox");
      await input.fill("coffee");
      const bounds = await input.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      if (["morph", "morph-press"].includes(effect)) {
        const cancel = option.getByRole("button", {
          name: "Cancel",
          exact: true,
        });
        const cancelBounds = await cancel.boundingBox();
        expect(cancelBounds.height).toBeGreaterThanOrEqual(44);
        expect(cancelBounds.x + cancelBounds.width).toBeLessThanOrEqual(width);
        await cancel.click();
        await expect(
          option.getByRole("group", {
            name: "Expense search and filters",
            exact: true,
          }),
        ).toBeFocused();
        await expect(input).toHaveValue("");
        await expect(cancel).toBeHidden();
        await input.click();
        await expect(cancel).toBeVisible();
        await input.press("Escape");
        await expect(cancel).toBeHidden();
      } else
        await expect(option.locator("[data-mobile-effect]")).toHaveCSS(
          "display",
          "none",
        );
    }
  }
  const scan = new AxeBuilder({ page });
  mobileOptions.forEach(([id]) => scan.include(`[data-search-option="${id}"]`));
  expect((await scan.analyze()).violations).toEqual([]);
});

test("mobile search gestures animate from touch and retain stable text and focus", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/design-system#expense-search-mobile");
  for (const [optionId, effect] of mobileOptions) {
    const option = page.locator(`[data-search-option="${optionId}"]`);
    const input = option.getByRole("searchbox");
    await input.scrollIntoViewIfNeeded();
    const before = await input.boundingBox();
    if (testInfo.project.name === "iphone") await input.tap();
    else await input.click();
    await expect(input).toBeFocused();
    const bar = input.locator("..");
    if (["morph", "morph-press"].includes(effect)) {
      await expect(
        option.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeVisible();
      await expect
        .poll(async () =>
          Math.round(before.width - (await input.boundingBox()).width),
        )
        .toBe(74);
      if (effect === "morph-press") {
        const surface = option.locator('[data-mobile-effect="press"] > span');
        const bounds = await input.boundingBox();
        await input.dispatchEvent("pointerdown", {
          button: 0,
          pointerType: "touch",
          clientX: bounds.x + 10,
          clientY: bounds.y + 10,
        });
        await expect(surface).toHaveCSS(
          "transform",
          "matrix(1, 0, 0, 1, 0, 1)",
        );
        await expect(surface).toHaveCSS("opacity", "1");
        expect(Math.abs((await input.boundingBox()).y - bounds.y)).toBeLessThan(
          1,
        );
        await input.dispatchEvent("pointerup", {
          button: 0,
          pointerType: "touch",
        });
        await expect(surface).toHaveCSS("opacity", "0");
      }
      await input.fill("coffee");
      await input.press("Escape");
      await expect(input).toHaveValue("");
      await expect(
        option.getByRole("group", {
          name: "Expense search and filters",
          exact: true,
        }),
      ).toBeFocused();
      await expect
        .poll(async () =>
          Math.round((await input.boundingBox()).width - before.width),
        )
        .toBe(0);
      await input.click();
    } else {
      const layer = option.locator("[data-mobile-effect]");
      await expect(layer).toHaveAttribute("data-active", "true");
      expect(Math.abs((await input.boundingBox()).y - before.y)).toBeLessThan(
        1,
      );
      if (effect === "underline") {
        await expect(layer.locator("span")).toHaveCSS(
          "transform",
          "matrix(1, 0, 0, 1, 0, 0)",
        );
      } else if (effect === "draw") {
        await expect
          .poll(() =>
            option.locator("label svg circle").evaluate((node) => {
              const progress = parseFloat(
                getComputedStyle(node).strokeDasharray,
              );
              return progress > 0.05 && progress < 0.99;
            }),
          )
          .toBe(true);
      } else {
        // Freeze an actual gesture midway for deterministic visual inspection.
        await bar.evaluate((el) =>
          el.getAnimations({ subtree: true }).forEach((a) => {
            a.pause();
            a.currentTime = 160;
          }),
        );
        await expect
          .poll(() =>
            bar.evaluate((el) => el.getAnimations({ subtree: true }).length),
          )
          .toBeGreaterThan(0);
      }
      if (effect === "ripple") {
        expect(
          parseFloat(
            await layer.evaluate((el) =>
              el.style.getPropertyValue("--ripple-size"),
            ),
          ),
        ).toBeGreaterThan(before.width);
      }
    }
    await option.screenshot({
      path: `test-results/search-mobile-${effect}-${testInfo.project.name}.png`,
    });
    await input.fill("Nary");
    await expect(option.getByRole("listitem")).toHaveCount(2);
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (effect !== "morph") {
      await expect(option.locator("[data-mobile-effect]")).toHaveCSS(
        "display",
        "none",
      );
      expect(
        await bar.evaluate((el) => el.getAnimations({ subtree: true }).length),
      ).toBe(0);
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
});

test("expense category icons play on view and replay from card interactions", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/design-system#expenses-premium");
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  const coffee = atelier.locator('[data-expense-icon="coffee"]').first();
  const route = atelier.locator('[data-expense-icon="tuk-tuk"]');
  const moving = (icon) =>
    expect
      .poll(() =>
        icon.locator("svg, svg *").evaluateAll((paths) =>
          paths.some((path) => {
            const style = getComputedStyle(path);
            return (
              Number(style.opacity) < 0.98 ||
              !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(style.transform) ||
              parseFloat(style.strokeDasharray) < 0.98
            );
          }),
        ),
      )
      .toBe(true);
  const settled = (icon) =>
    expect
      .poll(() =>
        icon.locator("svg, svg *").evaluateAll((paths) =>
          paths.every((path) => {
            const style = getComputedStyle(path);
            const length = parseFloat(style.strokeDasharray);
            return (
              Number(style.opacity) > 0.999 &&
              ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(style.transform) &&
              (Number.isNaN(length) || length >= 0.999)
            );
          }),
        ),
      )
      .toBe(true);
  await coffee.scrollIntoViewIfNeeded();
  await expect(coffee).toHaveAttribute("data-icon-playing", "true");
  await moving(coffee);
  await settled(coffee);
  const card = coffee.locator("..");
  if (testInfo.project.name !== "iphone") {
    await card.hover();
    await moving(coffee);
    await settled(coffee);
  }
  await card.dispatchEvent("pointerdown", {
    button: 0,
    pointerType: "touch",
  });
  await moving(coffee);
  await card.dispatchEvent("pointerup", { button: 0, pointerType: "touch" });
  await settled(coffee);
  await card.focus();
  await moving(coffee);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(coffee).toHaveAttribute("data-icon-playing", "false");
  await settled(coffee);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(route).toHaveAttribute("data-icon-playing", "false");
  await route.scrollIntoViewIfNeeded();
  await moving(route);
  await settled(route);
  await route.locator("..").dispatchEvent("pointerdown", {
    button: 0,
    pointerType: "touch",
  });
  await moving(route);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(route).toHaveAttribute("data-icon-playing", "false");
  if (testInfo.project.name === "chromium") {
    await page.emulateMedia({ forcedColors: "active" });
    await coffee.scrollIntoViewIfNeeded();
    await expect(coffee).toHaveAttribute("data-icon-playing", "false");
    await settled(coffee);
  }
});

test("transport icons follow the expense name in previews, cards and edits", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/design-system#expense-transport-icons", {
    waitUntil: "domcontentloaded",
  });
  const preview = page.getByRole("region", {
    name: "Transport icons from expense names",
  });
  const name = preview.getByLabel("Transport expense name", { exact: true });
  const replay = preview.getByRole("button", {
    name: /Matched icon/,
  });
  for (const [value, icon] of [
    ["Taxi to airport", "car"],
    ["TUK TUK home", "tuk-tuk"],
    ["Motobike taxi", "motorbike"],
    ["Scooter rental", "motorbike"],
    ["Motown tickets", "car"],
  ]) {
    await name.fill(value);
    await expect(replay.locator("[data-expense-icon]")).toHaveAttribute(
      "data-expense-icon",
      icon,
    );
  }
  for (const [value, icon] of [
    ["Tuk-tuk home", "tuk-tuk"],
    ["Motorbike taxi", "motorbike"],
  ]) {
    await name.fill(value);
    const symbol = replay.locator(`[data-expense-icon="${icon}"]`);
    await expect(symbol).toHaveAttribute("data-icon-playing", "true");
    await replay.dispatchEvent("pointerdown", {
      button: 0,
      pointerType: "touch",
    });
    await expect
      .poll(() =>
        symbol
          .locator("svg g")
          .evaluate(
            (node) =>
              !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(
                getComputedStyle(node).transform,
              ),
          ),
      )
      .toBe(true);
    await replay.dispatchEvent("pointerup", {
      button: 0,
      pointerType: "touch",
    });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(preview.locator('[data-icon-playing="true"]')).toHaveCount(0);
  for (const width of [320, 393, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await preview.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    for (const button of await preview.getByRole("button").all()) {
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  }
  expect(
    (
      await new AxeBuilder({ page })
        .include('[aria-label="Transport icons from expense names"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 393, height: 852 });
  await preview.screenshot({
    path: `test-results/transport-name-icons-${testInfo.project.name}.png`,
  });
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  const ride = atelier.getByRole("button", { name: /Tuk-tuk home/ });
  await expect(ride.locator('[data-expense-icon="tuk-tuk"]')).toBeAttached();
  await ride.click();
  let drawer = page.getByRole("dialog", { name: "Tuk-tuk home", exact: true });
  await expect(drawer.locator('[data-expense-icon="tuk-tuk"]')).toBeVisible();
  await drawer
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  let edit = page.getByRole("dialog", { name: "Edit expense", exact: true });
  await edit
    .getByLabel("Description", { exact: true })
    .fill("Moto to the market");
  await expect(
    edit.locator('[data-detected-transport="motorbike"]'),
  ).toBeVisible();
  await edit.getByRole("button", { name: "Save changes" }).click();
  drawer = page.getByRole("dialog", {
    name: "Moto to the market",
    exact: true,
  });
  await expect(drawer.locator('[data-expense-icon="motorbike"]')).toBeVisible();
  await drawer.getByRole("button", { name: "Done", exact: true }).click();
  const renamed = atelier.getByRole("button", { name: /Moto to the market/ });
  await expect(
    renamed.locator('[data-expense-icon="motorbike"]'),
  ).toBeVisible();
  await expect(atelier.locator("number-flow-react")).toHaveAccessibleName(
    "$102.00",
  );
  await renamed.click();
  await drawer
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  edit = page.getByRole("dialog", { name: "Edit expense", exact: true });
  await edit
    .getByLabel("Description", { exact: true })
    .fill("Tuk-tuk groceries");
  await edit.getByRole("combobox", { name: "Category", exact: true }).click();
  await page.getByRole("option", { name: "Groceries", exact: true }).click();
  await expect(edit.locator("[data-detected-transport]")).toHaveCount(0);
  await edit.getByRole("button", { name: "Save changes" }).click();
  drawer = page.getByRole("dialog", { name: "Tuk-tuk groceries", exact: true });
  await expect(
    drawer.locator('[data-expense-icon="shopping-basket"]'),
  ).toBeVisible();
});

test("all fifteen expense categories animate and preview in Atelier", async ({
  page,
}) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/design-system#expense-categories");
  const categories = page.getByRole("region", {
    name: "Animated expense categories",
  });
  const options = categories.locator("[data-expense-category]");
  await expect(options).toHaveCount(15);
  const names = new Set();
  for (const option of await options.all()) {
    await option.scrollIntoViewIfNeeded();
    const icon = option.locator("[data-expense-icon]");
    await expect(icon).toHaveAttribute("data-icon-playing", "true");
    names.add(await icon.getAttribute("data-expense-icon"));
    const animated = await option.evaluate(async (button) => {
      const signature = () =>
        JSON.stringify(
          [...button.querySelectorAll("svg, svg *")].map((node) => {
            const style = getComputedStyle(node);
            return [
              style.transform,
              style.opacity,
              style.strokeDasharray,
              node.getAttribute("d"),
            ];
          }),
        );
      const initial = signature();
      let changed = false;
      button.dispatchEvent(
        new PointerEvent("pointerdown", {
          button: 0,
          pointerType: "touch",
          bubbles: true,
        }),
      );
      await new Promise((resolve) => {
        const start = performance.now();
        function sample() {
          changed ||= signature() !== initial;
          if (performance.now() - start < 500) requestAnimationFrame(sample);
          else resolve();
        }
        requestAnimationFrame(sample);
      });
      button.dispatchEvent(
        new PointerEvent("pointerup", {
          button: 0,
          pointerType: "touch",
          bubbles: true,
        }),
      );
      return changed;
    });
    expect(animated, await option.innerText()).toBe(true);
    await option.click();
    await expect(option).toHaveAttribute("aria-pressed", "true");
  }
  expect(names.size).toBe(15);
  const utilities = categories.getByRole("button", {
    name: "Utilities",
    exact: true,
  });
  await utilities.click();
  await categories
    .getByRole("button", { name: "Preview category in Atelier" })
    .click();
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  await expect(
    atelier.getByRole("listitem").first().locator('[data-expense-icon="plug"]'),
  ).toBeVisible();
  await expect(atelier).toContainText("$102.00");
  await expect(atelier.getByRole("listitem")).toHaveCount(3);
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const option of await options.all()) {
      const bounds = await option.boundingBox();
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    }
  }
  await categories.scrollIntoViewIfNeeded();
  await categories.screenshot({ path: "test-results/expense-categories.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(categories.locator('[data-icon-playing="true"]')).toHaveCount(0);
  const scan = await new AxeBuilder({ page })
    .include('[aria-label="Animated expense categories"]')
    .analyze();
  expect(scan.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("premium expense drawers retain details and isolate sample edits", async ({
  page,
}) => {
  await page.goto("/design-system#expense-drawer", {
    waitUntil: "domcontentloaded",
  });
  for (const [id, name] of [
    ["paper", "Paper Atelier"],
    ["amethyst", "Amethyst Suite"],
    ["gallery", "Quiet Gallery"],
  ]) {
    const option = page.locator(`[data-drawer-option="${id}"]`);
    const launch = option.getByRole("button", { name: `Open ${name} drawer` });
    await expect(launch).toBeEnabled();
    await launch.click();
    let drawer = page.getByRole("dialog", {
      name: "Dinner at Malis",
      exact: true,
    });
    for (const text of [
      "Weekend dinner",
      "Total expense",
      "$72.00",
      "Your share",
      "$24.00",
      "Paid by",
      "Nary (you)",
      "29 Oct 2026",
      "Meals & restaurants",
      "Split between 3 people",
      "Sokha",
      "Mali",
      id === "paper" ? "View original receipt" : "Receipt attached",
    ]) {
      await expect(drawer).toContainText(text);
    }
    const receiptTrigger = drawer.getByRole("button", {
      name: /Receipt attached|View original receipt/,
    });
    await receiptTrigger.scrollIntoViewIfNeeded();
    const sourceId = await drawer.getAttribute("id");
    const sourceBody = drawer.locator("[data-expense-paper]").locator("..");
    const sourceScroll = await sourceBody.evaluate((el) => el.scrollTop);
    await receiptTrigger.click();
    const viewer = page.getByRole("dialog", {
      name: "Receipt preview",
      exact: true,
    });
    await expect(viewer).toContainText("Sample receipt");
    await expect(viewer).not.toHaveAttribute("id", sourceId);
    await expect(page.locator(`[id="${sourceId}"]`)).toBeVisible();
    await expect(
      viewer.getByRole("button", { name: "Close receipt preview" }),
    ).toBeFocused();
    await viewer.getByRole("button", { name: "Zoom in", exact: true }).click();
    await viewer.getByRole("button", { name: "Zoom in", exact: true }).click();
    await expect(
      viewer.getByRole("status", { name: "Receipt zoom" }),
    ).toHaveText("150%");
    expect(
      await viewer
        .locator("[data-receipt-paper]")
        .evaluate((el) => el.getBoundingClientRect().width / el.offsetWidth),
    ).toBeCloseTo(1.5, 2);
    await viewer.getByRole("button", { name: "Fit receipt" }).click();
    await expect(
      viewer.getByRole("status", { name: "Receipt zoom" }),
    ).toHaveText("100%");
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
    await expect(receiptTrigger).toBeFocused();
    expect(await sourceBody.evaluate((el) => el.scrollTop)).toBeCloseTo(
      sourceScroll,
      0,
    );
    await receiptTrigger.click();
    await viewer.getByRole("button", { name: "Back to expense" }).click();
    await expect(receiptTrigger).toBeFocused();
    await drawer
      .getByRole("button", { name: "Edit expense", exact: true })
      .click();
    const edit = page.getByRole("dialog", {
      name: "Edit expense",
      exact: true,
    });
    await edit
      .getByLabel("Description", { exact: true })
      .fill(`${name} dinner`);
    await edit.getByLabel("Amount · USD").fill("90");
    await edit
      .getByLabel("Notes", { exact: false })
      .fill("A lovely evening together.");
    await edit.getByRole("button", { name: "Save changes" }).click();
    drawer = page.getByRole("dialog", { name: `${name} dinner`, exact: true });
    await expect(drawer).toContainText("$90.00");
    await expect(drawer).toContainText("$30.00");
    await expect(drawer).toContainText("A lovely evening together.");
    await drawer
      .getByRole("button", {
        name: id === "paper" ? "Close expense details" : "Done",
        exact: true,
      })
      .click();
    await expect(launch).toBeFocused();
    await expect(
      page.locator('[data-expenses-preview="atelier"]'),
    ).toContainText("$102.00");
    await option.getByRole("button", { name: "Manual", exact: true }).click();
    await launch.click();
    drawer = page.getByRole("dialog", { name: "Tuk-tuk home", exact: true });
    await expect(drawer).toContainText("Added manually · no receipt attached");
    await expect(drawer).toContainText("$12.00");
    await expect(drawer).toContainText("$4.00");
    const removeAction = drawer.getByRole("button", {
      name: "Remove expense",
      exact: true,
    });
    const detailsId = await drawer.getAttribute("id");
    await removeAction.focus();
    await page.keyboard.press("Enter");
    const popup = page.getByRole("alertdialog");
    await expect(popup).toHaveAccessibleName("Remove “Tuk-tuk home”?");
    await expect(page.locator(`[id="${detailsId}"]`)).toBeVisible();
    const keep = popup.getByRole("button", { name: "Keep expense" });
    await expect(keep).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      popup.getByRole("button", { name: "Remove expense" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(keep).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden();
    await expect(removeAction).toBeFocused();
    await expect(drawer).toContainText("$12.00");
    await removeAction.click();
    await expect(keep).toBeFocused();
    await keep.click();
    await expect(removeAction).toBeFocused();
    await removeAction.click();
    const confirmation = page.getByRole("alertdialog");
    await expect(
      confirmation.getByRole("button", { name: "Keep expense" }),
    ).toBeFocused();
    await confirmation
      .getByRole("button", { name: "Remove expense", exact: true })
      .click();
    await option.getByRole("button", { name: "Restore sample" }).click();
    await expect(launch).toBeVisible();
  }
});

test("premium expense drawers fit phone and desktop and expose accessible controls", async ({
  page,
}, testInfo) => {
  await page.goto("/design-system#expense-drawer", {
    waitUntil: "domcontentloaded",
  });
  for (const [width, height] of [
    [1280, 900],
    [393, 500],
    [320, 700],
  ]) {
    await page.setViewportSize({ width, height });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const [id, name] of [
      ["paper", "Paper Atelier"],
      ["amethyst", "Amethyst Suite"],
      ["gallery", "Quiet Gallery"],
    ]) {
      const launch = page
        .locator(`[data-drawer-option="${id}"]`)
        .getByRole("button", { name: `Open ${name} drawer` });
      await expect(launch).toBeEnabled();
      await launch.click();
      const drawer = page.getByRole("dialog", {
        name: "Dinner at Malis",
        exact: true,
      });
      const bounds = await drawer.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height + 1);
      expect(
        await drawer.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
      const total = drawer.locator("[data-expense-total]");
      await expect(total.getByText("$72.00", { exact: true })).toBeInViewport({
        ratio: 1,
      });
      // WebKit rounds fully visible fractional text bounds just below 1.
      await expect(
        total.getByText("Your share", { exact: false }),
      ).toBeInViewport({ ratio: 0.999 });
      await expect(
        drawer.getByRole("button", { name: "Edit expense", exact: true }),
      ).toBeInViewport();
      if (width === 320) {
        expect(
          (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
            .violations,
        ).toEqual([]);
        await drawer.screenshot({
          path: `test-results/premium-drawer-${id}-${testInfo.project.name}.png`,
        });
      }
      if (id === "paper") {
        await expect(
          drawer.getByRole("button", { name: "Remove expense", exact: true }),
        ).toBeInViewport();
        const trigger = drawer.getByRole("button", {
          name: "View original receipt",
          exact: true,
        });
        await trigger.click();
        const viewer = page.getByRole("dialog", {
          name: "Receipt preview",
          exact: true,
        });
        const viewerBounds = await viewer.boundingBox();
        if (width < 640) {
          expect(viewerBounds.x).toBe(0);
          expect(viewerBounds.y).toBe(0);
          expect(viewerBounds.width).toBe(width);
          expect(viewerBounds.height).toBe(height);
        } else {
          expect(viewerBounds.width).toBeLessThanOrEqual(960);
          expect(
            Math.abs(viewerBounds.x + viewerBounds.width / 2 - width / 2),
          ).toBeLessThan(2);
          expect(
            Math.abs(viewerBounds.y + viewerBounds.height / 2 - height / 2),
          ).toBeLessThan(2);
        }
        await expect(
          viewer.getByRole("button", { name: "Back to expense" }),
        ).toBeInViewport();
        await expect(
          viewer.getByRole("button", { name: "Close receipt preview" }),
        ).toBeInViewport();
        await viewer
          .getByRole("button", { name: "Zoom in", exact: true })
          .click();
        await viewer
          .getByRole("button", { name: "Zoom in", exact: true })
          .click();
        const document = viewer.getByRole("region", {
          name: "Receipt document",
        });
        await document.focus();
        await page.keyboard.press("ArrowDown");
        await expect
          .poll(() => document.evaluate((el) => el.scrollTop))
          .toBeGreaterThan(0);
        await viewer.getByRole("button", { name: "Fit receipt" }).click();
        await expect
          .poll(() => document.evaluate((el) => el.scrollTop))
          .toBe(0);
        expect(
          (
            await new AxeBuilder({ page })
              .include("[data-receipt-viewer]")
              .analyze()
          ).violations,
        ).toEqual([]);
        await viewer.screenshot({
          path: `test-results/receipt-viewer-${width}-${testInfo.project.name}.png`,
        });
        await viewer
          .getByRole("button", { name: "Close receipt preview" })
          .click();
        await expect(trigger).toBeFocused();
      }
      await page.keyboard.press("Escape");
      await expect(launch).toBeFocused();
    }
  }
});

test("Atelier drawer edits in place, preserves the list and shows the receipt", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/design-system#expenses-premium", {
    waitUntil: "domcontentloaded",
  });
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  const search = atelier.getByRole("searchbox");
  await search.fill("dinner");
  await atelier.getByRole("button", { name: "Receipts", exact: true }).click();
  const card = atelier.getByRole("button", { name: /Dinner at Malis/ });
  await card.click();
  let drawer = page.getByRole("dialog", {
    name: "Dinner at Malis",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  const panelId = await drawer.getAttribute("id");
  await expect(drawer).toContainText("$72.00");
  await expect(drawer).toContainText("$24.00");
  await expect(drawer).toContainText("Split between 3 people");
  await drawer.getByRole("button", { name: /Receipt attached/ }).click();
  const receipt = page.getByRole("dialog", { name: "Receipt preview" });
  await expect(receipt).toContainText("Sample receipt");
  await expect(receipt).not.toHaveAttribute("id", panelId);
  await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();
  await receipt.getByRole("button", { name: "Back to expense" }).click();
  await drawer
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Edit expense", exact: true });
  await expect(edit).toHaveAttribute("id", panelId);
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await edit.getByLabel("Description", { exact: true }).fill("Unsaved edit");
  await edit.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(drawer).toBeVisible();
  await drawer
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  await expect(edit.getByLabel("Description", { exact: true })).toHaveValue(
    "Dinner at Malis",
  );
  await edit.getByLabel("Description", { exact: true }).fill("");
  await edit.getByLabel("Amount · USD").fill("0");
  await edit.getByRole("button", { name: "Save changes" }).click();
  await expect(edit.getByLabel("Description", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(edit).toContainText("Give the expense a name.");
  await edit.getByLabel("Description", { exact: true }).fill("Team dinner");
  await edit.getByLabel("Amount · USD").fill("90.00");
  await edit.getByRole("combobox", { name: "Paid by" }).click();
  await page.getByRole("option", { name: "Sokha", exact: true }).click();
  await edit.getByRole("combobox", { name: "Category", exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(15);
  await page.getByRole("option", { name: "Groceries", exact: true }).click();
  await edit.getByRole("checkbox", { name: "Mali", exact: true }).uncheck();
  await edit
    .getByLabel("Notes", { exact: false })
    .fill("Shared after the team meeting.");
  await edit.getByRole("button", { name: "Save changes" }).click();
  drawer = page.getByRole("dialog", { name: "Team dinner", exact: true });
  await expect(drawer).toHaveAttribute("id", panelId);
  await expect(drawer).toContainText("$90.00");
  await expect(drawer).toContainText("$45.00");
  await expect(drawer).toContainText("Split between 2 people");
  await expect(drawer).toContainText("Groceries");
  await expect(drawer).toContainText("Shared after the team meeting.");
  await drawer.getByRole("button", { name: "Done", exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(search).toHaveValue("dinner");
  await expect(
    atelier.getByRole("button", { name: "Receipts", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const updatedCard = atelier.getByRole("button", { name: /Team dinner/ });
  await expect(updatedCard).toBeFocused();
  await expect(updatedCard).toContainText("Paid by Sokha");
  await expect(atelier.locator("number-flow-react")).toHaveAccessibleName(
    "$120.00",
  );
  await expect(atelier).toContainText("Your share $58.00");
});

test("Atelier drawer confirms removal and keeps actions reachable on small screens", async ({
  page,
}, testInfo) => {
  await page.goto("/design-system#expense-drawer", {
    waitUntil: "domcontentloaded",
  });
  const launcher = page.getByRole("button", {
    name: "Preview expense drawer in Atelier",
    exact: true,
  });
  for (const [width, height] of [
    [320, 700],
    [393, 500],
    [1280, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await launcher.click();
    const drawer = page.getByRole("dialog", {
      name: "Dinner at Malis",
      exact: true,
    });
    await expect(drawer).toBeVisible();
    const bounds = await drawer.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    expect(Math.abs(bounds.y + bounds.height - height)).toBeLessThan(2);
    const editButton = drawer.getByRole("button", {
      name: "Edit expense",
      exact: true,
    });
    const editBounds = await editButton.boundingBox();
    expect(editBounds.height).toBeGreaterThanOrEqual(44);
    expect(editBounds.y + editBounds.height).toBeLessThanOrEqual(height);
    await drawer
      .getByRole("button", { name: "Remove expense", exact: true })
      .click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText("Dinner at Malis");
    await expect(confirm).toContainText("$72.00");
    const confirmBounds = await confirm.boundingBox();
    expect(confirmBounds.width).toBeLessThanOrEqual(400);
    expect(confirmBounds.x).toBeGreaterThanOrEqual(0);
    expect(confirmBounds.y).toBeGreaterThanOrEqual(0);
    expect(confirmBounds.x + confirmBounds.width).toBeLessThanOrEqual(
      width + 1,
    );
    expect(confirmBounds.y + confirmBounds.height).toBeLessThanOrEqual(
      height + 1,
    );
    expect(
      Math.abs(confirmBounds.y + confirmBounds.height / 2 - height / 2),
    ).toBeLessThan(2);
    expect(
      (await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze())
        .violations,
    ).toEqual([]);
    await confirm.screenshot({
      path: `test-results/expense-removal-${width}-${testInfo.project.name}.png`,
    });
    await expect(
      confirm.getByRole("button", { name: "Keep expense" }),
    ).toBeFocused();
    await confirm.getByRole("button", { name: "Keep expense" }).click();
    await editButton.click();
    const edit = page.getByRole("dialog", {
      name: "Edit expense",
      exact: true,
    });
    const saveBounds = await edit
      .getByRole("button", { name: "Save changes" })
      .boundingBox();
    expect(saveBounds.y + saveBounds.height).toBeLessThanOrEqual(height);
    if (height === 500) {
      await page.keyboard.press("Escape");
      await expect(launcher).toBeFocused();
      await launcher.click();
      await expect(drawer).toBeVisible();
    } else
      await edit.getByRole("button", { name: "Cancel", exact: true }).click();
    if (width === 320) {
      const violations = (
        await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
      ).violations;
      expect(violations).toEqual([]);
      await drawer.screenshot({
        path: `test-results/expense-drawer-${testInfo.project.name}.png`,
      });
    }
    await drawer.getByRole("button", { name: "Done", exact: true }).click();
    await expect(launcher).toBeFocused();
  }
  const atelier = page.locator('[data-expenses-preview="atelier"]');
  await atelier.getByRole("button", { name: /Dinner at Malis/ }).click();
  const drawer = page.getByRole("dialog", {
    name: "Dinner at Malis",
    exact: true,
  });
  await drawer
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  const confirm = page.getByRole("alertdialog");
  await confirm
    .getByRole("button", { name: "Remove expense", exact: true })
    .click();
  await expect(confirm).toBeHidden();
  await expect(atelier.getByRole("listitem")).toHaveCount(2);
  await expect(atelier.locator("number-flow-react")).toHaveAccessibleName(
    "$30.00",
  );
  await expect(atelier).toContainText("Your share $13.00");
  await expect(
    atelier.getByRole("button", { name: "Add expense", exact: true }),
  ).toBeFocused();
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
  await page.goto("/design-system#expenses-page", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator("#atelier-expense-search").getByRole("searchbox"),
  ).toBeEditable();
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
  await page.goto("/design-system#expenses-page", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.locator("#atelier-expense-search").getByRole("searchbox"),
  ).toBeEditable();
  await expect(
    page.locator("#expense-cards, [data-receipt-option]"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Receipt cards", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Original receipt", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("#expense-search-effects")).toHaveCount(0);
  for (const retired of [
    "line",
    "tint",
    "frame",
    "toolbar",
    "focus-beam",
    "soft-spotlight",
    "gradient-rim",
  ]) {
    await expect(page.locator(`[data-search-option="${retired}"]`)).toHaveCount(
      0,
    );
  }
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
  ).toHaveCount(24);
  const scan = async () =>
    expect(
      (await new AxeBuilder({ page }).include("#expenses-page").analyze())
        .violations,
    ).toEqual([]);
  await scan();
  await page.getByRole("button", { name: "Empty bill", exact: true }).click();
  await scan();
});
