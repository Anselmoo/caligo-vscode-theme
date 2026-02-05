import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Only run Playwright specs. The repository also contains VS Code integration tests
  // under `tests/` that use the VS Code extension host (Mocha) and import `vscode`.
  // Those must not be executed by Playwright.
  testMatch: ["**/*.spec.ts"],
  testIgnore: ["**/integration/**", "**/setup.ts", "**/__tests__/**"],
  timeout: 20_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2, // Use 1 worker in CI for stability
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "build/playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "build/playwright-report", open: "never" }]],
  use: {
    headless: true,
    viewport: { width: 1200, height: 800 },
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // Configure screenshot comparison with more lenient thresholds
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 150,
      threshold: 0.3,
      animations: "disabled",
    },
  },
  // Run chromium only
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Web server configuration for e2e tests
  webServer: process.env.PLAYWRIGHT_DISABLE_WEB_SERVER
    ? undefined
    : {
        command: "npm run pages:preview",
        port: 4173,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
