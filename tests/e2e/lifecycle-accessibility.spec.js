import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Exercise the real client components in a browser with a fake action boundary.
// No Supabase client, cookies, server actions or production bill data are used.
let bundle;
let componentCss;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {DeleteBillForm} from '@/components/delete-bill-form'; import {ReceiptImage} from '@/components/receipt-image'; createRoot(document.getElementById('root')).render(<main><h1>Bill lifecycle</h1><DeleteBillForm shareToken={'a'.repeat(43)}/><ReceiptImage src={null}/></main>);`,
      resolveDir: process.cwd(),
      loader: "jsx",
    },
    bundle: true,
    outdir: "/private/tmp/bill-splitter-lifecycle-bundle",
    write: false,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "offline-lifecycle",
        setup(builder) {
          builder.onResolve({ filter: /^@\/app\/lifecycle-actions$/ }, () => ({
            path: "fake-action",
            namespace: "offline",
          }));
          builder.onLoad({ filter: /.*/, namespace: "offline" }, () => ({
            contents: `export async function deleteBillAction(previous,form){await new Promise(r=>setTimeout(r,200));return form.get('confirmation')==='DELETE'?{errors:{form:'Use the device that created this bill.'}}:{errors:{confirmation:'Type DELETE to confirm permanent deletion.'}};}`,
          }));
          builder.onResolve({ filter: /^@\// }, (args) => {
            const base = resolve("src", args.path.slice(2));
            return {
              path: [base, `${base}.jsx`, `${base}.js`].find(existsSync),
            };
          });
        },
      },
    ],
  });
  bundle = result.outputFiles.find((file) => file.path.endsWith(".js")).text;
  componentCss =
    result.outputFiles.find((file) => file.path.endsWith(".css"))?.text ?? "";
});
async function axe(page) {
  expect(
    (
      await new AxeBuilder({ page })
        .exclude("nextjs-portal")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
}

test("delete confirmation supports keyboard errors, pending state, mobile reflow and image fallback", async ({
  page,
  browserName,
  isMobile,
}) => {
  // Pull the actual generated Tailwind stylesheet from the running local app.
  await page.goto("/bill-deleted");
  const sheets = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((link) => link.href));
  const css = (
    await Promise.all(
      sheets.map(async (url) => (await page.request.get(url)).text()),
    )
  ).join("\n");
  await page.setContent(
    '<!doctype html><html lang="en"><head><title>Lifecycle component checks</title></head><body><div id="root"></div></body></html>',
  );
  await page.addStyleTag({ content: css + "\n" + componentCss });
  await page.addScriptTag({ content: bundle });
  const input = page.getByLabel("Type DELETE to confirm"),
    submit = page.getByRole("button", {
      name: "Delete bill permanently",
      exact: true,
    });
  await expect(input).toBeVisible();
  await expect(page.getByRole("status")).toHaveText(
    "Receipt image unavailable.",
  );
  if (!isMobile) {
    await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
    await expect(input).toBeFocused();
    await input.fill("delete");
    await page.keyboard.press("Tab");
    await expect(submit).toBeFocused();
    await page.keyboard.press("Enter");
  } else {
    await input.fill("delete");
    await submit.click();
  }
  await expect(
    page.getByRole("button", { name: "Deleting bill…" }),
  ).toBeDisabled();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("delete");
  await expect(input).toHaveAccessibleDescription(
    "Type DELETE to confirm permanent deletion.",
  );
  await input.fill("DELETE");
  await submit.click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Use the device that created this bill." }),
  ).toBeFocused();
  await axe(page);
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});

test("deletion result page is accessible and offers a fresh bill", async ({
  page,
}) => {
  await page.goto("/bill-deleted");
  await expect(
    page.getByRole("heading", { name: "Bill deleted", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create a new bill" }),
  ).toHaveAttribute("href", "/");
  await axe(page);
});
