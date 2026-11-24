const { test, expect } = require('@playwright/test');

test.describe.configure({ timeout: 60000 });

const ready = { timeout: 20000 };

test('reading prefers a high quality Japanese voice and keeps an explicit choice', async ({ page }) => {
    await page.goto('/画面/対話/question.html?level=2');
    await expect(page.locator('#nextQuestionButton')).toBeEnabled(ready);

    const automatic = await page.evaluate(() => {
        const voices = [
            { name: 'Kyoko', voiceURI: 'Kyoko', lang: 'ja-JP', localService: true },
            { name: 'Google 日本語', voiceURI: 'Google 日本語', lang: 'ja-JP', localService: false },
            { name: 'Samantha', voiceURI: 'Samantha', lang: 'en-US', localService: true }
        ];
        return window.chooseJapaneseVoice(voices)?.name;
    });
    expect(automatic).toBe('Google 日本語');

    const explicit = await page.evaluate(() => {
        const voices = [
            { name: 'Kyoko', voiceURI: 'Kyoko', lang: 'ja-JP', localService: true },
            { name: 'Google 日本語', voiceURI: 'Google 日本語', lang: 'ja-JP', localService: false }
        ];
        return window.chooseJapaneseVoice(voices, 'Kyoko')?.name;
    });
    expect(explicit).toBe('Kyoko');
});
