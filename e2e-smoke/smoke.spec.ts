import { expect, test } from '@playwright/test';

test('a real show renders on the homepage instead of the loading skeleton', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('.card-title').first()).toBeVisible();
});
