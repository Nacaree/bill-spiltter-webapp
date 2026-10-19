import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3100", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -H 127.0.0.1 -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer:
      !process.env.CI &&
      process.env.RECEIPT_EXTRACTION_DEV_FIXTURE !== "success",
  },
});
