const { test, expect } = require('@playwright/test');

test.describe.configure({ timeout: 60000 });

const ready = { timeout: 20000 };

const palettes = [
    { name: 'ライト', theme: 'light', page: 'rgb(255, 255, 255)' },
    { name: 'ダーク', theme: 'dark', page: 'rgb(22, 24, 27)' },
    { name: 'セピア', theme: 'sepia', page: 'rgb(247, 241, 228)' },
    { name: 'ナイト', theme: 'night', page: 'rgb(16, 21, 31)' },
    { name: 'VIUK-Light', theme: 'viuk', page: 'rgb(250, 249, 246)' },
    { name: 'VIUK-Light dark', theme: 'viuk-dark', page: 'rgb(23, 23, 21)' }
];

function parseColor(value) {
    const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
        const digits = hex[1].length === 3
            ? hex[1].split('').map((digit) => digit + digit).join('')
            : hex[1];
        return [0, 2, 4].map((index) => Number.parseInt(digits.slice(index, index + 2), 16));
    }
    return value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
}

function relativeLuminance(color) {
    const [red, green, blue] = parseColor(color).map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
    const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
    const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
    return (lighter + 0.05) / (darker + 0.05);
}

async function readPalette(page) {
    return page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        const read = (name) => styles.getPropertyValue(name).trim();
        return {
            page: read('--omoi-page'),
            ink: read('--omoi-ink'),
            muted: read('--omoi-muted'),
            link: read('--omoi-link'),
            primary: read('--omoi-primary'),
            onPrimary: read('--omoi-on-primary')
        };
    });
}

