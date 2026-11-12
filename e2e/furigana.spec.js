const { test, expect } = require('@playwright/test');

test('furigana settings open at the top right and preserve the original question text', async ({ page }) => {
  await page.goto('/question.html?level=2');

  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  const question = page.locator('#questionText');
  const originalText = await question.textContent();
  await expect(question.locator('ruby')).toHaveCount(0);

  const settingsIcon = page.locator('.furigana-settings > summary');
  const themeIcon = page.locator('.theme-control > summary');
  const settingsBounds = await settingsIcon.boundingBox();
  const themeBounds = await themeIcon.boundingBox();
  expect(settingsBounds.x + settingsBounds.width).toBeLessThan(themeBounds.x);

  await settingsIcon.click();
  const toggle = page.locator('#furiganaToggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(question.locator('ruby')).not.toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(question).toHaveText(originalText);
  await expect(question.locator('ruby')).toHaveCount(0);
});
