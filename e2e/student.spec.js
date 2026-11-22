const { test, expect } = require('@playwright/test');

test.describe.configure({ timeout: 60000 });

const ready = { timeout: 20000 };

async function waitForStudentSelect(page) {
  await expect(page.locator('html[data-student-select-ready="true"]')).toBeAttached(ready);
}

async function openSettings(page, role = 'teacher') {
  await page.goto('/student-select.html');
  await waitForStudentSelect(page);
  await expect(page.locator('[data-student-role="student"]')).toBeVisible(ready);
  await page.locator('[data-student-role="' + role + '"]').click();
  await expect(page.locator('#themeGroups input[name="theme-group"]')).toHaveCount(7, ready);
  await expect(page.locator('#studentTotal')).not.toHaveText('—', ready);
}

async function chooseTheme(page, id) {
  await page.locator('#themeGroups label.label-card')
    .filter({ has: page.locator(`input[data-topic-ids*="${id}"]`) })
    .click();
}

test('quick start opens the 120 student questions without a settings detour', async ({ page }) => {
  await page.goto('/select.html');
  await page.locator('label[for="modeStudent"]').click();
  await page.locator('#nextButton').click();
  await expect(page).toHaveURL(/\/student-select\.html$/);
  await expect(page.getByRole('heading', { name: '使うのは？' })).toBeVisible();
  await waitForStudentSelect(page);

  await page.locator('[data-student-role="student"]').click();
  await expect(page.getByRole('heading', { name: '自分で設定する' })).toBeVisible();
  await page.locator('#quickStartButton').click();
  await expect(page).toHaveURL(/\/question\.html\?mode=student/);
  await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
  await expect(page.locator('#questionProgress')).toHaveText('1 / 120');
  await expect(page.locator('#sharedQuestionNotice')).toBeHidden();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('omoi-progress')));
  expect(saved.version).toBe(3);
  expect(saved.mode).toBe('student');
  expect(saved.ids).toHaveLength(120);
  expect(saved.student.source).toBe('default');
});

test('category, level, count, heavy and classroom settings reach the question URL', async ({ page }) => {
  await openSettings(page);

  await chooseTheme(page, 'bullying');
  await page.locator('[data-student-level="2"]').click();
  await page.locator('[data-student-count="5"]').click();
  await page.locator('#avoidHeavy').check();
  await page.locator('#classroomStart').check();

  await expect(page.locator('#studentTotal')).toHaveText('5問');
  await expect(page.locator('#studentBreakdown')).toContainText('1カテゴリー');
  await expect(page.locator('#studentBreakdown')).toContainText('level:低');
  await expect(page.locator('#studentBreakdown')).toContainText('重い内容を除外');

  await page.locator('#nextButton').click();
  await expect(page).toHaveURL(/\/student-preview\.html\?mode=student/);
  await expect(page.getByRole('heading', { name: 'セットの確認' })).toBeVisible();
  await expect(page.locator('#previewTotal')).toHaveText('5問');
  await expect(page.locator('.student-preview-item')).toHaveCount(5);

  await page.locator('#startButton').click();
  await expect(page).toHaveURL(/\/question\.html\?mode=student/);
  const url = new URL(page.url());
  expect(url.searchParams.get('ids')).toBeTruthy();
  expect(url.searchParams.get('classroom')).toBe('1');

  await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
  await expect(page.locator('.question-screen')).toHaveClass(/classroom-mode/);
  await expect(page.locator('#questionProgress')).toHaveText('1 / 5');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('omoi-progress')));
  expect(saved.version).toBe(3);
  expect(saved.classroom).toBe(true);
  expect(saved.student.source).toBe('selection');
  expect(saved.ids).toHaveLength(5);
});

