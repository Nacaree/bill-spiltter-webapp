import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openPeople(page) {
  await page.goto("/screen2?preview=empty");
  // Initial route focus also resets page scrolling. Wait for that lifecycle
  // before bringing an offscreen trigger into a short viewport.
  await expect(
    page.getByRole("heading", { name: "Weekend dinner", exact: true }),
  ).toBeFocused();
  const trigger = page.getByRole("button", { name: /Just you, for now/ });
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeInViewport();
  await trigger.click();
  await expect(page).toHaveURL(/#overview\/people$/);
  return page.getByRole("dialog", { name: "The people at your table" });
}

async function addNames(people, count) {
  const name = people.getByLabel("Person’s name");
  for (let i = 1; i <= count; i++) {
    await name.fill(`Guest ${i}`);
    await name.press("Enter");
  }
  return name;
}

async function expectPinned(people) {
  const bounds = await people.evaluate((panel) => {
    const header = panel
      .querySelector("[data-panel-header]")
      .getBoundingClientRect();
    const footer = panel
      .querySelector("[data-panel-footer]")
      .getBoundingClientRect();
    const list = panel.querySelector("[data-panel-list]");
    const area = list.getBoundingClientRect();
    const dialog = panel.getBoundingClientRect();
    return {
      headerTop: header.top,
      footerBottom: footer.bottom,
      panelTop: dialog.top,
      panelBottom: dialog.bottom,
      listBottom: area.bottom,
      footerTop: footer.top,
      scrollable: list.scrollHeight > list.clientHeight,
      panelWidth: dialog.width,
      viewportWidth: innerWidth,
    };
  });
  expect(bounds.headerTop).toBeGreaterThanOrEqual(bounds.panelTop);
  expect(bounds.footerBottom).toBeLessThanOrEqual(bounds.panelBottom + 1);
  expect(bounds.listBottom).toBeLessThanOrEqual(bounds.footerTop + 1);
  expect(bounds.panelWidth).toBeLessThanOrEqual(bounds.viewportWidth);
  return bounds;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("soft feather stays quiet for small groups and clears at the bottom of an overflowing list", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 393, height: 1000 });
  const people = await openPeople(page);
  const list = people.getByRole("list", { name: "People", exact: true });
  const edge = people.locator("[data-panel-list-viewport]");
  const feather = people.locator("[data-panel-list-feather]");
  const footer = people.locator("[data-panel-footer]");
  await expect(edge).toHaveAttribute("data-more", "false");
  await expect(feather).toHaveCSS("opacity", "0");
  await expect(footer).toHaveCSS("border-top-width", "0px");
  await expect(footer).toHaveCSS("padding-top", "24px");
  expect(
    await footer.evaluate((node) =>
      parseFloat(getComputedStyle(node).paddingBottom),
    ),
  ).toBeGreaterThanOrEqual(24);
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  const name = await addNames(people, 4);
  await expect(people.getByRole("listitem")).toHaveCount(5);
  await expect(edge).toHaveAttribute("data-more", "false");
  await name.fill("Sixth person");
  await name.press("Enter");
  await expect(people.getByRole("listitem")).toHaveCount(6);
  await expect
    .poll(() =>
      list.evaluate(
        (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
      ),
    )
    .toBeLessThan(2);
  await expect(edge).toHaveAttribute("data-more", "false");
  await list.evaluate((node) => {
    node.scrollTop = 0;
  });
  await expect(edge).toHaveAttribute("data-more", "true");
  await expect(feather).toHaveCSS("opacity", "1");
  await expect(feather).toHaveCSS("height", "28px");
  await expect(feather).toHaveCSS("pointer-events", "none");
  const point = await feather.boundingBox();
  const x = point.x + point.width / 2;
  const y = point.y + point.height - 4;
  expect(
    await list.evaluate(
      (node, point) =>
        node.contains(document.elementFromPoint(point.x, point.y)),
      { x, y },
    ),
  ).toBe(true);
  if (testInfo.project.use.hasTouch) await page.touchscreen.tap(x, y);
  else {
    await list.hover();
    await page.mouse.wheel(0, 300);
    await expect(edge).toHaveAttribute("data-more", "false");
  }
  await list.focus();
  await page.keyboard.press("End");
  await expect(edge).toHaveAttribute("data-more", "false");
  await expect(feather).toHaveCSS("opacity", "0");
  await page.keyboard.press("Home");
  await expect(edge).toHaveAttribute("data-more", "true");
  await people.getByRole("button", { name: "Close menu" }).click();
  await expect(people).toBeHidden();
  await page.getByRole("button", { name: /6 people, one bill/ }).click();
  expect(await list.evaluate((node) => node.scrollTop)).toBe(0);
  await expect(edge).toHaveAttribute("data-more", "true");
  await page.setViewportSize({ width: 1280, height: 1200 });
  await expect(edge).toHaveAttribute("data-more", "false");
  await expect(feather).toHaveCSS("opacity", "0");
});

