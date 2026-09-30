import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;

/**
 * npm run e2e: happy path against a dev server with a throwaway local store,
 * pinned to 2026-10-01 (a word warm-up, a percent trap, a quantity boss).
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/about`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      PUZZLE_DATE_OVERRIDE: '2026-10-01',
      LAUNCH_DATE: '2026-10-01',
      BURNER_DATA_FILE: `.data/e2e-${Date.now()}.json`,
      NEXT_PUBLIC_SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      ANTHROPIC_API_KEY: '',
      VOYAGE_API_KEY: '',
    },
  },
});
