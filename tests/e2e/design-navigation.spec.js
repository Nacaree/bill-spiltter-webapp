import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function captureIconMotion(button) {
  return button.evaluate(async (node) => {
    const moving = () =>
      Array.from(node.querySelectorAll("svg, svg *")).some((part) => {
        const style = getComputedStyle(part);
        const matrix = new DOMMatrixReadOnly(style.transform);
        return (
          !matrix.isIdentity ||
          Number(style.opacity) < 0.999 ||
          (part.hasAttribute("data-receipt-detail") &&
            parseFloat(style.strokeDasharray) < 0.999)
        );
      });
    node.click();
    let moved = false;
    let movedAfter350ms = false;
    const start = performance.now();
    while (performance.now() - start < 1100) {
      await new Promise(requestAnimationFrame);
      const active = moving();
      moved ||= active;
      if (performance.now() - start > 350) movedAfter350ms ||= active;
    }
    return { moved, resting: !moving(), movedAfter350ms };
  });
}

test("navigation concepts fit the reference and share working selections", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 852 });
    await page.goto("/design-system#navigation");
    const section = page.locator("#navigation");
    await expect(section.locator('svg[data-icon="receipt-text"]')).toHaveCount(
      3,
    );
    await expect(section.locator("[data-receipt-detail]")).toHaveCount(6);
    await expect(
      section.getByRole("heading", { name: "Navigation options" }),
    ).toBeVisible();
    for (const [index, title] of [
      "Floating dock",
      "Quiet bar",
      "Compact capsule",
    ].entries()) {
      const nav = section.getByRole("navigation", {
        name: `${title} bill sections`,
      });
      const destination = nav.getByRole("button", {
        name: ["Expenses", "Settle", "Overview"][index],
      });
      await destination.click();
      for (const preview of await section.getByRole("navigation").all()) {
        await expect(preview.locator('[aria-current="page"]')).toHaveText(
          await destination.textContent(),
        );
      }
      const geometry = await nav.evaluate((node) => ({
        left: node.getBoundingClientRect().left,
        right: node.getBoundingClientRect().right,
        buttons: Array.from(node.querySelectorAll("button"), (button) => ({
          height: button.getBoundingClientRect().height,
          fits: button.scrollWidth <= button.clientWidth,
        })),
      }));
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
      expect(
        geometry.buttons.every((button) => button.height >= 48 && button.fits),
      ).toBe(true);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  }
  const keyboardButton = page
    .getByRole("navigation", { name: "Quiet bar bill sections" })
    .getByRole("button", { name: "Expenses" });
  await keyboardButton.focus();
  await page.keyboard.press("Enter");
  await expect(keyboardButton).toBeFocused();
  await expect(page.locator("#navigation").getByRole("status")).toContainText(
    "Previewing Expenses",
  );
  expect(
    (await new AxeBuilder({ page }).include("#navigation").analyze())
      .violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("navigation selection respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-system#navigation");
  const nav = page.getByRole("navigation", {
    name: "Compact capsule bill sections",
  });
  const settle = nav.getByRole("button", { name: "Settle" });
  await settle.click();
  await expect(settle).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('[aria-hidden="true"]').first()).toHaveCSS(
    "transition-duration",
    "0s",
  );
  const quiet = page.getByRole("navigation", {
    name: "Quiet bar bill sections",
  });
  const highlight = quiet.locator('[data-navigation-indicator="quiet"]');
  await expect(highlight).toHaveCSS("transition-duration", "0s");
  await expect(
    quiet.getByRole("button", { name: "Settle" }).locator("span").last(),
  ).toHaveCSS("transition-duration", "0s");
  const indicator = await highlight.boundingBox();
  const selected = await quiet
    .getByRole("button", { name: "Settle" })
    .boundingBox();
  expect(indicator.x + indicator.width / 2).toBeCloseTo(
    selected.x + selected.width / 2,
    0,
  );
  expect(
    await captureIconMotion(quiet.getByRole("button", { name: "Expenses" })),
  ).toEqual({ moved: false, resting: true, movedAfter350ms: false });
});

