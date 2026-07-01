import { expect, test } from '@playwright/test';

/**
 * Login page smoke.
 *
 * Runs against a live dev server (Playwright's `webServer` boots one).
 * Doesn't attempt actual sign-in — that needs a seeded test user which
 * lands with CI (E13). Today: prove the shell renders + form fields
 * are labeled correctly so a11y (screen readers, autofill) works.
 */
test.describe('login page', () => {
  test('renders the sign-in card with email + password fields', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Shesa/);
    await expect(page.getByRole('heading', { name: 'Shesa' })).toBeVisible();
    await expect(page.getByText('Sign in to continue')).toBeVisible();

    // Labeled by <Label htmlFor="...">, so getByLabel resolves to the
    // right <Input> if the label association is correct.
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
  });

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Forgot password?' }).click();

    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  });
});