test("feather responds to viewport and accessibility settings and disappears in the shared-scroll fallback", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 393, height: 740 });
  const people = await openPeople(page);
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  const name = await addNames(people, 7);
  const list = people.getByRole("list", { name: "People", exact: true });
  const edge = people.locator("[data-panel-list-viewport]");
  const feather = people.locator("[data-panel-list-feather]");
  await list.click({ position: { x: 20, y: 20 } });
  await list.evaluate((node) => {
    node.scrollTop = 0;
  });
  await expect(edge).toHaveAttribute("data-more", "true");
  await expect(feather).toHaveCSS("transition-duration", "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(feather).toHaveCSS("transition-duration", "0.16s");
  if (browserName === "chromium") {
    await page.emulateMedia({ forcedColors: "active" });
    await expect(feather).toHaveCSS("display", "none");
    await page.emulateMedia({ forcedColors: "none" });
    await expect(feather).not.toHaveCSS("display", "none");
  }
  await page.setViewportSize({ width: 320, height: 230 });
  await expect(people).toHaveAttribute("data-overflow-layout", "flow");
  await expect(feather).toHaveCSS("display", "none");
  expect(
    await list.evaluate((node) => node.scrollHeight - node.clientHeight),
  ).toBeLessThanOrEqual(1);
  await name.focus();
  await expect
    .poll(async () => {
      const field = await name.boundingBox();
      return field.y >= 0 && field.y + field.height <= 230;
    })
    .toBe(true);
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(people).toHaveAttribute("data-overflow-layout", "pinned");
  await expect(feather).not.toHaveCSS("display", "none");
  await list.evaluate((node) => {
    node.scrollTop = 0;
  });
  await expect(edge).toHaveAttribute("data-more", "true");
});

test("empty entry resets on reopening after close, Escape, backdrop and browser Back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 852 });
  for (const method of ["close", "escape", "backdrop", "history"]) {
    const people = await openPeople(page);
    const form = people.getByRole("form", { name: "Add a person" });
    const add = form.getByRole("button", { name: "Add person", exact: true });
    const name = form.getByLabel("Person’s name");
    await add.click();
    await name.press("Enter");
    await expect(form.getByRole("alert")).toBeVisible();
    if (method === "escape") await name.fill("   ");
    if (method === "close")
      await people.getByRole("button", { name: "Close menu" }).click();
    else if (method === "escape") await page.keyboard.press("Escape");
    else if (method === "backdrop") await page.mouse.click(10, 10);
    else await page.goBack();
    await expect(people).toBeHidden();
    await page.getByRole("button", { name: /Just you, for now/ }).click();
    await expect(form).toHaveAttribute("data-expanded", "false");
    await expect(name).toBeDisabled();
    await expect(name).toHaveValue("");
    await expect(
      form.getByRole("button", { name: /^Copy (?:invitation )?link/ }),
    ).toHaveCSS("width", "114px");
    await add.click();
    await expect(name).toBeFocused();
    await expect(form.getByRole("alert")).toHaveCount(0);
  }
});

