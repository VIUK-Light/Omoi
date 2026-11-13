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
  const classroomBounds = await page.locator('#classroomModeToggle').boundingBox();
  expect(classroomBounds.x + classroomBounds.width).toBeLessThan(settingsBounds.x);

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

test('large text mode and classroom mode have distinct sizes and button heights', async ({ page }) => {
  await page.goto('/question.html?level=2');

  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  const question = page.locator('#questionText');
  const defaultFontSize = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).fontSize));
  const nextButton = page.locator('#nextQuestionButton');
  const defaultButtonHeight = (await nextButton.boundingBox()).height;

  const largeTextToggle = page.locator('#largeTextToggle');
  const classroomToggle = page.locator('#classroomModeToggle');
  await expect(classroomToggle).toBeVisible();
  await page.locator('.furigana-settings > summary').click();
  await expect(largeTextToggle).toBeVisible();
  await largeTextToggle.click();

  const largeTextFontSize = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).fontSize));
  expect(largeTextFontSize).toBeGreaterThan(defaultFontSize);
  await expect(largeTextToggle).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#furiganaToggle').click();
  await classroomToggle.click();

  const classroomFontSize = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).fontSize));
  const classroomLineHeight = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).lineHeight));
  const classroomButtonHeight = (await nextButton.boundingBox()).height;
  expect(classroomFontSize).toBeGreaterThan(largeTextFontSize);
  expect(classroomLineHeight / classroomFontSize).toBeGreaterThanOrEqual(1.8);
  await expect(question.locator('ruby')).not.toHaveCount(0);
  expect(classroomButtonHeight).toBeLessThan(defaultButtonHeight);
  await expect(largeTextToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(classroomToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.question-screen')).toHaveClass(/classroom-mode/);
  await expect(nextButton).toBeVisible();
  await expect(page.locator('.back-link')).toBeHidden();
  await expect(page.locator('.question-tools')).toBeHidden();
  await expect(page.locator('.question-navigation')).toBeHidden();
});
