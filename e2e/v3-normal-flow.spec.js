const { test, expect } = require('@playwright/test');

const completeCard = {
  id: 'normal-v3-helper', level: 3,
  question: 'この条件で機能を増やす？', scenario: '条件をそろえた架空の場面。',
  summary: [{ type: 'bullets', items: [{ label: '決めること', text: '<img src=x onerror=alert(1)>という文字も、そのまま読める。' }] }],
  hints: ['別の立場では、何を確かめたい？'],
  terms: [{ term: '用語', definition: '必要な言葉の意味。' }],
  detail: { text: '確認した説明。', sources: [{ title: '出典', url: 'https://example.test/source' }] }
};

async function keepOrder(page) {
  await page.addInitScript(() => { Math.random = () => .999999; });
}

test('normal warning flow offers optional helpers without preview queries or diagram code', async ({ page }) => {
  const requests = [], errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await keepOrder(page);
  await page.route('**/level3.json', route => route.fulfill({ json: [completeCard, { id: 'normal-v3-simple', level: 3, question: '短い問いだけでも話せる？' }] }));
  await page.goto('/');
  await page.getByRole('link', { name: 'はじめる', exact: true }).click();
  await page.locator('label[for="level3"]').click();
  await page.locator('#nextButton').click();
  await expect(page).toHaveURL(/\/warning3\.html$/);
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page).toHaveURL(/\/question\.html\?level=3$/);
  await expect(page.locator('#questionText')).toHaveText(completeCard.question);
  await expect(page.locator('#scenarioText')).toHaveText(completeCard.scenario);
  for (const id of ['questionSummary', 'hintsPanel', 'detailPanel']) await expect(page.locator(`#${id}`)).toBeHidden();
  await page.locator('#questionSummaryToggle').click();
  await expect(page.locator('#questionSummary')).toBeVisible();
  await expect(page.locator('#questionSummaryText')).toContainText(completeCard.summary[0].items[0].text);
  await expect(page.locator('#questionSummaryText img')).toHaveCount(0);
  await page.locator('#hintButton').click();
  await expect(page.locator('#questionSummary')).toBeHidden();
  await expect(page.locator('#hintsPanel')).toBeVisible();
  await page.locator('#detailButton').click();
  await expect(page.locator('#hintsPanel')).toBeHidden();
  await expect(page.locator('#detailPanel')).toBeVisible();
  await expect(page.locator('#sourceList a')).toHaveAttribute('href', completeCard.detail.sources[0].url);
  await page.locator('#questionSummaryToggle').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#questionSummary')).toBeHidden();
  await expect(page.locator('#questionSummaryToggle')).toBeFocused();
  await page.locator('#nextQuestionButton').click();
  for (const id of ['questionSummaryToggle', 'hintButton', 'detailButton']) await expect(page.locator(`#${id}`)).toBeHidden();
  await page.locator('#previousQuestionButton').click();
  await expect(page.locator('#questionSummaryToggle')).toBeVisible();
  await expect(page.locator('#questionSummary')).toBeHidden();
  await page.reload();
  await expect(page.locator('#questionSummaryToggle')).toBeVisible();
  await expect(page.locator('#questionSummary')).toBeHidden();
  expect(requests.filter(url => /cytoscape|\/packages\/relation-diagram\/|\/preview\//.test(url))).toEqual([]);
  await expect(page.locator('.preview-review, #relationDiagramToggle, #scenarioReadingToggle')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const level of [2]) {
  test(`Level ${level} never offers helpers even if unexpected data includes them`, async ({ page }) => {
    await page.route(`**/level${level}.json`, route => route.fulfill({ json: [{ ...completeCard, level }] }));
    await page.goto(`/question.html?level=${level}`);
    await expect(page.locator('#questionText')).toHaveText(completeCard.question);
    for (const id of ['questionSummaryToggle', 'hintButton', 'detailButton']) await expect(page.locator(`#${id}`)).toBeHidden();
    await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  });
}

test('terms-only background and hints-only questions do not require a detail explanation', async ({ page }) => {
  await keepOrder(page);
  await page.route('**/level4.json', route => route.fulfill({ json: [
    { id: 'terms-only', level: 4, question: '言葉を確認して話す？', terms: completeCard.terms },
    { id: 'hints-only', level: 4, question: '別の見方も考える？', hints: completeCard.hints }
  ] }));
  await page.goto('/warning.html');
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page.locator('#detailButton')).toBeVisible();
  await expect(page.locator('#hintButton')).toBeHidden();
  await page.locator('#detailButton').click();
  await expect(page.locator('#termsList')).toContainText('必要な言葉の意味。');
  await expect(page.locator('#sourceSection')).toBeHidden();
  await expect(page.locator('#detailText')).toBeEmpty();
  await page.locator('#nextQuestionButton').click();
  await expect(page.locator('#detailButton')).toBeHidden();
  await expect(page.locator('#hintButton')).toBeVisible();
  await page.locator('#hintButton').click();
  await expect(page.locator('#hintsPanel')).toBeVisible();
});

for (const prefix of ['/', '/preview/omoi-v3/']) {
  test(`retired Level 1 is rejected before fetching and returns to active selection: ${prefix}`, async ({ page }) => {
    const datasetRequests = [];
    page.on('request', request => {
      if (/\/level[0-9]+\.json(?:\?|$)/.test(request.url())) datasetRequests.push(request.url());
    });
    await page.goto(`${prefix}question.html?level=1`);
    await expect(page.locator('#questionText')).toContainText('条件が正しくありません');
    await expect(page.locator('#nextQuestionButton')).toBeDisabled();
    await expect(page.locator('#retryLoadButton')).toBeHidden();
    expect(datasetRequests).toEqual([]);
    await page.locator('.back-link').click();
    await expect(page).toHaveURL(new RegExp(`${prefix}select.html`));
    expect(await page.locator('input[name="level"]').evaluateAll(inputs => inputs.map(input => input.value))).toEqual(['2', '3', '4']);
  });
}
