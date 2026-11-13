import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:8011",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "../build/eval/playwright",
  reporter: [
    ["list"],
    ["json", { outputFile: "../build/eval/playwright-results.json" }],
  ],
  webServer: {
    command:
      ".venv\\Scripts\\python.exe -I -m uvicorn embernova.main:app --host 127.0.0.1 --port 8011",
    cwd: "../backend",
    url: "http://127.0.0.1:8011/api/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: process.env.EMBERNOVA_LIVE_E2E === "1" ? {} : { OPENAI_API_KEY: "" },
  },
});
