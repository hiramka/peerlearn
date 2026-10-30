import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/playwright",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev:server",
      port: 3001,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "npm run dev:web",
      port: 5173,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
