import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("the fresh bill can grow and reset independently of the populated bill", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Keep both independent navigation bars visible during the comparison journey.
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto("/screen2");
  const populated = page.frameLocator('iframe[title="Populated bill preview"]');
  const empty = page.frameLocator('iframe[title="Empty bill preview"]');
  const activity = empty.getByRole("region", { name: "Recent activity" });

  await expect(
    populated.getByRole("button", { name: /3 people, one bill/ }),
  ).toBeVisible();
  await expect(
    populated.getByText("Total spent", { exact: true }).locator(".."),
  ).toContainText("$102.00");
  await expect(
    empty.getByRole("region", { name: "Your balance" }),
  ).toContainText("$0.00");
  await expect(
    empty.getByRole("button", { name: /Just you, for now/ }),
  ).toBeVisible();
  await expect(
    empty.getByRole("heading", { name: /A little receipt/ }),
  ).toBeVisible();
  await expect(activity.getByRole("listitem")).toHaveCount(0);
  await expect(activity).toContainText("The little updates will live here.");

  await empty.getByRole("button", { name: "Add your first expense" }).click();
  const sheet = empty.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await populated
    .getByRole("button", { name: "Expenses", exact: true })
    .click();
  await expect(
    populated.getByRole("heading", { name: "Expenses", exact: true }),
  ).toBeVisible();
  await expect(sheet).toBeVisible();
  await populated
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await sheet.getByRole("button", { name: "Close menu" }).click();
  await expect(sheet).toBeHidden();
  await expect(
    populated.getByRole("heading", { name: "Weekend dinner", exact: true }),
  ).toBeVisible();
  await empty.getByRole("button", { name: "Add expense", exact: true }).click();
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /Enter manually/ }).click();
  await empty
    .getByLabel("Description", { exact: true })
    .fill("First shared coffee");
  await empty.getByLabel("Amount · USD", { exact: true }).fill("12.00");
  await expect(
    empty
      .getByRole("group", { name: "Split with", exact: true })
      .getByRole("checkbox"),
  ).toHaveCount(1);
  await empty.getByRole("button", { name: "Add expense", exact: true }).click();
  await empty.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    empty.getByText("Total spent", { exact: true }).locator(".."),
  ).toContainText("$12.00");
  await expect(activity.getByRole("listitem")).toHaveCount(1);
  await expect(activity).toContainText("Added First shared coffee");
  await expect(
    populated.getByText("Total spent", { exact: true }).locator(".."),
  ).toContainText("$102.00");

  await empty.getByRole("button", { name: /Just you, for now/ }).click();
  await sheet.getByRole("button", { name: "Add person", exact: true }).click();
  await sheet.getByLabel("Person’s name").fill("Dara");
  await sheet.getByRole("button", { name: "Add person", exact: true }).click();
  await sheet.getByRole("button", { name: "Close menu" }).click();
  await expect(
    empty.getByRole("button", { name: /2 people, one bill/ }),
  ).toBeVisible();

  await empty.getByRole("button", { name: "Bill menu" }).click();
  await sheet
    .getByRole("button", { name: "Reset example", exact: true })
    .click();
  await expect(
    empty.getByRole("button", { name: /Just you, for now/ }),
  ).toBeVisible();
  await expect(
    empty.getByRole("heading", { name: /A little receipt/ }),
  ).toBeVisible();
  await expect(activity.getByRole("listitem")).toHaveCount(0);
  await expect(
    populated.getByRole("button", { name: /3 people, one bill/ }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  expect(errors).toEqual([]);
});

test("the shared receipt button supports keyboard file selection and local review", async ({
  page,
}) => {
  const backendRequests = [];
  page.on("request", (request) => {
    if (/supabase\.co|generativelanguage\.googleapis\.com/.test(request.url()))
      backendRequests.push(request.url());
  });
  await page.goto("/screen2?preview=empty#receipt");
  const upload = page.getByRole("button", {
    name: "Choose receipt image",
    exact: true,
  });
  const chooser = page.waitForEvent("filechooser");
  await upload.focus();
  await page.keyboard.press("Enter");
  await (
    await chooser
  ).setFiles({
    name: "sample-receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO2sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByText("sample-receipt.png", { exact: true }),
  ).toBeVisible();
  await expect(upload).toBeFocused();
  await page
    .getByRole("button", { name: "Preview with example items", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm & add expense", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Lunch at Malis/ }),
  ).toContainText("$39.00");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText("Total spent", { exact: true }).locator(".."),
  ).toContainText("$39.00");
  expect(backendRequests).toEqual([]);
});

test("previews sit side by side on desktop and fit narrow screens", async ({
  page,
}) => {
  await page.goto("/screen2");
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const populated = page.locator('iframe[title="Populated bill preview"]');
    const empty = page.locator('iframe[title="Empty bill preview"]');
    const first = await populated.boundingBox();
    const second = await empty.boundingBox();
    if (width === 1280) {
      expect(Math.abs(first.y - second.y)).toBeLessThan(1);
      expect(second.x).toBeGreaterThan(first.x + first.width);
    } else {
      expect(second.y).toBeGreaterThan(first.y + first.height);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    for (const frame of [populated.contentFrame(), empty.contentFrame()]) {
      await expect(
        frame.getByRole("heading", { name: "Weekend dinner", exact: true }),
      ).toBeVisible();
      expect(
        await frame
          .locator("html")
          .evaluate(() => document.documentElement.scrollWidth > innerWidth),
      ).toBe(false);
    }
  }
  // Audit the gallery and preview documents separately, with their own landmarks.
  const galleryAudit = await new AxeBuilder({ page })
    .exclude("iframe")
    .analyze();
  expect(galleryAudit.violations).toEqual([]);
  for (const state of ["populated", "empty"]) {
    await page.goto(`/screen2?preview=${state}`);
    const audit = await new AxeBuilder({ page }).analyze();
    expect(audit.violations).toEqual([]);
  }
});