test("unfinished names reopen ready to edit while successful entry resets only after closing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const people = await openPeople(page);
  const form = people.getByRole("form", { name: "Add a person" });
  const name = form.getByLabel("Person’s name");
  await form.getByRole("button", { name: "Add person", exact: true }).click();
  await name.fill("  Dara  ");
  await page.keyboard.press("Escape");
  await expect(people).toBeHidden();
  await page.getByRole("button", { name: /Just you, for now/ }).click();
  await expect(form).toHaveAttribute("data-expanded", "true");
  await expect(name).toHaveValue("  Dara  ");
  await expect(name).toBeFocused();
  await name.press("Enter");
  await expect(people.getByRole("listitem")).toHaveCount(2);
  await expect(name).toHaveValue("");
  await expect(name).toBeFocused();
  await expect(form).toHaveAttribute("data-expanded", "true");
  await name.fill("Nary");
  await name.press("Enter");
  await expect(form.getByRole("alert")).toContainText("already on the bill");
  await people.getByRole("button", { name: "Close menu" }).click();
  await expect(people).toBeHidden();
  await page.getByRole("button", { name: /2 people, one bill/ }).click();
  await expect(name).toHaveValue("Nary");
  await expect(name).toBeFocused();
  await expect(form.getByRole("alert")).toHaveCount(0);
  await name.fill("Mali");
  await name.press("Enter");
  await expect(people.getByRole("listitem")).toHaveCount(3);
  await people.getByRole("button", { name: "Close menu" }).click();
  await expect(people).toBeHidden();
  await page.getByRole("button", { name: /3 people, one bill/ }).click();
  await expect(form).toHaveAttribute("data-expanded", "false");
  await expect(name).toBeDisabled();
  await expect(form.getByRole("status", { includeHidden: true })).toBeEmpty();
});

test("entry stays expanded through exit and resets on rapid reopen and after legacy person links", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 393, height: 852 });
  const people = await openPeople(page);
  const form = people.getByRole("form", { name: "Add a person" });
  const copy = form.getByRole("button", { name: /^Copy (?:invitation )?link/ });
  await form.getByRole("button", { name: "Add person", exact: true }).click();
  await expect(copy).toHaveCSS("width", "48px");
  await people.getByRole("button", { name: "Close menu" }).click();
  const closing = page.locator('[role="dialog"][data-state="closed"]');
  await closing.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.pause()),
  );
  await expect(closing.locator('form[data-expanded="true"]')).toHaveCount(1);
  await expect(closing.locator('[data-icon-only="true"]')).toHaveCount(1);
  await page.goForward();
  await expect(people).toHaveAttribute("data-state", "open");
  await expect(form).toHaveAttribute("data-expanded", "false");
  await expect(copy).toHaveCSS("width", "114px");

  await page.goto("/screen2?preview=empty#overview/person");
  await expect(form).toHaveAttribute("data-expanded", "true");
  await expect(form.getByLabel("Person’s name")).toBeFocused();
  await expect(copy).toHaveCSS("width", "48px");
  await people.getByRole("button", { name: "Close menu" }).click();
  await closing.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.pause()),
  );
  await expect(closing.locator('form[data-expanded="true"]')).toHaveCount(1);
  await closing.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.finish()),
  );
  await expect(people).toBeHidden();
  await page.getByRole("button", { name: /Just you, for now/ }).click();
  await expect(form).toHaveAttribute("data-expanded", "false");
});

