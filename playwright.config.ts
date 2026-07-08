import { defineConfig, devices } from '@playwright/test';

const backendUrl = 'http://127.0.0.1:3000';
const frontendUrl = 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'ENV=dev node --import tsx e2e/support/backend-with-msw.ts',
      url: `${backendUrl}/`,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `VITE_API_URL=${backendUrl} npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173`,
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
