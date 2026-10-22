import { defineConfig } from "@playwright/test";
import base from "./playwright.accessibility.config.mjs";

export default defineConfig({
  ...base,
  testMatch: "lifecycle-accessibility.spec.js",
  use: { ...base.use, baseURL: "http://127.0.0.1:3000" },
  webServer: {
    command: "npm run dev -- -H 127.0.0.1 -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  // Firefox remains unavailable on this Mac; keep its existing coverage status explicit.
  projects: base.projects.filter((project) => project.name !== "firefox"),
});
