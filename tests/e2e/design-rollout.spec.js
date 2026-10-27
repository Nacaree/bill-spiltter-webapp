import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Real production components, mocked action/upload boundaries. No hosted writes.
let bundle, componentCss;
test.beforeAll(async () => {
  const result = await build({
    stdin: {
      resolveDir: process.cwd(),
      loader: "jsx",
      contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {CreateBillForm} from '@/components/create-bill-form';
import {ExpenseForm} from '@/components/expense-form';
import {ReceiptReviewForm} from '@/components/receipt-review-form';
import {SettlementForm} from '@/components/settlement-form';
import {UploadReceiptForm} from '@/components/upload-receipt-form';
import {OwnerQrSettings} from '@/components/owner-qr-settings';
import {ClaimParticipantForm} from '@/components/claim-participant-form';
import {ExpenseHistoryFilters} from '@/components/expense-history-filters';
import {SelectControl} from '@/components/ui/select';
const bill={currency:'USD',shareToken:'a'.repeat(43),currentParticipantId:'owner',participants:[{id:'owner',display_name:'You'},{id:'guest',display_name:'Sokha'},{id:'inactive',display_name:'Mali',deactivated_at:'2026-01-01'}]};
const scan={id:'scan',merchant_name:'Dinner',receipt_date:'2026-10-26',subtotal_minor:1000,tax_minor:0,tip_minor:0,discount_minor:0,total_minor:1000,items:[{id:'item',description:'Dinner',quantity:1,unit_price_minor:1000,total_minor:1000,needs_review:false}]};
window.__actions=[];window.__uploads=[];window.__navigations=[];
function Filters(){const [filters,setFilters]=React.useState({category:'',participantId:''});React.useEffect(()=>{window.__onReplace=url=>{const params=new URL(url,'http://localhost').searchParams;setFilters({category:params.get('category')??'',participantId:params.get('participant')??''})};return ()=>{delete window.__onReplace}},[]);return <ExpenseHistoryFilters {...filters} participants={bill.participants} shareToken={bill.shareToken}/>;}
function Panel({title,children}){return <section className="app-panel"><h2>{title}</h2><div className="mt-6">{children}</div></section>}
createRoot(document.getElementById('root')).render(<main className="mx-auto grid max-w-5xl gap-8 px-5 py-10"><h1>Bill Splitter</h1>
<Panel title="Create a bill"><CreateBillForm/></Panel>
<Panel title="Add an expense"><ExpenseForm bill={bill}/></Panel>
<Panel title="Expense history"><Filters/></Panel>
<Panel title="Import a receipt"><UploadReceiptForm shareToken={bill.shareToken}/></Panel>
<Panel title="Review receipt"><ReceiptReviewForm bill={bill} confirmationKey="confirmation" scan={scan}/></Panel>
<Panel title="Record a payment"><SettlementForm bill={bill} settlementId="payment"/><OwnerQrSettings shareToken={bill.shareToken} currency="USD"/></Panel>
<Panel title="Choose your name"><ClaimParticipantForm participants={bill.participants} shareToken={bill.shareToken}/></Panel>
<Panel title="Long participant names"><SelectControl person aria-label="Long participant name" defaultValue="short" options={[{value:'short',label:'Sokha'},{value:'long',label:'Alexandria LongParticipantNameWithoutSpacesForDropdownOverflowChecks'}]}/></Panel>
</main>);`,
    },
    bundle: true,
    write: false,
    jsx: "automatic",
    outdir: "/private/tmp/bill-splitter-rollout-bundle",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "offline-ui",
        setup(builder) {
          builder.onResolve(
            { filter: /^next\/(navigation|link)$/ },
            (args) => ({ path: args.path, namespace: "offline" }),
          );
          builder.onResolve(
            { filter: /^@\/app\/(actions|settlement-actions)$/ },
            () => ({ path: "actions", namespace: "offline" }),
          );
          builder.onResolve(
            { filter: /^@\/lib\/direct-image-upload$/ },
            () => ({ path: "upload", namespace: "offline" }),
          );
          builder.onLoad(
            { filter: /.*/, namespace: "offline" },
            ({ path }) => ({
              contents:
                path === "next/navigation"
                  ? `export const useRouter=()=>({refresh(){},push(url){window.__navigations.push(url)},replace(url){window.__navigations.push(url);window.__onReplace?.(url)}});`
                  : path === "next/link"
                    ? `import React from 'react';export default function Link({scroll, ...props}){return <a {...props}/>}`
                    : path === "upload"
                      ? `export async function directImageUpload(input){window.__uploads.push({file:input.file.name,reservation:input.reservation});input.onReservation({uploadId:'one-reservation'});input.onStage('uploading');await new Promise(r=>setTimeout(r,200));if(window.__uploads.length===1)throw new Error('Connection interrupted');return {receiptScanId:'scan'};}`
                      : `async function action(previous,form){window.__actions.push(Object.fromEntries(form.entries()));await new Promise(r=>setTimeout(r,150));return window.__success?{success:true}:{errors:{description:'Check the expense name.',toParticipantId:'Choose a different recipient.',form:'Please try again.'}};}export {action as createBillAction,action as createExpenseAction,action as updateExpenseAction,action as confirmReceiptAction,action as claimParticipantAction,action as createSettlementAction,action as updateSettlementAction,action as removeSettlementAction,action as saveOwnerQrAction,action as removeOwnerQrAction};`,
              loader: "jsx",
              resolveDir: process.cwd(),
            }),
          );
          builder.onResolve({ filter: /^@\// }, ({ path }) => {
            const base = resolve("src", path.slice(2));
            return {
              path: [base, `${base}.jsx`, `${base}.js`].find(existsSync),
            };
          });
        },
      },
    ],
  });
  bundle = result.outputFiles.find((file) => file.path.endsWith(".js")).text;
  componentCss = result.outputFiles.find((file) =>
    file.path.endsWith(".css"),
  ).text;
});
async function load(page) {
  await page.goto("/");
  const fontClass = (await page.locator("html").getAttribute("class")) ?? "";
  const sheets = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) => links.map((link) => link.href));
  const css = (
    await Promise.all(
      sheets.map(async (url) => (await page.request.get(url)).text()),
    )
  ).join("\n");
  await page.setContent(
    `<!doctype html><html lang="en" class="${fontClass}"><head><title>Bill Splitter UI checks</title></head><body><div id="root"></div></body></html>`,
  );
  await page.addStyleTag({ content: css + "\n" + componentCss });
  await page.addScriptTag({ content: bundle });
  await expect(
    page.getByRole("heading", { name: "Add an expense", exact: true }),
  ).toBeVisible();
}
function panel(page, title) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}
async function choose(scope, label, option) {
  await scope.getByRole("combobox", { name: label, exact: true }).click();
  await scope.page().getByRole("option", { name: option, exact: true }).click();
  await expect(scope.page().getByRole("listbox")).toHaveCount(0);
}

test("production forms preserve selected people, exact shares and validation focus, then reset on success", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await load(page);
  const expense = panel(page, "Add an expense");
  await expense.getByLabel("What was it?").fill("Dinner");
  await expense.getByLabel("Total (USD)", { exact: true }).fill("10.00");
  await choose(expense, "Paid by", "Sokha");
  await choose(expense, "Split", "Exact amounts");
  await expense.getByRole("checkbox", { name: "Mali", exact: true }).uncheck();
  await expense.getByLabel("You’s amount (USD)").fill("4.00");
  await expense.getByLabel("Sokha’s amount (USD)").fill("6.00");
  await expense
    .getByRole("button", { name: "Add expense", exact: true })
    .click();
  await expect(expense.getByLabel("What was it?")).toBeFocused();
  await expect(
    expense.getByRole("combobox", { name: "Paid by", exact: true }),
  ).toContainText("Sokha");
  await expect(
    expense.getByRole("combobox", { name: "Split", exact: true }),
  ).toContainText("Exact amounts");
  await expect(expense.getByLabel("You’s amount (USD)")).toHaveValue("4.00");
  await expect(expense.getByLabel("Sokha’s amount (USD)")).toHaveValue("6.00");
  await expect(
    expense.getByRole("checkbox", { name: "Mali", exact: true }),
  ).not.toBeChecked();
  expect(
    await expense
      .locator("form")
      .evaluate((form) => Object.fromEntries(new FormData(form))),
  ).toMatchObject({
    paidByParticipantId: "guest",
    splitMethod: "exact",
    "share-owner": "4.00",
    "share-guest": "6.00",
  });
  await page.evaluate(() => {
    window.__success = true;
  });
  await expense
    .getByRole("button", { name: "Add expense", exact: true })
    .click();
  await expect(expense.getByRole("status")).toHaveText("Expense added.");
  await expect(expense.getByLabel("What was it?")).toHaveValue("");
  await expect(
    expense.getByRole("combobox", { name: "Paid by", exact: true }),
  ).toContainText("You");
  await expect(
    expense.getByRole("combobox", { name: "Split", exact: true }),
  ).toContainText("Equally");
  await expect(
    expense.getByRole("checkbox", { name: "Mali", exact: true }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});

test("one-button receipt flow keeps failure retry explicit and reuses its reservation", async ({
  page,
}) => {
  await load(page);
  const receipt = panel(page, "Import a receipt");
  const chooser = page.waitForEvent("filechooser");
  await receipt
    .getByRole("button", { name: "Upload receipt", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from("mock image"),
  });
  await expect(receipt.getByRole("alert")).toHaveText("Connection interrupted");
  await expect(receipt.getByRole("alert")).toBeFocused();
  expect(await page.evaluate(() => window.__uploads.length)).toBe(1);
  await receipt
    .getByRole("button", { name: "Retry upload", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.__navigations.at(-1)))
    .toMatch(/\/receipts\/scan$/);
  expect(await page.evaluate(() => window.__uploads)).toEqual([
    { file: "receipt.png", reservation: null },
    { file: "receipt.png", reservation: { uploadId: "one-reservation" } },
  ]);
});

test("menus, payment fields and receipt allocations stay accessible across viewport sizes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await load(page);
  const payment = panel(page, "Record a payment");
  const recipient = payment.getByRole("combobox", {
    name: "Received by",
    exact: true,
  });
  await recipient.focus();
  await recipient.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("m");
  await expect(
    page.getByRole("option", { name: "Mali (inactive)", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(recipient).toContainText("Mali (inactive)");
  await expect(recipient).toBeFocused();
  await recipient.press("Enter");
  await page.keyboard.press("Escape");
  await expect(recipient).toBeFocused();
  const review = panel(page, "Review receipt");
  await choose(
    review,
    "Allocate tax, tip, discount, and rounding difference",
    "Custom amounts",
  );
  await expect(review.getByLabel("Sokha adjustment (USD)")).toBeVisible();
  const filters = panel(page, "Expense history");
  await choose(filters, "Category", "Food & drinks");
  await choose(filters, "Category", "All categories");
  expect(await page.evaluate(() => window.__navigations.at(-1))).toBe(
    "/b/" + "a".repeat(43),
  );
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({
    path: "/private/tmp/bill-splitter-rollout-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 850 });
  await page.screenshot({
    path: "/private/tmp/bill-splitter-rollout-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("brand icons are served with browser metadata and approved home typography", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("banner").locator("img")).toHaveAttribute(
    "src",
    "/icon.svg",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "font-family",
    /^Helvetica, "?Helvetica Neue"?, Arial, sans-serif$/,
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "font-weight",
    "700",
  );
  await expect(
    page.locator('link[rel="icon"][type="image/svg+xml"]'),
  ).toHaveAttribute("sizes", "any");
  for (const path of ["/icon.svg", "/favicon.ico", "/apple-icon.png"]) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(200);
  }
  await page.screenshot({
    path: "/private/tmp/bill-splitter-home-desktop.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 850 });
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  expect(errors).toEqual([]);
});

test("dropdown labels stay on one line with stable checkmark space and viewport bounds", async ({
  page,
}, testInfo) => {
  await load(page);
  const filters = panel(page, "Expense history");
  // Reproduce the narrow filter triggers from the reported screenshots.
  await filters.locator("label").evaluateAll((labels) =>
    labels.forEach((label) => {
      label.style.width = "120px";
    }),
  );
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    for (const [label, selected] of [
      ["Person", "Everyone"],
      ["Category", "All categories"],
    ]) {
      const trigger = filters.getByRole("combobox", {
        name: label,
        exact: true,
      });
      const triggerBounds = await trigger.boundingBox();
      await trigger.click();
      const menu = page.getByRole("listbox", { name: label, exact: true });
      await expect(menu).toBeVisible();
      await expect(menu).toHaveCSS("transform", "none");
      const bounds = await menu.boundingBox();
      expect(bounds.width).toBeGreaterThan(triggerBounds.width);
      expect(bounds.width).toBeGreaterThanOrEqual(239);
      expect(bounds.x).toBeGreaterThanOrEqual(15);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 15);
      const option = menu.getByRole("option", { name: selected, exact: true });
      await expect(option).toHaveAttribute("data-state", "checked");
      const metrics = await option
        .locator("[data-option-text]")
        .evaluate((text) => ({
          whiteSpace: getComputedStyle(text).whiteSpace,
          height: text.getBoundingClientRect().height,
          lineHeight: parseFloat(getComputedStyle(text).lineHeight),
          width: text.clientWidth,
          contentWidth: text.scrollWidth,
        }));
      expect(metrics.whiteSpace).toBe("nowrap");
      expect(metrics.height).toBeLessThanOrEqual(Math.ceil(metrics.lineHeight));
      expect(metrics.contentWidth).toBeLessThanOrEqual(metrics.width);
      // Selected and unselected category labels get the same text column.
      if (label === "Category") {
        const unselectedWidth = await menu
          .getByRole("option", { name: "General", exact: true })
          .locator("[data-option-text]")
          .evaluate((text) => text.clientWidth);
        expect(unselectedWidth).toBe(metrics.width);
        if (width === 320)
          await page.screenshot({
            path: `/private/tmp/bill-splitter-dropdown-${testInfo.project.name}.png`,
          });
      }
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox")).toHaveCount(0);
    }
  }
  await page.setViewportSize({ width: 320, height: 850 });
  await page
    .getByRole("combobox", { name: "Long participant name", exact: true })
    .click();
  const longName =
    "Alexandria LongParticipantNameWithoutSpacesForDropdownOverflowChecks";
  const text = page
    .getByRole("option", { name: longName, exact: true })
    .locator("[data-option-text]");
  await expect(text).toHaveCSS("white-space", "nowrap");
  await expect(text).toHaveCSS("text-overflow", "ellipsis");
  await expect(text).toHaveAttribute("title", longName);
  expect(
    await text.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  await expect(page.getByRole("listbox")).toHaveCSS("transform", "none");
  const bounds = await page.getByRole("listbox").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(15);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(305);
});
