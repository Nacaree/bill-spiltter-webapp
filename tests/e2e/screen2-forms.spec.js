import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function openExpense(page) {
  await page.getByRole("button", { name: "Expenses", exact: true }).click();
  const trigger = page.getByRole("button", {
    name: "Add expense",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("button", { name: /Enter manually/ }).click();
  return {
    trigger,
    form: page.getByRole("dialog", { name: "Add an expense", exact: true }),
  };
}

test("the first add drawer shares the form motion and retains its content through closing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/screen2?preview=empty");
  const trigger = page.getByRole("button", { name: "Add your first expense" });
  await trigger.click();
  const chooser = page.getByRole("dialog", {
    name: "Add to the bill",
    exact: true,
  });
  const motion = await chooser.evaluate((node) => {
    const style = getComputedStyle(node);
    const animation = node
      .getAnimations()
      .find((animation) => animation.effect?.target === node);
    if (!animation) return { name: style.animationName, duration: 0 };
    animation.pause();
    animation.currentTime = 0;
    const start = node.getBoundingClientRect().top;
    const duration = animation.effect.getTiming().duration;
    animation.currentTime = Number(duration);
    const end = node.getBoundingClientRect().top;
    animation.finish();
    return { name: style.animationName, duration, distance: start - end };
  });
  expect(motion.name).not.toBe("none");
  expect(motion.duration).toBe(240);
  expect(motion.distance).toBeGreaterThan(100);
  await chooser.getByRole("button", { name: "Close menu" }).click();
  const closing = page.locator('[role="dialog"][data-state="closed"]');
  await closing.evaluate((node) => {
    const animation = node
      .getAnimations()
      .find((animation) => animation.effect?.target === node);
    animation?.pause();
  });
  await expect(closing).toContainText("Enter manually");
  await closing.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.finish()),
  );
  await expect(chooser).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: /Enter manually/ }).click();
  const form = page.getByRole("dialog", {
    name: "Add an expense",
    exact: true,
  });
  await expect(form.getByLabel("Description", { exact: true })).toBeFocused();
  await expect(form.getByRole("combobox", { name: "Paid by" })).toBeVisible();
});