test("people actions share one row and preserve usable input width at desktop and phone sizes", async ({
  page,
}) => {
  for (const width of [1280, 393, 320]) {
    await page.setViewportSize({ width, height: 740 });
    const people = await openPeople(page);
    const form = people.getByRole("form", { name: "Add a person" });
    const copy = form.getByRole("button", {
      name: /^Copy (?:invitation )?link/,
    });
    const add = form.getByRole("button", { name: "Add person", exact: true });
    const original = await copy.elementHandle();
    await expect(copy).toContainText("Copy link");
    const initialCopy = await copy.boundingBox();
    const initialAdd = await add.boundingBox();
    expect(initialCopy.width).toBe(114);
    expect(initialCopy.height).toBe(48);
    expect(initialCopy.y).toBe(initialAdd.y);
    expect(initialCopy.x - initialAdd.x - initialAdd.width).toBe(10);
    await add.click();
    const name = form.getByLabel("Person’s name");
    await expect(name).toBeFocused();
    await expect(copy).toHaveAttribute("data-icon-only", "true");
    expect(
      await copy.evaluate((node, previous) => node === previous, original),
    ).toBe(true);
    const field = await name.boundingBox();
    const submit = await add.boundingBox();
    const compact = await copy.boundingBox();
    expect(field.height).toBe(48);
    expect(field.width).toBeGreaterThanOrEqual(146);
    expect(compact.width).toBe(48);
    expect(compact.height).toBe(48);
    expect(submit.width).toBe(48);
    expect(compact.y).toBe(field.y);
    expect(submit.y).toBe(field.y);
    expect(submit.x - field.x - field.width).toBe(10);
    expect(compact.x - submit.x - submit.width).toBe(10);
    const iconCenter = await copy.evaluate((node) => {
      const button = node.getBoundingClientRect();
      const icon = node
        .querySelector('[data-icon="copy"]')
        .getBoundingClientRect();
      return (icon.left + icon.right - button.left - button.right) / 2;
    });
    expect(Math.abs(iconCenter)).toBeLessThan(1);
    expect(
      await form.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

test("copying survives entry expansion, works from the keyboard and never submits a name", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    window.peopleClipboardCalls = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (value) => {
          window.peopleClipboardCalls.push(value);
          return new Promise((resolve, reject) => {
            window.finishPeopleCopy = resolve;
            window.failPeopleCopy = reject;
          });
        },
      },
    });
  });
  const people = await openPeople(page);
  const copy = people.getByRole("button", {
    name: /^Copy (?:invitation )?link/,
  });
  const original = await copy.elementHandle();
  await copy.focus();
  await page.keyboard.press("Enter");
  await expect(copy).toHaveAttribute("data-copy-state", "copying");
  await expect(people.getByRole("listitem")).toHaveCount(1);
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  const name = people.getByLabel("Person’s name");
  await expect(name).toBeFocused();
  expect(
    await copy.evaluate((node, previous) => node === previous, original),
  ).toBe(true);
  await expect(copy).toHaveAttribute("data-copy-state", "copying");
  await page.evaluate(() => window.finishPeopleCopy());
  await expect(copy).toHaveAttribute("data-copy-state", "copied");
  await expect(copy.locator('[data-icon="check"]')).toBeVisible();
  await expect(copy).toHaveAttribute("title", "Copied");
  expect(await page.evaluate(() => window.peopleClipboardCalls)).toEqual([
    new URL("/screen2?preview=empty#overview", page.url()).href,
  ]);
  await expect(name).toBeFocused();
  await expect(copy).toHaveAttribute("data-copy-state", "idle", {
    timeout: 3000,
  });
  await name.fill("Dara");
  await copy.focus();
  await page.keyboard.press("Space");
  await expect(copy).toHaveAttribute("data-copy-state", "copying");
  await page.evaluate(() =>
    window.failPeopleCopy(new Error("Clipboard denied")),
  );
  await expect(copy).toHaveAttribute("data-copy-state", "idle");
  await expect(name).toHaveValue("Dara");
  await expect(people.getByRole("listitem")).toHaveCount(1);
  await name.press("Enter");
  await expect(people.getByRole("listitem")).toHaveCount(2);
});

