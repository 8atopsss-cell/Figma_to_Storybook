import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:6007', viewport: { width: 1366, height: 900 }, browserName: 'chromium' },
  reporter: [['list']],
});
