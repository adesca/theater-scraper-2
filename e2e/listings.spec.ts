import { expect, test } from '@playwright/test';

test('loads performance listings through the real frontend and backend', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('16 / 16 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByText('Chicago Stage Company')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toBeVisible();
  await expect(page.getByText('Lakefront Theater')).toBeVisible();
});

test('filters listings using data returned by the backend', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Starts this month' }).click();

  await expect(page.getByText('13 / 16 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toHaveCount(0);
});

test('shows the number of cities with listings next to the region name', async ({ page }) => {
  await page.goto('/');

  // Chicago Stage Company (Dallas) and Lakefront Theater (Richardson) both fall under the
  // "North Dallas" region, so it should report 2 cities with shows.
  await expect(page.getByText('North Dallas (2)')).toBeVisible();
});

test('selecting a city filters the main panel to only that city\'s listings', async ({ page }) => {
  await page.goto('/');

  await page.getByText('Dallas', { exact: true }).click();

  await expect(page.getByText('1 / 16 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toHaveCount(0);
});

test('switching the selected city updates which listings are shown', async ({ page }) => {
  await page.goto('/');

  await page.getByText('Dallas', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toHaveCount(0);

  await page.getByText('Richardson', { exact: true }).click();

  await expect(page.getByText('1 / 16 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toHaveCount(0);
});
