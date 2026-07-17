import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-smoke',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  use: {
    baseURL: process.env.SMOKE_TEST_URL ?? 'https://theater.adesca.dev',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