test('display settings extend the theme and stay on the device', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/画面/対話/question.html?level=2');
    await expect(page.locator('.theme-control')).toBeAttached(ready);

    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-background', 'star', ready);
    await page.locator('.theme-control > summary').click();

    await expect(page.getByRole('button', { name: 'セピア' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ナイト' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'VIUK-Light', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'クリスマス' })).toBeVisible();
    await expect(page.getByRole('button', { name: '星空' })).toHaveAttribute('aria-pressed', 'true', ready);

    await page.getByRole('button', { name: 'セピア' }).click();
    await expect(root).toHaveAttribute('data-theme', 'sepia', ready);
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(247, 241, 228)', ready);
    await expect(page.getByRole('button', { name: 'セピア' })).toHaveAttribute('aria-pressed', 'true', ready);

    await page.getByRole('button', { name: '桜' }).click();
    await expect(root).toHaveAttribute('data-background', 'sakura', ready);

    await page.reload();
    await expect(root).toHaveAttribute('data-theme', 'sepia', ready);
    await expect(root).toHaveAttribute('data-background', 'sakura', ready);
});

test('the chosen theme and background follow across every page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('.theme-control')).toBeAttached(ready);

    await page.locator('.theme-control > summary').click();
    await page.getByRole('button', { name: 'ナイト' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night', ready);

    await page.goto('/画面/選択/select.html');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night', ready);
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(16, 21, 31)', ready);

    await page.goto('/画面/対話/question.html?level=2');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night', ready);
    await expect(page.locator('html')).toHaveAttribute('data-background', 'star', ready);
});

test('every page offers the same display settings', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.theme-control')).toBeAttached(ready);
    await page.locator('.theme-control > summary').click();

    await expect(page.getByRole('button', { name: '自動' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ライト' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ダーク' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'セピア' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ナイト' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'VIUK-Light', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '紅葉' })).toBeVisible();
});

test('background strength can be adjusted and is kept on the device', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/画面/対話/question.html?level=2');
    await expect(page.locator('.theme-control')).toBeAttached(ready);

    await page.locator('.theme-control > summary').click();
    await page.getByRole('button', { name: '花火' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-background', 'hanabi', ready);

    const scrim = page.locator('#themeScrimRange');
    await expect(scrim).toBeVisible(ready);
    await scrim.evaluate((element) => {
        element.value = '20';
        element.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('html')).toHaveCSS('--omoi-scrim-opacity', '0.8', ready);

    await page.reload();
    await expect(page.locator('html')).toHaveCSS('--omoi-scrim-opacity', '0.8', ready);
});

test('reset restores the default display settings', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/画面/対話/question.html?level=2');
    await expect(page.locator('.theme-control')).toBeAttached(ready);

    await page.locator('.theme-control > summary').click();
    await page.getByRole('button', { name: 'ナイト' }).click();
    await page.getByRole('button', { name: '桜' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night', ready);

    await page.getByRole('button', { name: '表示設定を初期化' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light', ready);
    await expect(page.locator('html')).toHaveAttribute('data-background', 'star', ready);
});

test('the setting kept under the old key is carried over', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => window.localStorage.setItem('omoi-theme', 'dark'));
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark', ready);
    await page.locator('.theme-control > summary').click();
    await page.getByRole('button', { name: '表示設定を初期化' }).click();

    const stored = await page.evaluate(() => ({
        legacy: window.localStorage.getItem('omoi-theme'),
        display: window.localStorage.getItem('omoi-display')
    }));
    expect(stored.legacy).toBeNull();
    expect(stored.display).toBeNull();
});

test('every palette keeps readable contrast', async ({ page }) => {
    await page.goto('/画面/対話/question.html?level=2');
    await expect(page.locator('.theme-control')).toBeAttached(ready);

    for (const palette of palettes) {
        await page.evaluate((theme) => {
            document.documentElement.dataset.theme = theme;
        }, palette.theme);

        const colors = await readPalette(page);
        expect(contrastRatio(colors.ink, colors.page), `${palette.name} 本文`).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(colors.muted, colors.page), `${palette.name} 補助文字`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.link, colors.page), `${palette.name} リンク`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.onPrimary, colors.primary), `${palette.name} ボタン`).toBeGreaterThanOrEqual(4.5);
    }
});

test('backgrounds stay readable in every theme even at full strength', async ({ page }) => {
    await page.goto('/画面/対話/question.html?level=2');
    await expect(page.locator('.theme-control')).toBeAttached(ready);

    const backgroundIds = await page.evaluate(() => Array.from(document.querySelectorAll('[data-theme-background]'))
        .map((button) => button.dataset.themeBackground)
        .filter((id) => id !== 'none'));

    for (const palette of palettes) {
        await page.evaluate((theme) => {
            document.documentElement.dataset.theme = theme;
        }, palette.theme);
        const ink = await page.evaluate(() => getComputedStyle(document.documentElement)
            .getPropertyValue('--omoi-ink').trim());

        for (const background of backgroundIds) {
            const base = await page.evaluate((id) => getComputedStyle(document.documentElement)
                .getPropertyValue(`--omoi-bg-${id}-base`).trim(), background);
            expect(base, `${palette.name} ${background}`).not.toBe('');
            expect(contrastRatio(ink, base), `${palette.name} ${background}`).toBeGreaterThanOrEqual(4.5);
        }
    }
});

test('the display settings offer every theme and background', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.theme-control')).toBeAttached(ready);
    await page.locator('.theme-control > summary').click();

    const themes = await page.evaluate(() => Array.from(document.querySelectorAll('[data-theme-mode]'))
        .map((button) => button.dataset.themeMode));
    const backgrounds = await page.evaluate(() => Array.from(document.querySelectorAll('[data-theme-background]'))
        .map((button) => button.dataset.themeBackground));

    expect(themes).toEqual(['auto', 'light', 'dark', 'sepia', 'night', 'viuk', 'viuk-dark']);
    expect(backgrounds).toEqual(['none', 'star', 'christmas', 'sakura', 'momiji', 'hanabi']);

    await expect(page.getByRole('button', { name: 'VIUK-Light dark' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'クリスマス' })).toBeVisible();
    await expect(page.getByRole('button', { name: '桜' })).toBeVisible();
    await expect(page.getByRole('button', { name: '紅葉' })).toBeVisible();
    await expect(page.getByRole('button', { name: '花火' })).toBeVisible();
    await expect(page.getByRole('button', { name: '星空' })).toBeVisible();
});
