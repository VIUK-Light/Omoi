const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const preview = '/preview/omoi-v3/';
const card = JSON.parse(fs.readFileSync(path.join(__dirname, '../level4.json'), 'utf8'))
  .find(item => item.id === 'l4-relationship-002');

test('comparison entry exposes text experiments without retired diagram links', async ({ page }) => {
  await page.goto(`${preview}preview.html`);
  await expect(page).toHaveTitle(/Omoi v3/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.preview-entry__sample')).toHaveCount(4);
  await expect(page.getByRole('link', { name: '問いの要点を試す', exact: true })).toHaveCount(3);
  await expect(page.getByRole('link', { name: '区切った文章を試す', exact: true })).toBeVisible();
  await expect(page.locator('a[href*="diagram"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /関係図/ })).toHaveCount(0);
});

for (const retired of ['diagram=1', 'diagram=0&diagram=1']) {
  test(`a retired diagram bookmark keeps the warning and text helpers: ${retired}`, async ({ page }) => {
    const errors = [], graphRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/relation-diagram|cytoscape/i.test(request.url())) graphRequests.push(request.url());
    });
    await page.goto(`${preview}warning.html?sample=${card.id}&reading=chunks&summary=1&${retired}`);
    await expect(page.getByRole('heading', { name: '話をはじめる前に' })).toBeVisible();
    const proceed = page.getByRole('link', { name: '続ける', exact: true });
    expect(new URL(await proceed.getAttribute('href'), page.url()).searchParams.has('diagram')).toBe(false);
    await proceed.click();
    await expect(page.locator('#nextQuestionButton')).toBeEnabled();
    await expect(page.locator('#questionText')).toHaveText(card.question);
    expect(await page.locator('#scenarioText').textContent()).toBe(card.scenario);
    await expect(page.locator('.scenario-segment')).toHaveCount(3);
    await expect(page.locator('#questionSummary')).toBeHidden();
    await page.locator('#questionSummaryToggle').click();
    await expect(page.locator('#questionSummary')).toBeVisible();
    await page.locator('#scenarioReadingToggle').click();
    await expect(page.locator('.scenario-segment')).toHaveCount(0);
    await expect(page.locator('#questionText')).toHaveText(card.question);
    await expect(page.locator('#relationDiagram, #relationDiagramToggle, #previewDiagramOn')).toHaveCount(0);
    await expect(page.locator('a[href*="diagram"]')).toHaveCount(0);
    expect(graphRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('copied home, selection, warning and finish remain inside the text preview', async ({ page }) => {
  await page.goto(`${preview}index.html`);
  await page.getByRole('link', { name: 'はじめる', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${preview}select.html`));
  await page.getByText('人生に関わる難しい選択', { exact: true }).click();
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${preview}warning.html`));
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await page.locator('#finishButton').click();
  await expect(page.locator('#finishConfirmDialog')).toBeVisible();
  await page.locator('#cancelFinishButton').click();
  await expect(page.locator('#finishConfirmDialog')).not.toBeVisible();
  await page.locator('#finishButton').click();
  await page.locator('#confirmFinishButton').click();
  await expect(page).toHaveURL(new RegExp(`${preview}index.html`));
});
