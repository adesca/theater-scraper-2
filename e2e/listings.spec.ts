import { expect, test } from '@playwright/test';

test('loads performance listings through the real frontend and backend', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('2 / 2 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByText('Chicago Stage Company')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toBeVisible();
  await expect(page.getByText('Lakefront Theater')).toBeVisible();
});

test('filters listings using data returned by the backend', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Starts this month' }).click();

  await expect(page.getByText('1 / 2 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toHaveCount(0);
});
