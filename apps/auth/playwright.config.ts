import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — apps/auth end-to-end tests.
 *
 * Scope: today, the login page renders + form fields are present. A
 * full login-and-redirect flow needs a seeded test user, which lands
 * alongside CI (E13) — the runbook will seed one via Supabase Auth's
 * admin API before running the suite.
 *
 * `webServer` boots `pnpm dev` on port 3001 if nothing's already
 * listening there, and reuses whatever is running otherwise —
 * convenient for local iteration (`pnpm dev` already up in a tab).
 *
 * BROWSERS NOT INSTALLED BY DEFAULT: `@playwright/test` in
 * package.json only pulls the test runner; the actual chromium
 * binary is ~180 MB and installed on demand via
 * `pnpm --filter @shesa/auth test:e2e:install`. CI will run that
 * once per cache-key when it lands.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },

  projects: [
    // Chromium only for Phase 0 — Firefox / WebKit add another ~500 MB of
    // downloads for near-identical coverage. Add them if a real
    // browser-specific bug emerges.
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
