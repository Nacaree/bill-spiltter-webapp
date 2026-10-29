import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config.mjs";

const productionControls = [
  "activity-time.spec.js",
  "date-picker.spec.js",
  "design-rollout.spec.js",
  "mobile-accessibility.spec.js",
  "lifecycle-accessibility.spec.js",
];
export default defineConfig({
  ...base,
  testMatch: [
    "design-reference.spec.js",
    "home.spec.js",
    ...productionControls,
  ],
  // This suite is deliberately offline even if hosted test flags are set.
  grepInvert:
    /bill, expense, settlement and receipt controls remain accessible on small screens/,
  workers: 1,
  use: {
    ...base.use,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? base.use.baseURL,
    screenshot: "only-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : base.webServer,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "webkit",
      testMatch: productionControls,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "iphone",
      testMatch: productionControls,
      use: { ...devices["iPhone 13"] },
    },
  ],
});
