const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe.configure({ timeout: 60000 });

const ready = { timeout: 20000 };
const pickup = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'データ/ピックアップ/questions.json'), 'utf8'
));
const pickupIds = ['2', '3', '4'].flatMap(level => pickup.levels[level]);

test('the pickup card loads 30 questions and starts in low-to-high order', async ({ page }) => {
    await page.goto('/画面/選択/level-select.html');

    const pickupRadio = page.locator('#levelPickup');
    await expect(pickupRadio).toBeEnabled(ready);
    await expect(page.locator('#pickupSummary')).toContainText('30問');
    await expect(page.locator('#pickupSummary')).toContainText('低10・中10・高10');

    await page.locator('label[for="levelPickup"]').click();
    const next = page.getByRole('button', { name: '次へ' });
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page).toHaveURL(/\/warning\.html\?pickup=1$/);
    await expect(page.locator('#warningDescription')).toContainText('無理に答える必要はありません');
    await page.locator('#continueLink').click();

    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
    await expect(page).toHaveURL(/\/question\.html\?mode=all&pickup=1&/);
    await expect(page.locator('#questionLive')).toHaveText('1問目 / 30問');

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('omoi-progress')));
    expect(saved.pickup).toBe(true);
    expect(saved.level).toBeUndefined();
    expect(saved.ids).toEqual(pickupIds);
    expect(saved.index).toBe(0);

    await page.locator('#nextQuestionButton').click();
    const secondQuestion = await page.locator('#questionText').innerText();
    await expect(page.locator('#questionLive')).toHaveText('2問目 / 30問');

    await page.reload();
    await expect(page.locator('#questionText')).toHaveText(secondQuestion, ready);
    await expect(page.locator('#questionLive')).toHaveText('2問目 / 30問');
    await expect(page.locator('#sharedQuestionNotice')).toBeHidden();
    expect(await page.evaluate(() =>
        JSON.parse(localStorage.getItem('omoi-progress')).pickup
    )).toBe(true);
});

test('a pickup session resumes from the selection screen without a level', async ({ page }) => {
    await page.goto('/画面/対話/question.html?mode=all&pickup=1');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);
    await expect(page.locator('#questionLive')).toHaveText('1問目 / 30問');

    await page.locator('#nextQuestionButton').click();
    const question = await page.locator('#questionText').innerText();

    await page.locator('#finishButton').click();
    await page.locator('#confirmFinishButton').click();
    await page.waitForURL('**/index.html');

    await page.goto('/画面/選択/select.html');
    const notice = page.locator('#resumeNotice');
    await expect(notice).toBeVisible();
    await expect(page.locator('#resumeNoticeDetail')).toContainText('今月のピックアップ質問');
    await expect(page.locator('#resumeNoticeDetail')).toContainText('30問・2問目から');

    await page.locator('#resumeNoticeLink').click();
    await expect(page.locator('#questionText')).toHaveText(question, ready);
    await expect(page.locator('#questionLive')).toHaveText('2問目 / 30問');
    await expect(page.locator('#sharedQuestionNotice')).toBeHidden();

    const url = new URL(page.url());
    expect(url.searchParams.get('pickup')).toBe('1');
    expect(url.searchParams.get('level')).toBeNull();
});

test('the pickup card stays disabled when its data cannot be loaded', async ({ page }) => {
    await page.route(/questions\.json$/, route => route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{}'
    }));
    await page.goto('/画面/選択/level-select.html');

    await expect(page.locator('#levelPickup')).toBeDisabled();
    await expect(page.locator('#pickupSummary')).toContainText('読み込めませんでした');
    await expect(page.getByRole('button', { name: '次へ' })).toBeDisabled();
});

test('a pickup question URL without a session opens as one shared question', async ({ page }) => {
    await page.goto(`/画面/対話/question.html?mode=all&pickup=1&id=${pickupIds[10]}`);
    await expect(page.locator('#sharedQuestionNotice')).toBeVisible(ready);
    await expect(page.locator('#questionText')).not.toHaveText(/条件が正しくありません/);
    await expect(page.locator('#nextQuestionButton')).toBeHidden();
    await expect(page.locator('#finishButton')).toBeHidden();
    await expect(page.locator('#questionLive')).toHaveText('1問目 / 1問');

    const url = new URL(page.url());
    expect(url.searchParams.get('level')).toBe('3');
    expect(url.searchParams.get('pickup')).toBeNull();
});
