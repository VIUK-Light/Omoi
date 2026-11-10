const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const preview = '/preview/omoi-v3/';
const card = JSON.parse(fs.readFileSync(path.join(__dirname, '../level4.json'), 'utf8'))
  .find(item => item.id === 'l4-relationship-002');

async function openReading(page, { reading = 'chunks', diagram = '0' } = {}) {
  const params = new URLSearchParams({ sample: card.id, diagram });
  if (reading !== null) params.set('reading', reading);
  await page.goto(`${preview}warning.html?${params}`);
  await expect(page.getByRole('heading', { name: '話をはじめる前に' })).toBeVisible();
  await expect(page.locator('#questionText')).toHaveCount(0);
  const proceed = page.getByRole('link', { name: '続ける', exact: true });
  const destination = new URL(await proceed.getAttribute('href'), page.url());
  expect(destination.searchParams.get('reading')).toBe(reading);
  await proceed.click();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expect(page.locator('#questionText')).toHaveText(card.question);
  expect(await page.locator('#scenarioText').textContent()).toBe(card.scenario);
  return page.locator('#scenarioReadingToggle');
}

async function sceneGeometry(page) {
  return page.locator('#scenarioText').evaluate(scene => {
    const style = getComputedStyle(scene);
    const rect = scene.getBoundingClientRect();
    const elements = [scene, ...scene.querySelectorAll('.scenario-segment')];
    return {
      text: scene.textContent,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      color: style.color,
      width: rect.width,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      clipped: elements.some(element => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1),
      nestedScrolling: getComputedStyle(document.querySelector('.question-content')).overflowY,
    };
  });
}

test('reading trial entry and comparisons always pass through the warning with the selected card', async ({ page }) => {
  await page.goto(`${preview}preview.html`);
  await page.locator(`#sample-${card.id}`).getByRole('link', { name: '区切った文章を試す', exact: true }).click();
  await expect(page.getByRole('heading', { name: '話をはじめる前に' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('reading')).toBe('chunks');
  expect(new URL(page.url()).searchParams.get('diagram')).toBe('0');
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page.locator('#questionText')).toHaveText(card.question);
  await expect(page.locator('#scenarioReadingToggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#relationDiagramToggle')).toBeHidden();
  await expect(page.locator('#relationDiagram')).toBeHidden();
  for (const id of ['previewDiagramOff', 'previewDiagramOn']) {
    const destination = new URL(await page.locator(`#${id}`).getAttribute('href'), page.url());
    expect(destination.pathname).toBe(`${preview}warning.html`);
    expect(destination.searchParams.get('sample')).toBe(card.id);
    expect(destination.searchParams.has('reading')).toBe(false);
  }
  const readingLink = page.locator('#previewReadingChunks');
  await expect(readingLink).toBeVisible();
  const destination = new URL(await readingLink.getAttribute('href'), page.url());
  expect(destination.pathname).toBe(`${preview}warning.html`);
  expect(destination.searchParams.get('sample')).toBe(card.id);
  expect(destination.searchParams.get('diagram')).toBe('0');
  expect(destination.searchParams.get('reading')).toBe('chunks');
});

test('reading comparison preserves exact source text and changes only spacing, with keyboard switching', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const toggle = await openReading(page);
  const scene = page.locator('#scenarioText');
  await expect(toggle).toHaveAttribute('aria-controls', 'scenarioText');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveText('元の文章に戻す');
  await expect(scene).toHaveAttribute('data-reading', 'chunks');
  await expect(scene.locator('.scenario-segment')).toHaveCount(3);
  expect((await scene.locator('.scenario-segment').allTextContents()).join('')).toBe(card.scenario);
  const chunked = await sceneGeometry(page);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveText('場面文を区切る');
  await expect(scene).toHaveAttribute('data-reading', 'original');
  await expect(scene.locator('.scenario-segment')).toHaveCount(0);
  const original = await sceneGeometry(page);
  for (const key of ['text', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'width']) {
    expect(chunked[key], `Only spacing changes: ${key}`).toBe(original[key]);
  }
  expect(original.text).toBe(card.scenario);
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(scene.locator('.scenario-segment')).toHaveCount(3);
  await expect(page.locator('#questionText')).toHaveText(card.question);
  expect(errors).toEqual([]);
});

test('reading state follows the requested route without leaking to ordinary cards', async ({ page }) => {
  const toggle = await openReading(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#nextQuestionButton').click();
  await expect(page.locator('#questionText')).not.toHaveText(card.question);
  await expect(toggle).toBeHidden();
  await expect(page.locator('.scenario-segment')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/has-reading-trial/);
  await expect(page.locator('#previewReadingChunks')).toBeHidden();
  await page.locator('#previousQuestionButton').click();
  await expect(page.locator('#questionText')).toHaveText(card.question);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.scenario-segment')).toHaveCount(3);
  await toggle.click();
  await page.reload();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('#scenarioText').textContent()).toBe(card.scenario);
});

test('the original baseline remains unchanged without a reading parameter', async ({ page }) => {
  const toggle = await openReading(page, { reading: null });
  await expect(toggle).toBeHidden();
  await expect(page.locator('.scenario-segment')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/has-reading-trial/);
  await expect(page.locator('#relationDiagramToggle')).toBeHidden();
  await expect(page.locator('#relationDiagram')).toBeHidden();
});

test('the original reading variant and existing diagram can be used without changing the question', async ({ page }) => {
  const toggle = await openReading(page, { reading: 'original', diagram: '1' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.scenario-segment')).toHaveCount(0);
  await expect(page.locator('#relationDiagram')).toBeHidden();
  await expect(page.locator('#relationDiagramToggle')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#relationDiagramToggle').click();
  await expect(page.locator('[data-rd-ready="true"]')).toBeVisible();
  await expect(page.locator('[data-node-id]')).toHaveCount(3);
  await toggle.click();
  await expect(page.locator('.scenario-segment')).toHaveCount(3);
  expect(await page.locator('#scenarioText').textContent()).toBe(card.scenario);
  await expect(page.locator('#questionText')).toHaveText(card.question);
});

for (const query of ['reading=other', 'reading=chunks&reading=original']) {
  test(`invalid reading selection is stopped at the warning: ${query}`, async ({ page }) => {
    await page.goto(`${preview}warning.html?sample=${card.id}&diagram=0&${query}`);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('link', { name: '続ける', exact: true })).toHaveCount(0);
    await expect(page.locator('#continueLink')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#questionText')).toHaveCount(0);
  });
}

for (const width of [320, 360, 768, 1280]) {
  for (const zoom of [1, 2]) {
    test(`reading trial fits ${width}px at ${zoom * 100}% zoom in both modes`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const toggle = await openReading(page);
      if (zoom !== 1) await page.evaluate(value => { document.documentElement.style.zoom = String(value); }, zoom);
      for (const mode of ['chunks', 'original']) {
        await expect(page.locator('#scenarioText')).toHaveAttribute('data-reading', mode);
        const geometry = await sceneGeometry(page);
        expect(geometry.text).toBe(card.scenario);
        expect(geometry.overflow).toBe(false);
        expect(geometry.clipped).toBe(false);
        expect(geometry.nestedScrolling).toBe('visible');
        await expect(page.locator('#questionText')).toHaveText(card.question);
        if (mode === 'chunks') await toggle.click();
      }
    });
  }
}
