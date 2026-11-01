import { defineConfig, devices } from '@playwright/test'

/**
 * 화면 자동 점검: 예시 데이터가 들어간 앱을 띄워 실제로 눌러 봄.
 * npm run test:e2e (처음 한 번: npx playwright install chromium)
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:43124',
    ...devices['Pixel 7'],
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build:demo && npx vite preview --port 43124 --strictPort',
    url: 'http://localhost:43124',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
