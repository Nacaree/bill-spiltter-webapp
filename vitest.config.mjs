import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
