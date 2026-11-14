import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Runs the judge-flow browser tests against the deployed site instead of a local server:
//   npx playwright test -c playwright.prod.config.ts e2e/research.spec.ts
// Override the target with EMBERNOVA_BASE_URL.
export default defineConfig({
  ...base,
  use: {
    ...base.use,
    baseURL: process.env.EMBERNOVA_BASE_URL ?? "https://embernova.khedmetak.com",
  },
  outputDir: "../build/eval/playwright-prod",
  reporter: [["list"]],
  webServer: undefined,
});
