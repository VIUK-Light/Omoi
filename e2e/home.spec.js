const { test, expect } = require('@playwright/test');

test('home opens category selection and enables the next step', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Omoi/);
  await expect(page.getByRole('heading', { name: 'Omoi', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'はじめる' }).click();

  await expect(page.getByRole('heading', { name: 'どんな話をしたい？' })).toBeVisible();
  const nextButton = page.getByRole('button', { name: '次へ' });
  await expect(nextButton).toBeDisabled();
  await expect(page.locator('input[name="level"]')).toHaveCount(3);
  await expect(page.locator('#level1')).toHaveCount(0);
  await page.locator('label[for="level2"]').click();
  await expect(nextButton).toBeEnabled();
});

test('theme can follow the device or be set manually across pages', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(22, 24, 27)');

  await page.locator('.theme-control > summary').click();
  await page.getByRole('button', { name: 'ライト' }).click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  await page.goto('/select.html');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  await page.locator('.theme-control > summary').click();
  await page.getByRole('button', { name: '自動' }).click();
  await expect(root).toHaveAttribute('data-theme', 'dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveAttribute('data-theme', 'light');
});
