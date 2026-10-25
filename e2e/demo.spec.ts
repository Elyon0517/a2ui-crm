import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('JSON updates, bound form actions, validation and reset work in the browser', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /From agent insight/ })).toBeVisible();
  await page.getByRole('textbox', { name: 'Goal', exact: true }).fill('Practice confident transitions');
  await page.getByLabel('Daily practice').selectOption('15');
  await page.getByRole('button', { name: 'Preview plan' }).click();
  const inspector = page.locator('article').nth(1).locator('pre');
  await expect(inspector).toContainText('previewPlan');
  await expect(inspector).toContainText('Practice confident transitions');
  await expect(inspector).toContainText('15');
  await expect(page.getByLabel('Dashboard status')).toContainText('1');
  await page.getByRole('textbox', { name: 'Protocol JSON' }).fill(JSON.stringify({
    version: 'v0.9.1', updateDataModel: { surfaceId: 'plan', path: '/goal', value: 'Practice speaking' },
  }));
  await page.getByRole('button', { name: 'Apply message' }).click();
  await expect(page.getByRole('textbox', { name: 'Goal', exact: true })).toHaveValue('Practice speaking');
  await page.getByRole('button', { name: 'Preview plan' }).click();
  await expect(inspector).toContainText('Practice speaking');
  mkdirSync('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/coach-dashboard.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Protocol JSON' }).fill('{bad json');
  await page.getByRole('button', { name: 'Apply message' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(inspector).toHaveText('[]');
  await expect(page.getByRole('textbox', { name: 'Goal', exact: true })).toHaveValue('Improve IELTS transitions');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
