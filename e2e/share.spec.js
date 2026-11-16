const fs = require('fs');
const { test, expect } = require('@playwright/test');

test.describe.configure({ timeout: 60000 });

const ready = { timeout: 20000 };

test('the share button offers a link or a picture of the question', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

    await page.locator('#shareButton').click();
    await expect(page.getByRole('menuitem', { name: 'リンクを共有' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '問いの画像を保存' })).toBeVisible();
    await expect(page.locator('#shareButton')).toHaveAttribute('aria-expanded', 'true');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: '問いの画像を保存' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('omoi-question.png');
    await expect(page.locator('#shareStatus')).toHaveText('画像を保存しました', ready);
    await expect(page.locator('#shareMenu')).toBeHidden();

    const file = fs.readFileSync(await download.path());
    expect(file.subarray(1, 4).toString()).toBe('PNG');
    expect(file.readUInt32BE(16)).toBe(1080);
    expect(file.readUInt32BE(20)).toBe(1620);
});

test('the share menu closes with Escape and keeps the focus on the share button', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

    await page.locator('#shareButton').click();
    await expect(page.locator('#shareMenu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('#shareMenu')).toBeHidden();
    await expect(page.locator('#shareButton')).toBeFocused();
});

test('the card follows the chosen background and theme', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

    const question = {
        level: 3,
        scenario: 'テストの場面文',
        question: 'テストの問い'
    };
    const card = () => page.evaluate(async (value) => (await createQuestionCard(value)).toDataURL(), question);

    const plain = await card();

    await page.locator('.theme-control > summary').click();
    await page.getByRole('button', { name: '朝焼け' }).click();
    await page.waitForTimeout(200);
    const withBackground = await card();
    expect(withBackground).not.toBe(plain);

    await page.getByRole('button', { name: 'VIUK-Light dark' }).click();
    await page.waitForTimeout(200);
    const withDarkTheme = await card();
    expect(withDarkTheme).not.toBe(withBackground);
});

test('the card renders even when the scenario and question are very long', async ({ page }) => {
    await page.goto('/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

    const size = await page.evaluate(async () => {
        const canvas = await createQuestionCard({
            level: 4,
            scenario: 'とても長い場面の説明がここに入ります。'.repeat(12),
            question: 'とても長い問いがここに入りますか？'.repeat(10)
        });
        return canvas ? [canvas.width, canvas.height] : null;
    });

    expect(size).toEqual([1080, 1620]);
});
