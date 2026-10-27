import { expect, test } from "@playwright/test";

test("approved foundations are locked and confirmations support the keyboard", async ({
  page,
  context,
}) => {
  const backendRequests = [];
  page.on("request", (request) => {
    if (/supabase\.co|generativelanguage\.googleapis\.com/.test(request.url()))
      backendRequests.push(request.url());
  });
  await page.goto("/design-system");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A clearer wayto split.",
  );
  await page.evaluate(() => document.fonts.ready);
  const typography = await page
    .getByRole("heading", { level: 1 })
    .evaluate((heading) => ({
      heading: getComputedStyle(heading).fontFamily,
      weight: getComputedStyle(heading).fontWeight,
      body: getComputedStyle(document.querySelector("main p")).fontFamily,
    }));
  expect(typography.body).toContain("Helvetica");
  expect(typography.heading).toBe(typography.body);
  expect(typography.weight).toBe("700");

  const addButton = page.getByRole("button", {
    name: "Add expense",
    exact: true,
  });
  await expect(addButton).toHaveCSS("border-radius", "22px");
  await expect(addButton).toHaveCSS("min-height", "48px");
  await expect(
    page.getByRole("heading", { name: "Approved foundations" }),
  ).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reset defaults" }),
  ).toHaveCount(0);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy theme", exact: true }).click();
  await expect(page.getByText("Theme settings copied.")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied)).toMatchObject({
    brand: "#663399",
    frost: 45,
    corners: "round",
    density: "comfortable",
  });

  const preview = page.getByRole("button", { name: "Preview confirmation" });
  await preview.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(preview).toBeFocused();

  expect(backendRequests).toEqual([]);

  await page.getByRole("link", { name: "Back to the app" }).click();
  await expect(
    page.getByRole("heading", { name: "Create a bill" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("No account needed");
  await expect(page.getByRole("banner").getByRole("link")).toHaveCSS(
    "font-family",
    await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).fontFamily),
  );
});

test("reference fits a narrow phone and sample tabs work with arrow keys", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/design-system");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await page.getByRole("tab", { name: /^balances$/i }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: /^expenses$/i })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("$48.00");
  await page.getByRole("button", { name: "Preview confirmation" }).click();
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Keep expense" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("both icon libraries animate, replay together, and keep sample splits independent", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/design-system#motion");
  for (const name of ["Animate UI", "Lucide Animated"]) {
    const panel = page.getByRole("group", { name, exact: true });
    await expect(panel).toBeVisible();
    const mali = panel.getByRole("checkbox", { name: "Mali", exact: true });
    await expect(mali).not.toBeChecked();
    await mali.check();
    await expect(mali).toBeChecked();
    await expect
      .poll(() =>
        mali.evaluate(
          (input) => getComputedStyle(input.nextElementSibling).borderRadius,
        ),
      )
      .toBe("50%");
    const copy = panel.getByRole("button", { name: "Replay copy icon" });
    await copy.click();
    await expect(panel.getByRole("status")).toHaveText(
      "Copy preview replayed.",
    );
    await expect
      .poll(() => copy.locator("rect").getAttribute("style"))
      .toMatch(/translate/);
  }
  await page
    .getByRole("group", { name: "Animate UI", exact: true })
    .getByRole("checkbox", { name: "Mali", exact: true })
    .uncheck();
  await expect(
    page
      .getByRole("group", { name: "Lucide Animated", exact: true })
      .getByRole("checkbox", { name: "Mali", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Play both", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Playing…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Play both", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("icon comparison honors reduced motion and stacks on a phone", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/design-system#motion");
  await expect(
    page.getByText(
      "Reduced motion is on. Icons stay still; selections still work.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play both", exact: true }),
  ).toBeDisabled();
  const animate = page.getByRole("group", { name: "Animate UI", exact: true });
  const lucide = page.getByRole("group", {
    name: "Lucide Animated",
    exact: true,
  });
  const top = await animate.boundingBox(),
    bottom = await lucide.boundingBox();
  expect(bottom.y).toBeGreaterThan(top.y + top.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await animate.getByRole("checkbox", { name: "Mali", exact: true }).check();
  await expect(
    animate.getByRole("checkbox", { name: "Mali", exact: true }),
  ).toBeChecked();
  await animate.getByRole("button", { name: "Replay copy icon" }).click();
  const transform = await animate
    .locator("rect")
    .first()
    .evaluate((rect) => getComputedStyle(rect).transform);
  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  expect(errors).toEqual([]);
});

test("person picker shows each visual state and supports keyboard selection and dismissal", async ({
  page,
}) => {
  await page.goto("/design-system#person-picker");
  const showcase = page.locator("#person-picker");
  for (const state of ["Closed", "Open", "Selected"]) {
    await expect(
      showcase.getByRole("heading", { name: new RegExp(state) }),
    ).toBeVisible();
  }
  const picker = showcase.getByRole("combobox", {
    name: "Try the person picker",
    exact: true,
  });
  await expect(picker).toContainText("You");
  await picker.focus();
  await picker.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(3);
  await expect(
    page.getByRole("option", { name: "You", exact: true }),
  ).toHaveAttribute("data-state", "checked");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Sokha", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(picker).toContainText("Sokha");
  await expect(page.getByRole("listbox")).not.toBeVisible();
  await expect(picker).toBeFocused();
  await picker.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).not.toBeVisible();
  await expect(picker).toBeFocused();
  await expect(picker).toHaveCSS("outline-style", "none");
  await expect(showcase.getByRole("status")).toHaveText(
    "Sokha is selected. Sample data only.",
  );
});

test("person picker follows the approved theme and stays inside a phone viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/design-system#person-picker");
  const picker = page.locator("#person-picker").getByRole("combobox");
  // Establish hydration through a real interaction before native color events.
  await picker.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).not.toBeVisible();
  await picker.click();
  const menu = page.getByRole("listbox");
  await expect(menu).toBeVisible();
  await expect
    .poll(() =>
      menu.evaluate((node) =>
        getComputedStyle(node).getPropertyValue("--ds-brand").trim(),
      ),
    )
    .toMatch(/^#(?:663399|639)$/);
  const bounds = await menu.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await page.getByRole("option", { name: "Mali", exact: true }).click();
  await expect(picker).toContainText("Mali");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  const formPicker = page.getByRole("combobox", {
    name: "Paid by",
    exact: true,
  });
  await expect(formPicker).toContainText("You");
});