test("chosen quiet bar icons play once, settle, and replay on later selection", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/design-system#navigation");
  const nav = page.getByRole("navigation", { name: "Quiet bar bill sections" });
  await nav.scrollIntoViewIfNeeded();
  for (const label of ["Expenses", "Settle", "Overview", "Expenses"]) {
    expect(
      await captureIconMotion(nav.getByRole("button", { name: label })),
    ).toEqual({ moved: true, resting: true, movedAfter350ms: true });
    await expect(nav.getByRole("button", { name: label })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  await nav.getByRole("button", { name: "Settle" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await captureIconMotion(nav.getByRole("button", { name: "Overview" })),
  ).toEqual({ moved: false, resting: true, movedAfter350ms: false });
});

test("icon playback waits for the highlight to finish moving", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/design-system#navigation");
  const nav = page.getByRole("navigation", { name: "Quiet bar bill sections" });
  await nav.scrollIntoViewIfNeeded();
  const paused = await nav.evaluate(async (node) => {
    node.querySelectorAll("button")[1].click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const slide = node
      .querySelector('[data-navigation-indicator="quiet"]')
      .getAnimations()[0];
    if (!slide) return false;
    slide.pause();
    slide.currentTime = 120;
    await new Promise((resolve) => setTimeout(resolve, 350));
    const linesVisible = Array.from(
      node.querySelectorAll("[data-receipt-detail]"),
    ).every((line) => getComputedStyle(line).opacity === "1");
    slide.finish();
    return linesVisible;
  });
  expect(paused).toBe(true);
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
  await expect(firstLine).toHaveCSS("opacity", "1");
});

test("receipt lifts and settles while both lines write at one pace in both surfaces", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const [url, label] of [
    ["/design-system#navigation", "Quiet bar bill sections"],
    ["/screen2?preview=populated", "Bill sections"],
  ]) {
    await page.goto(url);
    const nav = page.getByRole("navigation", { name: label });
    await nav.scrollIntoViewIfNeeded();
    const sequence = await nav.evaluate(async (node) => {
      const directions = Array.from(
        node.querySelectorAll("[data-receipt-detail]"),
        (line) =>
          line.getPointAtLength(0).x <
          line.getPointAtLength(line.getTotalLength()).x,
      );
      const progress = () =>
        Array.from(node.querySelectorAll("[data-receipt-detail]"), (line) => {
          const style = getComputedStyle(line);
          return Number(style.opacity) === 0
            ? 0
            : parseFloat(style.strokeDasharray);
        });
      const paperPosition = () => {
        const paper = node.querySelector('svg[data-icon="receipt-text"]');
        return (
          paper.getBoundingClientRect().top -
          paper.parentElement.getBoundingClientRect().top
        );
      };
      const restingPosition = paperPosition();
      node.querySelectorAll("button")[1].click();
      const start = performance.now();
      let started = false;
      let writingTogether = false;
      let linesInSync = true;
      let lifted = false;
      let overshot = false;
      let greatestLift = 0;
      while (performance.now() - start < 1100) {
        await new Promise(requestAnimationFrame);
        const [first, second] = progress();
        const rise = restingPosition - paperPosition();
        lifted ||= rise > 0.5;
        overshot ||= rise < -0.1;
        greatestLift = Math.max(greatestLift, rise);
        if (first < 0.99) started = true;
        if (!started) continue;
        writingTogether ||=
          first > 0.01 && first < 0.98 && second > 0.01 && second < 0.98;
        linesInSync &&= Math.abs(first - second) < 0.03;
      }
      return {
        directions,
        writingTogether,
        linesInSync,
        lifted,
        overshot,
        gentleLift: greatestLift <= 1.6,
        settled: Math.abs(paperPosition() - restingPosition) < 0.1,
        final: progress(),
      };
    });
    expect(sequence).toEqual({
      directions: [true, true],
      writingTogether: true,
      linesInSync: true,
      lifted: true,
      overshot: false,
      gentleLift: true,
      settled: true,
      final: [1, 1],
    });
  }
});

test("quiet bar slides one icon highlight and follows the latest selection", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/design-system#navigation");
  const nav = page.getByRole("navigation", { name: "Quiet bar bill sections" });
  await nav.scrollIntoViewIfNeeded();
  const motion = await nav.evaluate(async (node) => {
    const indicator = node.querySelector('[data-navigation-indicator="quiet"]');
    const center = () => {
      const rect = indicator.getBoundingClientRect();
      return rect.x + rect.width / 2;
    };
    const start = center();
    const button = node.querySelectorAll("button")[1];
    const label = button.lastElementChild;
    const labelTransform = () => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(label).transform);
      return { scale: matrix.a, y: matrix.f };
    };
    const labelStart = labelTransform();
    button.click();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const animation = indicator.getAnimations()[0];
    const textAnimation = label.getAnimations()[0];
    if (!animation || !textAnimation) return null;
    const duration = animation.effect.getComputedTiming().duration;
    animation.pause();
    animation.currentTime = duration / 2;
    textAnimation.pause();
    textAnimation.currentTime = duration / 2;
    const middle = center();
    const labelMiddle = labelTransform();
    animation.finish();
    textAnimation.finish();
    const end = center();
    const labelEnd = labelTransform();
    return {
      start,
      middle,
      end,
      duration,
      labelStart,
      labelMiddle,
      labelEnd,
      textDuration: textAnimation.effect.getComputedTiming().duration,
    };
  });
  expect(motion).not.toBeNull();
  expect(motion.duration).toBe(240);
  expect(motion.middle).toBeGreaterThan(motion.start);
  expect(motion.middle).toBeLessThan(motion.end);
  expect(motion.textDuration).toBe(motion.duration);
  expect(motion.labelMiddle.scale).toBeGreaterThan(motion.labelStart.scale);
  expect(motion.labelMiddle.scale).toBeLessThan(motion.labelEnd.scale);
  expect(motion.labelMiddle.y).toBeLessThan(motion.labelStart.y);
  expect(motion.labelMiddle.y).toBeGreaterThan(motion.labelEnd.y);
  await nav.getByRole("button", { name: "Settle" }).click();
  await nav.getByRole("button", { name: "Overview" }).click();
  await expect
    .poll(async () =>
      nav.evaluate((node) => {
        const indicator = node
          .querySelector('[data-navigation-indicator="quiet"]')
          .getBoundingClientRect();
        const icon = node
          .querySelector('[aria-current="page"] svg')
          .getBoundingClientRect();
        return Math.abs(
          indicator.x + indicator.width / 2 - icon.x - icon.width / 2,
        );
      }),
    )
    .toBeLessThan(1);
  await expect(nav.locator('[aria-current="page"]')).toHaveText("Overview");
});
