const { test, expect } = require('@playwright/test');

test('home opens category selection and enables the next step', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Omoi/);
  await expect(page.getByRole('heading', { name: 'Omoi', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'はじめる' }).click();

  await expect(page.getByRole('heading', { name: 'どんな話をしたい？' })).toBeVisible();
  const nextButton = page.getByRole('button', { name: '次へ' });
  await expect(nextButton).toBeDisabled();
  await page.getByText('日常や自分のこと', { exact: true }).click();
  await expect(nextButton).toBeEnabled();
});
