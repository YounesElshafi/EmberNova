import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Runs the judge-flow browser tests against the deployed site instead of a local server:
//   npx playwright test -c playwright.prod.config.ts e2e/research.spec.ts
// Override the target with EMBERNOVA_BASE_URL.
export default defineConfig({
  ...base,
  // Over the public internet assertions wait on real network transfer, not a loopback server.
  timeout: 120000,
  expect: { timeout: Number(process.env.E2E_EXPECT_TIMEOUT ?? 30000) },
  use: {
    ...base.use,
    baseURL: process.env.EMBERNOVA_BASE_URL ?? "https://embernova.khedmetak.com",
  },
  outputDir: "../build/eval/playwright-prod",
  reporter: [["list"]],
  webServer: undefined,
});