for (const width of [1280, 393, 320]) {
  test(`people list grows naturally then scrolls with pinned controls at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 740 });
    const people = await openPeople(page);
    const smallHeight = (await people.boundingBox()).height;
    await expect(people).toContainText("1 person");
    await people
      .getByRole("button", { name: "Add person", exact: true })
      .click();
    const name = await addNames(people, 22);
    await expect(people).toContainText("23 people");
    expect((await people.boundingBox()).height).toBeGreaterThan(smallHeight);
    expect((await expectPinned(people)).scrollable).toBe(true);
    await expect(name).toBeFocused();
    const list = people.getByRole("list", { name: "People", exact: true });
    if (width < 640)
      expect((await list.boundingBox()).height).toBeLessThanOrEqual(350);
    await expect
      .poll(() =>
        list.evaluate(
          (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
        ),
      )
      .toBeLessThan(2);
    const fixed = await people.locator("[data-panel-footer]").boundingBox();
    await list.evaluate((node) => {
      node.scrollTop = 0;
    });
    expect(await people.locator("[data-panel-footer]").boundingBox()).toEqual(
      fixed,
    );
    await name.fill(
      "A very long participant name that should wrap across the row",
    );
    await name.press("Enter");
    await expect(people.getByRole("listitem").last()).toContainText(
      "A very long participant",
    );
    await expectPinned(people);
    await expect(name).toBeFocused();
    await name.fill("Keep this draft");
    await page.keyboard.press("Escape");
    await expect(people).toBeHidden();
    await page.getByRole("button", { name: /24 people, one bill/ }).click();
    await expect(name).toHaveValue("Keep this draft");
    expect(await list.evaluate((node) => node.scrollTop)).toBe(0);
    await list.focus();
    await page.keyboard.press("End");
    await expect
      .poll(() => list.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(0);
    await name.focus();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("a tall phone shows five standard rows and scrolls when a sixth person is added", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 1000 });
  const people = await openPeople(page);
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  const name = await addNames(people, 4);
  const list = people.getByRole("list", { name: "People", exact: true });
  await expect(people.getByRole("listitem")).toHaveCount(5);
  expect((await list.boundingBox()).height).toBe(350);
  expect(
    await list.evaluate((node) => node.scrollHeight - node.clientHeight),
  ).toBeLessThanOrEqual(1);
  await name.fill("Sixth person");
  await name.press("Enter");
  await expect(people.getByRole("listitem")).toHaveCount(6);
  expect((await list.boundingBox()).height).toBe(350);
  expect(
    await list.evaluate((node) => node.scrollHeight - node.clientHeight),
  ).toBeGreaterThan(60);
  await expect
    .poll(() =>
      list.evaluate(
        (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
      ),
    )
    .toBeLessThan(2);
  await expect(name).toBeFocused();
});

test("visual viewport resize and scroll keep the composer above the keyboard, including the short fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, {
      height: innerHeight,
      width: innerWidth,
      offsetTop: 0,
      offsetLeft: 0,
      scale: 1,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    window.peopleTestViewport = viewport;
  });
  const people = await openPeople(page);
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  const name = await addNames(people, 8);
  await page.evaluate(() => {
    Object.assign(window.peopleTestViewport, { height: 380, offsetTop: 50 });
    window.peopleTestViewport.dispatchEvent(new Event("resize"));
    window.peopleTestViewport.dispatchEvent(new Event("scroll"));
  });
  await expect(people).toHaveAttribute("data-compact", "true");
  await expect(people).toHaveAttribute("data-overflow-layout", "pinned");
  const panel = await people.boundingBox();
  expect(panel.y).toBeGreaterThanOrEqual(50);
  expect(panel.y + panel.height).toBeLessThanOrEqual(431);
  await expectPinned(people);
  await expect(name).toBeFocused();
  await name.fill("Dara");
  await name.press("Enter");
  await expect(people.getByRole("listitem").last()).toContainText("Dara");
  await expect(name).toHaveValue("");
  await expect(name).toBeFocused();
  await page.evaluate(() => {
    Object.assign(window.peopleTestViewport, { height: 210, offsetTop: 35 });
    window.peopleTestViewport.dispatchEvent(new Event("resize"));
  });
  await expect(people).toHaveAttribute("data-overflow-layout", "flow");
  await name.fill("");
  await name.press("Enter");
  await expect(people.getByRole("alert")).toContainText(
    "Enter the person’s name",
  );
  await expect
    .poll(async () => {
      const input = await name.boundingBox();
      return input.y >= 35 && input.y + input.height <= 246;
    })
    .toBe(true);
  await expect(name).toBeFocused();
  await name.fill("Mali");
  await name.press("Enter");
  await expect(people.getByRole("listitem").last()).toContainText("Mali");
  await expect(name).toBeFocused();
  await expect
    .poll(async () => {
      const input = await name.boundingBox();
      return input.y >= 35 && input.y + input.height <= 246;
    })
    .toBe(true);
  await page.evaluate(() => {
    Object.assign(window.peopleTestViewport, {
      height: innerHeight,
      offsetTop: 0,
    });
    window.peopleTestViewport.dispatchEvent(new Event("resize"));
  });
  await expect(people).toHaveAttribute("data-overflow-layout", "pinned");
  await expect(people).toHaveAttribute("data-compact", "false");
  await expectPinned(people);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    expect(
      await people.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);
  }
});

test("rapid animated additions reveal the latest row without scrolling the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 600 });
  const people = await openPeople(page);
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  const name = await addNames(people, 12);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const pageTop = await page.evaluate(() => scrollY);
  for (const value of ["Dara", "Mali", "Kosal"]) {
    await name.fill(value);
    await name.press("Enter");
  }
  const list = people.getByRole("list", { name: "People", exact: true });
  await expect(people.getByRole("listitem").last()).toHaveCSS("height", "70px");
  await expect
    .poll(() =>
      list.evaluate(
        (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
      ),
    )
    .toBeLessThan(2);
  expect(await page.evaluate(() => scrollY)).toBe(pageTop);
  await expect(people.locator("[data-panel-list-viewport]")).toHaveAttribute(
    "data-more",
    "false",
  );
  await expect(people.locator("[data-panel-list-feather]")).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(name).toBeFocused();
  await expectPinned(people);
});

test("dynamic viewport fallback keeps controls reachable without visualViewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.addInitScript(() => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });
  });
  const people = await openPeople(page);
  await expect(people).toHaveAttribute("data-compact", "true");
  await people.getByRole("button", { name: "Add person", exact: true }).click();
  const name = await addNames(people, 10);
  await page.setViewportSize({ width: 320, height: 320 });
  await expect(people).toHaveAttribute("data-overflow-layout", "flow");
  await name.fill("");
  await name.press("Enter");
  await expect
    .poll(async () => {
      const field = await name.boundingBox();
      return field.y >= 0 && field.y + field.height <= 320;
    })
    .toBe(true);
  await expect(name).toBeFocused();
  await expect(people.getByRole("alert")).toContainText(
    "Enter the person’s name",
  );
});

test("both comparison frames retain independent long lists and pinned footers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/screen2");
  const populated = page.frameLocator('iframe[title="Populated bill preview"]');
  const empty = page.frameLocator('iframe[title="Empty bill preview"]');
  await populated.getByRole("button", { name: /3 people, one bill/ }).click();
  const populatedPeople = populated.getByRole("dialog", {
    name: "The people at your table",
  });
  await populatedPeople
    .getByRole("button", { name: "Add person", exact: true })
    .click();
  await addNames(populatedPeople, 12);
  await expect(populatedPeople).toContainText("15 people");
  await expectPinned(populatedPeople);
  await empty.getByRole("button", { name: /Just you, for now/ }).click();
  const emptyPeople = empty.getByRole("dialog", {
    name: "The people at your table",
  });
  await expect(emptyPeople.getByRole("listitem")).toHaveCount(1);
  await emptyPeople
    .getByRole("button", { name: "Add person", exact: true })
    .click();
  await addNames(emptyPeople, 12);
  await expect(emptyPeople).toContainText("13 people");
  await expectPinned(emptyPeople);
  await expect(populatedPeople.getByRole("listitem")).toHaveCount(15);
});
