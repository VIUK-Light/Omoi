const { test, expect } = require('@playwright/test');

test.describe.configure({ timeout: 60000 });

const ready = { timeout: 20000 };

test('student mode starts without a warning from labelled questions', async ({ page }) => {
  await page.goto('/select.html');
  await page.locator('label[for="modeStudent"]').click();
  await expect(page.locator('#nextButton')).toBeEnabled();
  await page.locator('#nextButton').click();
  await expect(page).toHaveURL(/\/question\.html\?mode=student(?:&session=[A-Za-z0-9_-]+)?$/);
  await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
  await expect(page.locator('#sharedQuestionNotice')).toBeHidden();

  await page.reload();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
  await expect(page.locator('#sharedQuestionNotice')).toBeHidden();
});

test('custom mode starts from selected categories without a warning', async ({ page }) => {
  await page.goto('/select.html');
  await page.locator('label[for="modeCustom"]').click();
  await page.locator('#nextButton').click();
  await expect(page).toHaveURL(/\/custom-select\.html$/);
  await expect(page.getByRole('heading', { name: '問いを選ぶ' })).toBeVisible();
  await expect(page.locator('#labelList input[value="school"]')).toHaveCount(1, ready);

  await page.locator('#labelList label.label-card')
    .filter({ has: page.locator('input[value="school"]') })
    .click();
  await expect(page.locator('#customTotal')).toHaveText('122問');
  await expect(page.locator('#customBreakdown')).toContainText('カテゴリー1件');
  await expect(page.locator('#labelSelectionSummary')).toHaveText('1件選択中');
  await expect(page.locator('#clearLabels')).toBeVisible();
  await page.locator('#nextButton').click();

  await expect(page).toHaveURL(/\/question\.html\?mode=custom&session=/);
  await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
  await expect(page.locator('#sharedQuestionNotice')).toBeHidden();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('omoi-progress')));
  expect(saved.version).toBe(2);
  expect(saved.mode).toBe('custom');
  expect(saved.labels).toEqual(['school']);
});

test('custom mode can start from an individually selected question', async ({ page }) => {
  await page.goto('/custom-select.html');
  await expect(page.locator('#labelList input[value="school"]')).toHaveCount(1, ready);

  await page.locator('#tabQuestions').click();
  const firstQuestion = page.locator('#questionPicker .question-pick').first();
  await expect(firstQuestion).toBeVisible(ready);
  await firstQuestion.locator('label').click();

  await expect(firstQuestion).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('#questionPickerCount')).toHaveText('1問');
  await expect(page.locator('#selectedQuestionsPanel')).toBeVisible();
  await expect(page.locator('.selected-question-item')).toHaveCount(1);
  await expect(page.locator('#customTotal')).toHaveText('1問');
  await expect(page.locator('#customBreakdown')).toContainText('個別1問');
  await expect(page.locator('#nextButton')).toBeEnabled();
  await page.locator('#nextButton').click();

  await expect(page).toHaveURL(/\/question\.html\?mode=custom&session=/);
  await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('omoi-progress')));
  expect(saved.labels).toEqual([]);
  expect(saved.selectedIds).toHaveLength(1);
});

test('the question picker filters by words and level and keeps a selected list', async ({ page }) => {
  await page.goto('/custom-select.html');
  await expect(page.locator('#labelList input[value="school"]')).toHaveCount(1, ready);

  await page.locator('#tabQuestions').click();
  await expect(page.locator('#questionsPanel')).toBeVisible();
  await expect(page.locator('#questionPickerStatus')).toContainText('743問', ready);

  const search = page.locator('#questionSearch');
  await search.fill('いじめ');
  const firstQuestion = page.locator('#questionPicker .question-pick').first();
  await expect(firstQuestion).toBeVisible();

  await page.locator('[data-level-filter="2"]').click();
  await expect(page.locator('[data-level-filter="2"]')).toHaveAttribute('aria-pressed', 'true');
  const badges = page.locator('#questionPicker .level-badge');
  expect(await badges.count()).toBeGreaterThan(0);
  for (const text of await badges.allTextContents()) {
    expect(text).toBe('level:低');
  }

  await firstQuestion.locator('label').click();
  await expect(firstQuestion).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('.selected-question-item')).toHaveCount(1);
  await expect(page.locator('#questionPickerCount')).toHaveText('1問');

  await page.locator('#tabLabels').click();
  await page.locator('#labelList label.label-card')
    .filter({ has: page.locator('input[value="school"]') })
    .click();
  await page.locator('#tabQuestions').click();
  await expect(page.locator('.selected-question-item')).toHaveCount(1);
  await expect(page.locator('#customBreakdown')).toContainText('カテゴリー1件');
  await expect(page.locator('#customBreakdown')).toContainText('個別1問');

  await page.locator('.selected-question-remove').click();
  await expect(page.locator('#selectedQuestionsPanel')).toBeHidden();
  await expect(page.locator('#questionPickerCount')).toBeHidden();
  await expect(firstQuestion).toHaveAttribute('data-selected', 'false');

  await search.fill('存在しない語句xyz');
  await expect(page.locator('#questionPickerStatus')).toHaveAttribute('data-empty', 'true');
  await expect(page.locator('#questionPickerStatus')).toContainText('一致する問いがありません');
});

test('custom selection fits 320px and keeps the action bar visible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/custom-select.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#labelList input[value="school"]')).toHaveCount(1, ready);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const actionBar = page.locator('.custom-action-bar');
  await expect(actionBar).toBeVisible();
  const bottom = await actionBar.evaluate(element =>
    Math.round(element.getBoundingClientRect().bottom));
  expect(bottom).toBe(800);

  await page.locator('#tabQuestions').click();
  await expect(page.locator('#questionSearch')).toBeVisible();
  await expect(page.locator('[data-level-filter="all"]')).toBeVisible();

  await page.locator('#questionPicker .question-pick').first().locator('label').click();
  await expect(page.locator('.selected-question-item')).toBeVisible();
  const pickerOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(pickerOverflow).toBeLessThanOrEqual(0);

  await page.locator('.selected-question-remove').click();
  await expect(page.locator('#selectedQuestionsPanel')).toBeHidden();

  await page.locator('#tabLabels').click();
  await page.locator('#labelList label.label-card')
    .filter({ has: page.locator('input[value="school"]') })
    .click();
  await expect(page.locator('#nextButton')).toBeEnabled();
  await expect(actionBar).toBeVisible();
});