test("motion playground replays local expense, shimmer, success and dialog feedback", async ({
  page,
}) => {
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/design-system#motion-playground");
  const playground = page.locator("#motion-playground");
  const ledger = playground.getByRole("list", {
    name: "Sample expense motion",
  });
  await expect(ledger.getByRole("listitem")).toHaveCount(1);
  await playground.getByRole("button", { name: "Add sample expense" }).click();
  await expect(ledger).toContainText("Coffee after dinner");
  await expect(ledger).toContainText("$6.00");
  await playground.getByRole("button", { name: "Reset list" }).click();
  await expect(ledger.getByRole("listitem")).toHaveCount(1);
  await playground.getByRole("button", { name: "Replay shimmer" }).click();
  const glass = playground.locator('[data-shimmer="active"]');
  await expect(glass).toHaveCount(1);
  const beam = glass.locator('[data-shimmer-beam="active"]');
  await expect(beam).toHaveCSS("animation-duration", "1.8s");
  const start = await beam.evaluate((node) => getComputedStyle(node).transform);
  await expect
    .poll(() => beam.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe(start);
  await expect(glass).toHaveCount(0);
  await playground.getByRole("button", { name: "Preview success" }).click();
  await expect(
    playground.getByRole("status").filter({ hasText: "Payment recorded" }),
  ).toContainText("$16.00");
  const dialogButton = playground.getByRole("button", {
    name: "Preview dialog",
    exact: true,
  });
  await dialogButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(dialogButton).toBeFocused();
  expect(failures).toEqual([]);
});

test("shared motion keeps phone controls usable with reduced motion", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/design-system#motion-playground");
  const playground = page.locator("#motion-playground");
  await expect(
    playground.getByText("Reduced motion on", { exact: true }),
  ).toBeVisible();
  await playground.getByRole("button", { name: "Replay shimmer" }).click();
  const shimmer = playground.locator('[data-shimmer-beam="active"]');
  await expect(shimmer).toHaveCSS("animation-name", "none");
  await expect(shimmer).toHaveCSS("opacity", "0.55");
  await playground.getByRole("button", { name: "Add sample expense" }).click();
  await expect(playground.getByRole("list")).toContainText(
    "Coffee after dinner",
  );
  await playground.getByRole("button", { name: "Preview success" }).click();
  await expect(
    playground.getByText("Payment recorded", { exact: true }),
  ).toBeVisible();
  await playground
    .getByRole("button", { name: "Preview dialog", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCSS("animation-name", "none");
  await page.keyboard.press("Escape");
  const expenses = page.getByRole("tab", { name: /^expenses$/i });
  await expenses.click();
  await expect(page.getByRole("tabpanel")).toContainText("$48.00");
  await expect(page.getByRole("tabpanel")).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  expect(errors).toEqual([]);
});
