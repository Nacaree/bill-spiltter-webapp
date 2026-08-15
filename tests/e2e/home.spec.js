import { expect, test } from "@playwright/test";

test("shows the bill creation form", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Create a bill" }),
  ).toBeVisible();
  await expect(page.getByLabel("Bill name")).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeVisible();
  await expect(page.getByLabel("Currency")).toHaveValue("USD");
  await expect(page.getByRole("button", { name: "Create bill" })).toBeEnabled();
});
