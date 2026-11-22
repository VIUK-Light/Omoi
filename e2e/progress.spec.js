const { test, expect } = require('@playwright/test');

test.describe.configure({ timeout: 60000 });

const ready = { timeout: 20000 };

test('a normal session keeps its place after a reload instead of becoming a shared question', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

    const firstUrl = new URL(page.url());
    expect(firstUrl.searchParams.get('session')).toBeTruthy();
    expect(firstUrl.searchParams.get('id')).toBeTruthy();

    await page.locator('#nextQuestionButton').click();
    const secondQuestion = await page.locator('#questionText').innerText();

    await page.reload();
    await expect(page.locator('#questionText')).toHaveText(secondQuestion, ready);
    await expect(page.locator('#sharedQuestionNotice')).toBeHidden();
    await expect(page.locator('#nextQuestionButton')).toBeVisible();
    await expect(page.locator('#previousQuestionButton')).toBeEnabled();
});

test('ending mid-way leaves a resume notice on the level screen, not the home screen', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

    await page.locator('#nextQuestionButton').click();
    const question = await page.locator('#questionText').innerText();

    await page.locator('#finishButton').click();
    await page.locator('#confirmFinishButton').click();
    await page.waitForURL('**/index.html');

    await expect(page.locator('#resumeNotice')).toHaveCount(0);

    await page.getByRole('link', { name: 'はじめる', exact: true }).click();
    await page.waitForURL('**/select.html');
    await expect(page.locator('#resumeNotice')).toBeVisible();
    await expect(page.locator('#resumeNotice')).toContainText('前回の続きがあります');
    await expect(page.locator('#resumeNoticeDetail')).toContainText('level:低');
    await expect(page.locator('#resumeNoticeDetail')).toContainText('2問目から');

    await page.locator('#resumeNoticeLink').click();
    await expect(page.locator('#questionText')).toHaveText(question, ready);
    await expect(page.locator('#sharedQuestionNotice')).toBeHidden();
    await expect(page.locator('#nextQuestionButton')).toBeVisible();
});

test('the resume notice is hidden when there is no saved progress', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#resumeNotice')).toHaveCount(0);
    await page.goto('/select.html');
    await expect(page.locator('#resumeNotice')).toBeHidden();
});

test('a shared link still opens as a single shared question', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
    const id = new URL(page.url()).searchParams.get('id');

    await page.goto(`/question.html?level=2&id=${encodeURIComponent(id)}`);
    await expect(page.locator('#sharedQuestionNotice')).toBeVisible(ready);
    await expect(page.locator('#nextQuestionButton')).toBeHidden();
    await expect(page.locator('#finishButton')).toBeHidden();
});

test('changing the category discards the saved progress', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
    await page.locator('#nextQuestionButton').click();

    await page.locator('#changeCategoryLink').click();
    await page.waitForURL('**/select.html');
    await expect(page.locator('#resumeNotice')).toBeHidden();
});

test('the resume notice can be dismissed with the close button', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

    await page.locator('#finishButton').click();
    await page.locator('#confirmFinishButton').click();
    await page.waitForURL('**/index.html');

    await page.goto('/select.html');
    const notice = page.locator('#resumeNotice');
    await expect(notice).toBeVisible();
    await page.locator('#resumeNoticeClose').click();
    await expect(notice).toBeHidden();
    await expect(page.locator('#modeStudent')).toBeFocused();

    await page.reload();
    await expect(page.locator('#resumeNotice')).toBeHidden();
});

test('finishing every question shows a completion screen and can restart', async ({ page }) => {
    await page.goto('/question.html?mode=student&levels=2&count=1');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
    await expect(page.locator('#nextQuestionLabel')).toHaveText('すべての問いを終える');
    const question = (await page.locator('#questionText').innerText()).trim();

    await page.locator('#nextQuestionButton').click();
    await expect(page.locator('#sessionComplete')).toBeVisible();
    await expect(page.locator('#sessionCompleteTitle')).toBeFocused();
    await expect(page).toHaveURL(/\/question\.html/);

    const completedUrl = new URL(page.url());
    expect(completedUrl.searchParams.get('session')).toBeNull();
    expect(completedUrl.searchParams.get('id')).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('omoi-progress'))).toBeNull();

    await page.locator('#restartSessionButton').click();
    await expect(page.locator('#sessionComplete')).toBeHidden();
    await expect(page.locator('#nextQuestionButton')).toBeEnabled();
    await expect(page.locator('#questionText')).toHaveText(question, ready);

    const restartedUrl = new URL(page.url());
    expect(restartedUrl.searchParams.get('session')).toBeTruthy();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('omoi-progress')).index)).toBe(0);
});