test('individual question selection starts an exact deck and survives a reload', async ({ page }) => {
  await openSettings(page, 'teacher');

  await expect(page.locator('.student-picker-block')).toBeVisible();
  await expect(page.locator('#pickerBody')).toBeHidden();
  await page.locator('#togglePicker').click();
  await expect(page.locator('#pickerBody')).toBeVisible();
  await page.locator('#questionSearch').fill('いじめ');
  await expect(page.locator('#questionPicker .question-pick').first()).toBeVisible(ready);

  const first = page.locator('#questionPicker .question-pick').nth(0);
  const second = page.locator('#questionPicker .question-pick').nth(1);
  await first.locator('label').click();
  await second.locator('label').click();

  await expect(page.locator('#selectedQuestionsSection')).toBeVisible();
  await expect(page.locator('#selectedQuestionsStatus')).toContainText('2問');
  await expect(page.locator('#studentTotal')).toHaveText('2問');
  await expect(page.locator('#studentBreakdown')).toContainText('個別に選んだ2問');

  await page.locator('#nextButton').click();
  await expect(page).toHaveURL(/\/student-preview\.html\?mode=student/);
  await expect(page.locator('.student-preview-item')).toHaveCount(2);
  await page.locator('#startButton').click();
  await expect(page).toHaveURL(/\/question\.html\?mode=student/);
  await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
  await expect(page.locator('#questionProgress')).toHaveText('1 / 2');
  const firstQuestion = await page.locator('#questionText').innerText();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('omoi-progress')));
  expect(saved.version).toBe(3);
  expect(saved.ids).toHaveLength(2);
  expect(saved.student.source).toBe('selection');

  await page.reload();
  await expect(page.locator('#questionText')).toHaveText(firstQuestion, ready);
  await expect(page.locator('#questionProgress')).toHaveText('1 / 2');
});

test('the settings screen restores the saved student session for editing', async ({ page }) => {
  await openSettings(page);

  await chooseTheme(page, 'bullying');
  await page.locator('[data-student-level="2"]').click();
  await page.locator('[data-student-count="5"]').click();
  await page.locator('#avoidHeavy').check();
  await page.locator('#nextButton').click();
  await expect(page).toHaveURL(/\/student-preview\.html\?mode=student/);
  await page.locator('#startButton').click();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

  await expect(page.locator('#changeCategoryLink')).toHaveText('← 設定を変える');
  await page.locator('#changeCategoryLink').click();
  await expect(page).toHaveURL(/\/student-select\.html\?.*edit=1/);
  await expect(page.locator('#themeGroups input[name="theme-group"]')).toHaveCount(7, ready);

  await expect(page.locator('#themeGroups input[data-topic-ids*="bullying"]')).toBeChecked();
  await expect(page.locator('[data-student-level="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-student-count="5"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#avoidHeavy')).toBeChecked();
  await expect(page.locator('.student-picker-block')).toBeHidden();
});

test('teacher role reveals individual question selection, student role hides it', async ({ page }) => {
  await page.goto('/student-select.html');
  await expect(page.getByRole('heading', { name: '使うのは？' })).toBeVisible(ready);
  await waitForStudentSelect(page);

  await page.locator('[data-student-role="student"]').click();
  await expect(page.locator('#themeGroups input[name="theme-group"]')).toHaveCount(7, ready);
  await expect(page.locator('.student-picker-block')).toBeHidden();

  await page.locator('#backToRole').click();
  await expect(page.getByRole('heading', { name: '使うのは？' })).toBeVisible();
  await page.locator('[data-student-role="teacher"]').click();
  await expect(page.locator('.student-picker-block')).toBeVisible();
  await expect(page.locator('#pickerBody')).toBeHidden();
  await page.locator('#togglePicker').click();
  await expect(page.locator('#pickerBody')).toBeVisible();
});

test('the student settings screen fits 320px and keeps the action bar visible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await openSettings(page);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const actionBar = page.locator('.custom-action-bar');
  await expect(actionBar).toBeVisible();
  const bottom = await actionBar.evaluate(element =>
    Math.round(element.getBoundingClientRect().bottom));
  expect(bottom).toBe(800);

  await chooseTheme(page, 'school');
  await expect(page.locator('#nextButton')).toBeEnabled();
  await expect(actionBar).toBeVisible();
});
