const { test, expect } = require('@playwright/test');

test('home catchcopy cycles through the thought words once per second and ends at Omoi', async ({ page }) => {
  await page.goto('/');

  const word = page.locator('[data-catchcopy-word]');
  const fixedQuotes = await page.evaluate(() => Array.from(
    document.querySelectorAll('.catchcopy__quote'),
    (quote) => {
      const { left, top } = quote.getBoundingClientRect();
      return { left, top };
    }
  ));
  const expectStableSpacing = async () => {
    const layout = await page.evaluate(() => {
      const current = document.querySelector('[data-catchcopy-word]');
      const range = document.createRange();
      range.selectNodeContents(current);
      const word = range.getBoundingClientRect();
      const viewport = document.querySelector('.catchcopy__word').getBoundingClientRect();
      const quotes = Array.from(document.querySelectorAll('.catchcopy__quote'),
        (quote) => quote.getBoundingClientRect());
      const suffix = document.querySelector('.catchcopy__suffix').getBoundingClientRect();
      return {
        openQuoteToWord: viewport.left - quotes[0].right,
        wordCenterOffset: Math.abs((word.left + word.right) / 2 - (viewport.left + viewport.right) / 2),
        closeQuoteToSuffix: suffix.left - quotes[1].right,
        quotePositions: quotes.map((quote) => ({ left: quote.left, top: quote.top })),
        wordBaselineOffset: word.bottom - suffix.bottom
      };
    });
    expect(Math.abs(layout.openQuoteToWord)).toBeLessThan(1);
    expect(layout.wordCenterOffset).toBeLessThan(1);
    expect(Math.abs(layout.closeQuoteToSuffix)).toBeLessThan(1);
    layout.quotePositions.forEach((position, index) => {
      expect(Math.abs(position.left - fixedQuotes[index].left)).toBeLessThan(1);
      expect(Math.abs(position.top - fixedQuotes[index].top)).toBeLessThan(1);
    });
    return layout;
  };
  await expect(word).toHaveText('Omoi');
  const initialLayout = await expectStableSpacing();
  expect(Math.abs(initialLayout.wordBaselineOffset)).toBeLessThan(1);
  const scrollAnimations = page.evaluate(() => {
    const container = document.querySelector('.catchcopy__word');
    return Promise.all(
      ['.catchcopy__word-current', '.catchcopy__word-next'].map((selector) => new Promise((resolve) => {
        container.querySelector(selector).addEventListener(
          'animationstart',
          (event) => resolve(event.animationName),
          { once: true }
        );
      }))
    );
  });

  for (const nextWord of ['重い', '思い', '想い', 'Omoi']) {
    await expect(word).toHaveText(nextWord, { timeout: 2000 });
    await expectStableSpacing();
  }

  await page.waitForTimeout(1100);
  await expect(word).toHaveText('Omoi');
  expect(await scrollAnimations).toEqual(['catchcopy-scroll-out', 'catchcopy-scroll-in']);
});

test('home opens mode selection and moves to level selection', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Omoi/);
  await expect(page.getByRole('heading', { name: 'Omoi', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'はじめる' }).click();

  await expect(page.getByRole('heading', { name: 'どんな話をしたい？' })).toBeVisible();
  const modeNext = page.getByRole('button', { name: '次へ' });
  await expect(modeNext).toBeDisabled();
  await expect(page.locator('input[name="mode"]')).toHaveCount(3);
  await expect(page.locator('input[name="level"]')).toHaveCount(0);
  await page.locator('label[for="modeAll"]').click();
  await expect(modeNext).toBeEnabled();
  await modeNext.click();

  await expect(page).toHaveURL(/\/level-select\.html$/);
  await expect(page.getByRole('heading', { name: '話の深さを選ぶ' })).toBeVisible();
  const levelNext = page.getByRole('button', { name: '次へ' });
  await expect(levelNext).toBeDisabled();
  await expect(page.locator('input[name="level"]')).toHaveCount(4);
  await expect(page.locator('#level1')).toHaveCount(0);
  await expect(page.locator('#levelPickup')).toBeVisible();
  await expect(page.locator('label[for="level2"]')).toContainText('level:低');
  await expect(page.locator('label[for="level3"]')).toContainText('level:中');
  await expect(page.locator('label[for="level4"]')).toContainText('level:高');
  await page.locator('label[for="level2"]').click();
  await expect(levelNext).toBeEnabled();
});

test('theme can follow the device or be set manually across pages', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(22, 24, 27)');

  await page.locator('.theme-control > summary').click();
  await page.getByRole('button', { name: 'ライト' }).click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  await page.goto('/画面/選択/select.html');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  await page.locator('.theme-control > summary').click();
  await page.getByRole('button', { name: '自動' }).click();
  await expect(root).toHaveAttribute('data-theme', 'dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveAttribute('data-theme', 'light');
});
