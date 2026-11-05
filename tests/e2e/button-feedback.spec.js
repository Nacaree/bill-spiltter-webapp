import { expect, test } from "@playwright/test";

async function geometry(button) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    const matrix = new DOMMatrix(
      style.transform === "none" ? undefined : style.transform,
    );
    return { scale: matrix.a, y: matrix.f, shadow: style.boxShadow };
  });
}

async function checkFeedback(page, button) {
  await expect(button).toHaveAttribute("data-button-feedback", "soft");
  await button.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await geometry(button)).scale).toBe(1);
  await button.hover();
  const canHover = await page.evaluate(
    () => matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  await expect
    .poll(async () => (await geometry(button)).y)
    .toBe(canHover ? -1 : 0);
  const raised = await geometry(button);
  await page.mouse.down();
  await expect
    .poll(async () => (await geometry(button)).scale)
    .toBeCloseTo(0.985, 3);
  const pressed = await geometry(button);
  if (raised.shadow !== "none") expect(pressed.shadow).not.toBe(raised.shadow);

  await page.mouse.move(0, 0);
  const release = button.evaluate(
    (element) =>
      new Promise((resolve) => {
        const scales = [];
        const start = performance.now();
        function sample() {
          const transform = getComputedStyle(element).transform;
          scales.push(
            new DOMMatrix(transform === "none" ? undefined : transform).a,
          );
          if (performance.now() - start < 400) requestAnimationFrame(sample);
          else resolve(scales);
        }
        requestAnimationFrame(sample);
      }),
  );
  await page.mouse.up();
  const scales = await release;
  expect(Math.max(...scales)).toBeGreaterThan(1);
  expect(Math.max(...scales)).toBeLessThan(1.005);
  expect(scales.at(-1)).toBeCloseTo(1, 3);
}

test("shared action buttons use the same soft feedback in the studio and Screen2", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/design-system#controls");
  const controls = page.locator("#controls");
  const add = controls.getByRole("button", {
    name: "Add expense",
    exact: true,
  });
  await add.click();
  await expect(controls).toContainText("Add expense selected.");
  for (const name of ["Add expense", "Upload receipt", "Copy link"])
    await checkFeedback(
      page,
      controls.getByRole("button", { name, exact: true }),
    );

  await page.goto("/screen2?preview=empty");
  for (const name of ["Add your first expense", "Share bill", "Bill menu"])
    await checkFeedback(page, page.getByRole("button", { name, exact: true }));
  const trigger = page.getByRole("button", { name: "Add your first expense" });
  await trigger.focus();
  await page.keyboard.press("Space");
  const dialog = page.getByRole("dialog", {
    name: "Add to the bill",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  for (const button of await dialog.getByRole("button").all())
    await expect(button).toHaveAttribute("data-button-feedback", "soft");
});

test("disabled and reduced-motion buttons stay still and native activation works", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/design-system#controls");
  const disabled = page.locator("#controls").getByRole("button", {
    name: "Disabled",
    exact: true,
  });
  await disabled.hover();
  await page.mouse.down();
  expect(await geometry(disabled)).toMatchObject({ scale: 1, y: 0 });
  await page.mouse.up();

  await page.goto("/screen2?preview=empty");
  const button = page.getByRole("button", { name: "Add your first expense" });
  await button.hover();
  await page.mouse.down();
  expect(await geometry(button)).toMatchObject({ scale: 1, y: 0 });
  await page.mouse.move(0, 0);
  await page.mouse.up();
  if (testInfo.project.name === "iphone") await button.tap();
  else {
    await button.focus();
    await page.keyboard.press("Enter");
  }
  await expect(
    page.getByRole("dialog", { name: "Add to the bill", exact: true }),
  ).toBeVisible();
});

test("Add person hover animates smoothly while its input reveal still works", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/screen2?preview=populated");
  await page.getByRole("button", { name: /3 people, one bill/ }).click();
  const people = page.getByRole("dialog", { name: "The people at your table" });
  const add = people.getByRole("button", { name: "Add person", exact: true });
  await add.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const canHover = await page.evaluate(
    () => matchMedia("(hover: hover) and (pointer: fine)").matches,
  );
  const samples = add.evaluate(
    (element) =>
      new Promise((resolve) => {
        const positions = [];
        const start = performance.now();
        function sample() {
          const transform = getComputedStyle(element).transform;
          positions.push(
            new DOMMatrix(transform === "none" ? undefined : transform).f,
          );
          if (performance.now() - start < 450) requestAnimationFrame(sample);
          else resolve(positions);
        }
        requestAnimationFrame(sample);
      }),
  );
  await add.hover();
  const positions = await samples;
  if (canHover) {
    expect(positions.some((y) => y < -0.05 && y > -0.95)).toBe(true);
    await expect.poll(async () => (await geometry(add)).y).toBe(-1);
  } else expect(positions.every((y) => y === 0)).toBe(true);

  await add.click();
  await expect(
    people.getByLabel("Person’s name", { exact: true }),
  ).toBeFocused();
  await expect(
    people.getByLabel("Person’s name", { exact: true }),
  ).toBeEditable();
});
