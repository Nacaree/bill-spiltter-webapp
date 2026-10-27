import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// A negative UTC offset catches date-only values accidentally parsed as UTC.
test.use({ timezoneId: "America/Los_Angeles" });
async function preview(page) {
  await page.clock.setFixedTime(new Date("2026-10-27T19:30:00Z"));
  await page.goto("/design-system#date-picker");
  const section = page.locator("#date-picker");
  const trigger = section.getByRole("button", { name: /^Expense date/ });
  await expect(trigger).toContainText("27 Oct 2026");
  return { section, trigger };
}
async function open(page, trigger) {
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Expense date calendar",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("opacity", "1");
  return dialog;
}

test("date picker supports keyboard selection, animated month navigation and focus restoration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  const { section, trigger } = await preview(page);
  let dialog = await open(page, trigger);
  const panelBounds = await dialog.boundingBox();
  expect(panelBounds.y).toBeGreaterThanOrEqual(0);
  expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(1000);
  const yesterday = await dialog
    .getByRole("button", { name: "Yesterday", exact: true })
    .boundingBox();
  expect(yesterday.y + yesterday.height).toBeLessThanOrEqual(
    panelBounds.y + panelBounds.height,
  );
  const selected = dialog.getByRole("button", {
    name: /October 27.*2026.*selected/,
  });
  await expect(selected).toHaveCSS("transform", "none");
  await expect(selected).toBeFocused();
  await selected.press("ArrowRight");
  const nextDay = dialog.getByRole("button", { name: /October 28.*2026/ });
  await expect(nextDay).toBeFocused();
  await nextDay.press("Enter");
  await expect(section.getByRole("status")).toContainText("28 Oct 2026");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  dialog = await open(page, trigger);
  await dialog.getByRole("button", { name: /next month/i }).click();
  await expect(
    dialog.getByRole("grid", { name: "November 2026", exact: true }),
  ).toBeVisible();
  await expect(dialog.locator(".rdp-weeks_after_enter")).toHaveCSS(
    "animation-duration",
    "0.3s",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText("28 Oct 2026");
});

test("date picker shortcuts, outlined today and purple selection fit a phone and pass accessibility checks", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const { section, trigger } = await preview(page);
  let dialog = await open(page, trigger);
  await dialog.getByRole("button", { name: "Today", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(section.getByRole("status")).toContainText("27 Oct 2026");
  dialog = await open(page, trigger);
  await dialog.getByRole("button", { name: "Yesterday", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(section.getByRole("status")).toContainText("26 Oct 2026");
  dialog = await open(page, trigger);
  const today = dialog.getByRole("button", {
    name: /Today,.*October 27.*2026/,
  });
  await expect(today).toHaveCSS(
    "box-shadow",
    "rgb(102, 51, 153) 0px 0px 0px 1px inset",
  );
  const selected = dialog.getByRole("button", {
    name: /October 26.*2026.*selected/,
  });
  await expect(selected).toHaveCSS("background-color", "rgb(102, 51, 153)");
  const circle = await selected.boundingBox();
  expect(Math.abs(circle.width - circle.height)).toBeLessThanOrEqual(1);
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(15);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(305);
  expect(bounds.y).toBeGreaterThanOrEqual(15);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(725);
  // On a phone the full calendar and both shortcuts fit without scrolling.
  expect(
    await dialog.evaluate((node) => node.scrollHeight <= node.clientHeight),
  ).toBe(true);
  for (const name of ["Today", "Yesterday"]) {
    const shortcut = await dialog
      .getByRole("button", { name, exact: true })
      .boundingBox();
    expect(shortcut.y + shortcut.height).toBeLessThanOrEqual(
      bounds.y + bounds.height,
    );
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .exclude("nextjs-portal")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `/private/tmp/bill-splitter-calendar-${testInfo.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("date picker respects reduced motion and keeps the preview offline without hydration errors", async ({
  page,
}) => {
  const errors = [],
    backend = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|did not match/i.test(message.text())
    )
      errors.push(message.text());
  });
  page.on("request", (request) => {
    if (/supabase\.co|generativelanguage\.googleapis\.com/.test(request.url()))
      backend.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { trigger } = await preview(page);
  const dialog = await open(page, trigger);
  await dialog.getByRole("button", { name: /next month/i }).click();
  await expect(
    dialog.getByRole("grid", { name: "November 2026", exact: true }),
  ).toBeVisible();
  expect(
    await dialog.evaluate(
      (node) =>
        node
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  await dialog.getByRole("button", { name: "Yesterday", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toContainText("26 Oct 2026");
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
  expect(backend).toEqual([]);
});
