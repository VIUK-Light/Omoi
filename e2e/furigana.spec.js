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

test('classroom mode enlarges text and shortens the primary button', async ({ page }) => {
  await page.goto('/question.html?level=2');

  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  const question = page.locator('#questionText');
  const defaultFontSize = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).fontSize));
  const nextButton = page.locator('#nextQuestionButton');
  const defaultButtonHeight = (await nextButton.boundingBox()).height;

  await page.locator('.furigana-settings > summary').click();
  const toggle = page.locator('#classroomModeToggle');
  await expect(toggle).toBeVisible();
  await toggle.click();

  const classroomFontSize = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).fontSize));
  const classroomButtonHeight = (await nextButton.boundingBox()).height;
  expect(classroomFontSize).toBeGreaterThan(defaultFontSize);
  expect(classroomButtonHeight).toBeLessThan(defaultButtonHeight);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.question-screen')).toHaveClass(/classroom-mode/);
});
