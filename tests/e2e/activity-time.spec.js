import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fixedNow = new Date("2026-10-29T12:34:00Z");
test.use({ timezoneId: "Asia/Phnom_Penh" });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: fixedNow });
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("activity times disclose the exact local time and keep their alignment", async ({
  page,
  isMobile,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/screen2");
  const activity = page.getByRole("region", { name: "Recent activity" });
  const trigger = activity.getByRole("button", {
    name: "5 min ago, show exact date and time",
  });
  await expect(trigger).toBeVisible();
  await expect(
    activity.getByRole("button", {
      name: "2 hr ago, show exact date and time",
    }),
  ).toBeVisible();
  await expect(
    activity.getByRole("button", {
      name: "Yesterday, show exact date and time",
    }),
  ).toBeVisible();
  const eventTime = await trigger.locator("time").getAttribute("datetime");

  await trigger.focus();
  await page.keyboard.press("Enter");
  const details = page.getByRole("dialog", { name: "Exact activity time" });
  await expect(details).toContainText("29 Oct 2026");
  await expect(details).toContainText("19:29");
  await expect(details).toContainText("GMT+7");
  await expect(details.locator("time")).toHaveAttribute("datetime", eventTime);
  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Space");
  await expect(details).toBeVisible();
  await trigger.click();
  await expect(details).toBeHidden();
  if (isMobile) await trigger.tap();
  else await trigger.click();
  await expect(details).toBeVisible();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
  await activity.getByRole("heading", { name: "Recent activity" }).click();
  await expect(details).toBeHidden();

  await page.setViewportSize({ width: 320, height: 740 });
  await trigger.click();
  const bounds = await details.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(15);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(305);
  const alignment = await activity.getByRole("listitem").evaluateAll((items) =>
    items.map((item) => {
      const card = item.getBoundingClientRect();
      const button = item.querySelector("button").getBoundingClientRect();
      return {
        center: Math.abs(
          (card.top + card.bottom - button.top - button.bottom) / 2,
        ),
        inset: card.right - button.right,
        height: button.height,
      };
    }),
  );
  for (const row of alignment) {
    expect(row.center).toBeLessThan(1);
    expect(row.inset).toBeCloseTo(19, 0);
    expect(row.height).toBeGreaterThanOrEqual(48);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("new events retain their creation time while labels advance and reset reseeds samples", async ({
  page,
}) => {
  await page.goto("/screen2");
  const activity = page.getByRole("region", { name: "Recent activity" });
  await expect(
    activity.getByRole("button", {
      name: "5 min ago, show exact date and time",
    }),
  ).toBeVisible();
  // Reset while the same cards are mounted, between the clock's minute ticks.
  await page.clock.fastForward(30_000);
  await page.getByRole("button", { name: "Bill menu" }).click();
  await page
    .getByRole("button", { name: "Reset example", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    activity.getByRole("button", {
      name: "5 min ago, show exact date and time",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /3 people, one bill/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Add a name to the bill").fill("Timestamp check");
  const before = await page.evaluate(() => Date.now());
  await sheet.getByRole("button", { name: "Add person", exact: true }).click();
  await sheet.getByText("Timestamp check", { exact: true }).waitFor();
  const after = await page.evaluate(() => Date.now());
  await sheet.getByRole("button", { name: "Close menu" }).click();
  await expect(sheet).toBeHidden();
  const latest = activity.getByRole("listitem").first();
  await expect(latest).toContainText("Added Timestamp check to the bill");
  await expect(latest.getByRole("button")).toHaveAccessibleName(
    "Just now, show exact date and time",
  );
  const createdAt = await latest.locator("time").getAttribute("datetime");
  expect(Date.parse(createdAt)).toBeGreaterThanOrEqual(before);
  expect(Date.parse(createdAt)).toBeLessThanOrEqual(after);
  await page.clock.fastForward(60_000);
  await expect(latest.getByRole("button")).toHaveAccessibleName(
    "1 min ago, show exact date and time",
  );
  await expect(latest.locator("time")).toHaveAttribute("datetime", createdAt);
  await expect(
    activity.getByRole("button", {
      name: "6 min ago, show exact date and time",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Bill menu" }).click();
  await page
    .getByRole("button", { name: "Reset example", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    activity.getByRole("button", {
      name: "5 min ago, show exact date and time",
    }),
  ).toBeVisible();
  await expect(activity.getByRole("listitem")).toHaveCount(3);
});

test.describe("visitor timezone", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  test("hydrates without clock mismatches and discloses the visitor's local time", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/screen2");
    const activity = page.getByRole("region", { name: "Recent activity" });
    await activity
      .getByRole("button", { name: "5 min ago, show exact date and time" })
      .click();
    const details = page.getByRole("dialog", { name: "Exact activity time" });
    await expect(details).toContainText("29 Oct 2026");
    await expect(details).toContainText("05:29");
    await expect(details).toContainText("GMT-7");
    expect(errors).toEqual([]);
  });
});