test("expense forms keep drafts, focus and picker selections without changing the ledger", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/screen2?preview=populated");
  const { trigger, form } = await openExpense(page);
  await expect(form.getByLabel("Description", { exact: true })).toBeFocused();
  await expect(
    form.getByRole("button", { name: "Cancel", exact: true }),
  ).toHaveCount(0);
  await form.getByRole("button", { name: "Add expense", exact: true }).click();
  await expect(form.getByLabel("Description", { exact: true })).toBeFocused();
  await expect(form).toContainText("Give the expense a name.");
  await form.getByLabel("Description", { exact: true }).fill("Coffee draft");
  await form.getByLabel("Amount · USD", { exact: true }).fill("10.00");
  const payer = form.getByRole("combobox", { name: "Paid by" });
  await payer.click();
  await page.getByRole("option", { name: "Sokha", exact: true }).click();
  await expect(payer).toContainText("Sokha");
  const date = form.getByRole("button", { name: /^Expense date/ });
  await date.click();
  const calendar = page.getByRole("dialog", {
    name: "Expense date calendar",
    exact: true,
  });
  await calendar.getByRole("button", { name: /October 30.*2026/ }).click();
  await expect(calendar).toHaveCount(0);
  await expect(date).toBeFocused();
  await expect(date).toContainText("30 Oct 2026");
  const shares = form.getByRole("region", { name: "Share preview" });
  await expect(shares).toContainText("$3.34");
  await expect(shares.getByText("$3.33", { exact: true })).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(form).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("button", { name: /Coffee draft/ })).toHaveCount(
    0,
  );
  await trigger.click();
  await page.getByRole("button", { name: /Enter manually/ }).click();
  await expect(form.getByLabel("Description", { exact: true })).toHaveValue(
    "Coffee draft",
  );
  await expect(payer).toContainText("Sokha");
  await expect(date).toContainText("30 Oct 2026");
  // The action remains in view when the body is scrolled on short screens.
  await form.getByText("Category & notes", { exact: true }).click();
  await form.getByLabel("Notes", { exact: true }).fill("A retained note");
  const save = await form
    .getByRole("button", { name: "Add expense", exact: true })
    .boundingBox();
  expect(save.y).toBeGreaterThanOrEqual(0);
  expect(save.y + save.height).toBeLessThanOrEqual(page.viewportSize().height);
  expect(
    (await new AxeBuilder({ page }).exclude("nextjs-portal").analyze())
      .violations,
  ).toEqual([]);
  await form.getByRole("button", { name: "Close expense form" }).click();
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("exact splits validate totals and preserve details through editing", async ({
  page,
}) => {
  const backendRequests = [];
  page.on("request", (request) => {
    if (/supabase\.co|generativelanguage\.googleapis\.com/.test(request.url()))
      backendRequests.push(request.url());
  });
  await page.goto("/screen2?preview=populated");
  const { form } = await openExpense(page);
  await form.getByLabel("Description", { exact: true }).fill("Exact coffee");
  await form.getByLabel("Amount · USD", { exact: true }).fill("10");
  await form
    .getByRole("button", { name: "Exact amounts", exact: true })
    .click();
  await form.getByLabel("Nary’s share", { exact: true }).fill("4");
  await form.getByLabel("Sokha’s share", { exact: true }).fill("3");
  await form.getByLabel("Mali’s share", { exact: true }).fill("2");
  await form.getByRole("button", { name: "Add expense", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("add up to the total");
  await form.getByLabel("Mali’s share", { exact: true }).fill("3");
  await form.getByText("Category & notes", { exact: true }).click();
  await form.getByRole("combobox", { name: "Category", exact: true }).click();
  await page.getByRole("option", { name: "Transport", exact: true }).click();
  await form.getByLabel("Notes", { exact: true }).fill("Keep these details");
  await form.getByRole("button", { name: "Add expense", exact: true }).click();
  await expect(form).toBeHidden();
  await page.getByRole("button", { name: /Exact coffee/ }).click();
  await page.getByRole("button", { name: "Edit expense", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit expense", exact: true });
  await expect(edit.getByLabel("Description", { exact: true })).toHaveValue(
    "Exact coffee",
  );
  await expect(edit.getByLabel("Nary’s share", { exact: true })).toHaveValue(
    "4.00",
  );
  await edit.getByText("Category & notes", { exact: true }).click();
  await expect(
    edit.getByRole("combobox", { name: "Category", exact: true }),
  ).toContainText("Transport");
  await expect(edit.getByLabel("Notes", { exact: true })).toHaveValue(
    "Keep these details",
  );
  await edit.getByLabel("Description", { exact: true }).fill("Updated coffee");
  await edit.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Updated coffee/ }),
  ).toContainText("$10.00");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(
    page.getByText("Total spent", { exact: true }).locator(".."),
  ).toContainText("$112.00");
  expect(backendRequests).toEqual([]);
});

test("quick person form validates, retains its draft and returns to the people list", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/screen2?preview=empty");
  await page.getByRole("button", { name: /Just you, for now/ }).click();
  const people = page.getByRole("dialog", { name: "The people at your table" });
  const add = people.getByRole("button", { name: "Add person", exact: true });
  await add.click();
  const form = page.getByRole("dialog", { name: "Add a person", exact: true });
  const name = form.getByLabel("Person’s name", { exact: true });
  await expect(name).toBeFocused();
  await expect(
    form.getByRole("button", { name: "Cancel", exact: true }),
  ).toHaveCount(0);
  await form.getByRole("button", { name: "Add person", exact: true }).click();
  await expect(form).toContainText("Enter the person’s name.");
  await name.fill("Nary");
  await form.getByRole("button", { name: "Add person", exact: true }).click();
  await expect(form).toContainText("already on the bill");
  await name.fill("Dara");
  await page.keyboard.press("Escape");
  await expect(people).toBeVisible();
  await expect(add).toBeFocused();
  await expect(people.getByText("Dara", { exact: true })).toHaveCount(0);
  await add.click();
  await expect(name).toHaveValue("Dara");
  await form.getByRole("button", { name: "Add person", exact: true }).click();
  await expect(people.getByText("Dara", { exact: true })).toBeVisible();
  await expect(add).toBeFocused();
  await people.getByRole("button", { name: "Close menu" }).click();
  await expect(
    page.getByRole("button", { name: /2 people, one bill/ }),
  ).toBeVisible();
});

test("studio and Screen2 use responsive forms with a visible action footer", async ({
  page,
}) => {
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto("/design-system#forms");
    const trigger = page.getByRole("button", {
      name: "Preview expense drawer",
    });
    await trigger.click();
    const form = page.getByRole("dialog", {
      name: "Add an expense",
      exact: true,
    });
    await expect(form.getByLabel("Description", { exact: true })).toBeFocused();
    const bounds = await form.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    if (width < 640) expect(bounds.y + bounds.height).toBeCloseTo(740, 0);
    else expect(bounds.y + bounds.height / 2).toBeCloseTo(370, 0);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page.goto("/screen2?preview=empty#new");
    const live = page.getByRole("dialog", {
      name: "Add an expense",
      exact: true,
    });
    await expect(live.getByLabel("Description", { exact: true })).toBeFocused();
    const liveBounds = await live.boundingBox();
    if (width < 640)
      expect(liveBounds.y + liveBounds.height).toBeCloseTo(740, 0);
    else expect(liveBounds.y + liveBounds.height / 2).toBeCloseTo(370, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await live
      .getByLabel("Description", { exact: true })
      .fill("Backdrop draft");
    // Outside click closes the form, retaining the draft.
    await page.mouse.click(width / 2, 1);
    await expect(live).toBeHidden();
  }
});
