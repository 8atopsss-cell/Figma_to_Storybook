import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:6006', browserName: 'chromium', viewport: { width: 1280, height: 800 } },
  webServer: [
    { command: 'npm run storybook -- --ci', url: 'http://127.0.0.1:6006', reuseExistingServer: !process.env.CI, timeout: 120000 },
    { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 120000 },
  ],
  reporter: [['list']],
});
