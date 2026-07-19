import { expect, test } from '@playwright/test';

test('loads performance listings through the real frontend and backend', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('17 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByText('Chicago Stage Company')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toBeVisible();
  await expect(page.getByText('Lakefront Theater')).toBeVisible();
});

test('filters listings using data returned by the backend', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Starts this month' }).click();

  await expect(page.getByText('13 / 17 show listings')).toBeVisible();
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

  await expect(page.getByText('1 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toHaveCount(0);
});

test('switching the selected city updates which listings are shown', async ({ page }) => {
  await page.goto('/');

  await page.getByText('Dallas', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toHaveCount(0);

  await page.getByText('Richardson', { exact: true }).click();

  await expect(page.getByText('1 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toHaveCount(0);
});

test('selecting a date filter adds it to the url', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Starts this month' }).click();

  await expect(page).toHaveURL(/[?&]date=starts\+this\+month/);
});

test('selecting a city filter adds it to the url', async ({ page }) => {
  await page.goto('/');

  await page.getByText('Dallas', { exact: true }).click();

  await expect(page).toHaveURL(/[?&]city=Dallas/);
});

test('opening a url with a prefilled date filter shows the filtered listings', async ({ page }) => {
  await page.goto('/?date=starts+this+month');

  await expect(page.getByText('13 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toHaveCount(0);
});

test('opening a url with a prefilled city filter shows the filtered listings', async ({ page }) => {
  await page.goto('/?city=Dallas');

  await expect(page.getByText('1 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Glass Menagerie' })).toHaveCount(0);
});

test('listings render sorted by start date, earliest first (regression: unsorted listings)', async ({ page }) => {
  await page.goto('/');

  // "A Winter's Tale" (January 8) is scraped last but starts earlier than every
  // other listing (the next-earliest, "1776", starts July 2), so it must render first.
  await expect(page.getByText('17 / 17 show listings')).toBeVisible();

  const titles = (await page.locator('a.card-title').allTextContents())
      .map(t => t.replace(/\s+/g, ' ').trim());

  const wintersTale = titles.findIndex(t => t.includes("A Winter's Tale"));
  const seventeen76 = titles.findIndex(t => t.includes('1776'));
  const playThatGoesWrong = titles.findIndex(t => t.includes('The Play That Goes Wrong'));

  expect(wintersTale).toBe(0);
  expect(wintersTale).toBeLessThan(seventeen76);
  expect(wintersTale).toBeLessThan(playThatGoesWrong);
});

test('selecting the October month filter shows only listings running that month (regression: month button used the wrong index)', async ({ page }) => {
  await page.goto('/');

  // Only "The Rocky Horror Show" (October 30 - November 8) touches October. The month
  // buttons used to be built from a pre-filtered, re-indexed array, so clicking a month
  // after the current one applied the wrong numeric filter and matched nothing.
  await page.getByRole('button', { name: /^October/ }).click();

  await expect(page.getByText('1 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Rocky Horror Show' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1776' })).toHaveCount(0);
});

test('selecting the November month filter shows only listings running that month (regression: month button used the wrong index)', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /^November/ }).click();

  await expect(page.getByText('1 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Rocky Horror Show' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1776' })).toHaveCount(0);
});

test('selecting the January month filter shows only January listings (regression: month index 0 was treated as falsy)', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /^January/ }).click();

  await expect(page.getByText('1 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: "A Winter's Tale" })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1776' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The Play That Goes Wrong' })).toHaveCount(0);
});

test('opening a url with a prefilled January (index 0) date filter shows only January listings', async ({ page }) => {
  await page.goto('/?date=0');

  await expect(page.getByText('1 / 17 show listings')).toBeVisible();
  await expect(page.getByRole('heading', { name: "A Winter's Tale" })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1776' })).toHaveCount(0);
});
