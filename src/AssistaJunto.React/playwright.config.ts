import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: 'node tests/e2e/start-host.mjs', url: 'http://127.0.0.1:5199/__test/health', reuseExistingServer: false, timeout: 120_000 },
    { command: 'npm run dev', url: 'http://127.0.0.1:5173', env: { API_BASE_URL: 'http://127.0.0.1:5199' }, reuseExistingServer: false, timeout: 30_000 },
  ],
});
