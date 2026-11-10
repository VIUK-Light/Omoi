const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const preview = '/preview/omoi-v3/';
const records = Object.fromEntries([3, 4].map(level => [level, JSON.parse(fs.readFileSync(path.join(__dirname, `../level${level}.json`), 'utf8'))]));
const samples = [
  { id: 'relationship-009', level: 4, diagram: true, summary: false },
  { id: 'l4-relationship-002', level: 4, diagram: true },
  { id: 'gender-l3-009', level: 3, diagram: true },
  { id: 'r6-08-02-l4', level: 4, diagram: false },
].map(sample => ({ ...sample, card: records[sample.level].find(card => card.id === sample.id) }));
const ai = samples[3];

async function expectCollapsed(page, { available = true } = {}) {
  await expect(page.locator('#questionSummary')).toBeHidden();
  await expect(page.locator('#questionSummaryText')).toBeEmpty();
  await expect(page.locator('body')).not.toHaveClass(/has-question-summary/);
  const toggle = page.locator('#questionSummaryToggle');
  if (available) {
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('問いの要点を見る');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-controls', 'questionSummary');
    await expect(page.locator('body')).toHaveClass(/has-summary-tool/);
  } else {
    await expect(toggle).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/has-summary-tool/);
  }
}

async function openSummary(page, sample = ai, { summary = '1', diagram = '0', reveal = true } = {}) {
  const query = new URLSearchParams({ sample: sample.id, diagram });
  if (summary !== null) query.set('summary', summary);
  const warning = sample.level === 3 ? 'warning3.html' : 'warning.html';
  await page.goto(`${preview}${warning}?${query}`);
  await expect(page.getByRole('heading', { name: '話をはじめる前に' })).toBeVisible();
  await expect(page.locator('#questionSummary')).toHaveCount(0);
  const proceed = page.getByRole('link', { name: '続ける', exact: true });
  const destination = new URL(await proceed.getAttribute('href'), page.url());
  expect(destination.searchParams.get('summary')).toBe(summary);
  expect(destination.searchParams.get('sample')).toBe(sample.id);
  expect(destination.searchParams.get('level')).toBe(String(sample.level));
  await proceed.click();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expect(page.locator('#questionText')).toHaveText(sample.card.question);
  expect(await page.locator('#scenarioText').textContent()).toBe(sample.card.scenario || '');
  const available = summary === '1' && sample.summary !== false;
  await expectCollapsed(page, { available });
  if (available && reveal) await page.locator('#questionSummaryToggle').click();
  return page.locator('#questionSummary');
}

async function expectedContent(page, card) {
  return page.evaluate(async question => {
    const { getQuestionSummaryContent } = await import('/preview/omoi-v3/question-summary.mjs');
    return getQuestionSummaryContent(question);
  }, card);
}

async function expectContent(page, sample) {
  const section = page.locator('#questionSummary');
  const host = page.locator('#questionSummaryText');
  await expect(section).toBeVisible();
  await expect(section).toHaveAttribute('aria-labelledby', 'questionSummaryHeading');
  await expect(section.getByRole('heading', { name: '問いの要点', exact: true })).toBeVisible();
  await expect(page.locator('#questionSummaryToggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#questionSummaryToggle')).toHaveText('要点を閉じる');
  await expect(page.locator('body')).toHaveClass(/has-question-summary/);
  const blocks = await expectedContent(page, sample.card);
  expect(blocks).toHaveLength(1);
  if (sample.id === ai.id) {
    await expect(host.locator('ul.summary-bullets')).toHaveCount(1);
    await expect(host.locator('li')).toHaveCount(2);
    await expect(host.locator('p')).toHaveCount(0);
    const items = blocks[0].items;
    expect(items.map(item => item.label)).toEqual(['決めること', '考える論点']);
    for (let index = 0; index < items.length; index++) {
      const item = host.locator('li').nth(index);
      await expect(item.locator('strong')).toContainText(items[index].label);
      await expect(item).toContainText(items[index].text);
    }
    await expect(host).not.toContainText('依存を意図的に');
  } else {
    await expect(host.locator('p')).toHaveCount(1);
    await expect(host.locator('p')).toHaveText(blocks[0].text);
  }
  await expect(page.locator('#questionText')).toHaveText(sample.card.question);
  expect(await page.locator('#scenarioText').textContent()).toBe(sample.card.scenario || '');
}

async function summaryGeometry(page) {
  return page.locator('#questionSummary').evaluate(section => {
    const elements = [section, ...section.querySelectorAll('h2, p, ul, li')];
    const text = section.querySelector('li, p');
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      clipped: elements.some(element => element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2),
      outside: elements.some(element => { const box = element.getBoundingClientRect(); return box.left < -1 || box.right > innerWidth + 1; }),
      textFont: parseFloat(getComputedStyle(text).fontSize),
    };
  });
}

for (const sample of samples) {
  const behavior = sample.summary === false ? 'a clear question omits its summary while retaining its diagram' : 'summary starts closed and is shown only on request without replacing its source';
  test(`${behavior}: ${sample.id}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const section = await openSummary(page, sample, { diagram: '1', reveal: false });
    if (sample.summary === false) {
      await expect(page.locator('#previewSummaryOn')).toBeHidden();
      await expect(page.locator('#relationDiagramToggle')).toHaveAttribute('aria-expanded', 'false');
      await page.locator('#relationDiagramToggle').click();
      await expect(page.locator('#relationDiagram')).toBeVisible();
      await expect(page.locator('#relationDiagramToggle')).toHaveAttribute('aria-expanded', 'true');
      await expectCollapsed(page, { available: false });
      await expect(page.locator('#questionText')).toHaveText(sample.card.question);
      expect(await page.locator('#scenarioText').textContent()).toBe(sample.card.scenario || '');
      await expect(page.getByRole('link', { name: 'Omoi / VIUK-Light', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
      return;
    }
    expect(await page.locator('.question-content').evaluate(content => content.contains(document.getElementById('questionSummaryToggle')))).toBe(false);
    expect(await section.evaluate(panel => Boolean(panel.closest('.question-footer')))).toBe(true);
    await page.locator('#questionSummaryToggle').click();
    await expectContent(page, sample);
    await expect(page.locator('#relationDiagram')).toBeHidden();
    if (sample.diagram) await expect(page.locator('#relationDiagramToggle')).toHaveAttribute('aria-expanded', 'false');
    else {
      await expect(page.locator('#relationDiagramToggle')).toBeHidden();
      await expect(page.locator('#previewDiagramOn')).toBeHidden();
    }
    await expect(page.getByRole('link', { name: 'Omoi / VIUK-Light', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('summary disclosure opens by keyboard, clears on close, and Escape returns focus to its button', async ({ page }) => {
  await openSummary(page, ai, { reveal: false });
  const toggle = page.locator('#questionSummaryToggle');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expectContent(page, ai);
  await page.keyboard.press('Space');
  await expectCollapsed(page);
  await page.keyboard.press('Enter');
  await expectContent(page, ai);
  await expect(page.locator('#questionSummaryText li')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expectCollapsed(page);
  await expect(toggle).toBeFocused();
});

test('available summary, conversation hints and background are shown one at a time', async ({ page }) => {
  await openSummary(page);
  await expectContent(page, ai);
  await page.locator('#hintButton').click();
  await expectCollapsed(page);
  await expect(page.locator('#hintsPanel')).toBeVisible();
  await page.locator('#questionSummaryToggle').click();
  await expectContent(page, ai);
  await expect(page.locator('#hintsPanel')).toBeHidden();
  if (ai.card.detail?.text || ai.card.terms?.length) {
    await page.locator('#detailButton').click();
    await expectCollapsed(page);
    await expect(page.locator('#detailPanel')).toBeVisible();
    await page.locator('#questionSummaryToggle').click();
    await expectContent(page, ai);
    await expect(page.locator('#detailPanel')).toBeHidden();
  } else {
    await expect(page.locator('#detailButton')).toBeHidden();
  }
});

test('AI summary entry and footer comparisons retain the warning and selected card, without auto-opening', async ({ page }) => {
  await page.goto(`${preview}preview.html`);
  await page.locator(`#sample-${ai.id}`).getByRole('link', { name: '問いの要点を試す', exact: true }).click();
  await expect(page.getByRole('heading', { name: '話をはじめる前に' })).toBeVisible();
  const warning = new URL(page.url());
  expect(warning.pathname).toBe(`${preview}warning.html`);
  expect(warning.searchParams.get('summary')).toBe('1');
  expect(warning.searchParams.get('diagram')).toBe('0');
  expect(warning.searchParams.get('sample')).toBe(ai.id);
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expectCollapsed(page);
  const enabled = new URL(await page.locator('#previewSummaryOn').getAttribute('href'), page.url());
  expect(enabled.pathname).toBe(`${preview}warning.html`);
  expect(enabled.searchParams.get('summary')).toBe('1');
  expect(enabled.searchParams.get('diagram')).toBe('0');
  expect(enabled.searchParams.get('sample')).toBe(ai.id);
  const baseline = new URL(await page.locator('#previewDiagramOff').getAttribute('href'), page.url());
  expect(baseline.searchParams.has('summary')).toBe(false);
  expect(baseline.searchParams.has('reading')).toBe(false);
  await page.locator('#previewDiagramOff').click();
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expectCollapsed(page, { available: false });
  await expect(page.locator('#questionText')).toHaveText(ai.card.question);
});

for (const summary of [null, '0']) {
  test(`the baseline has no summary control when selection is ${summary === null ? 'absent' : summary}`, async ({ page }) => {
    await openSummary(page, ai, { summary });
    await expectCollapsed(page, { available: false });
    await expect(page.locator('#relationDiagramToggle')).toBeHidden();
  });
}

test('card navigation and reload always reset the helper to closed and never retain old content', async ({ page }) => {
  const ordinary = records[4].find(card => !samples.some(sample => sample.id === card.id));
  const blood = samples[1];
  await page.addInitScript(() => { Math.random = () => .999999; });
  await page.route('**/level4.json', route => route.fulfill({ json: [ai.card, blood.card, ordinary] }));
  await openSummary(page);
  await expectContent(page, ai);
  await page.locator('#nextQuestionButton').click();
  await expect(page.locator('#questionText')).toHaveText(blood.card.question);
  await expectCollapsed(page);
  await page.locator('#questionSummaryToggle').click();
  await expectContent(page, blood);
  await page.locator('#nextQuestionButton').click();
  await expect(page.locator('#questionText')).toHaveText(ordinary.question);
  await expectCollapsed(page, { available: false });
  await page.locator('#previousQuestionButton').click();
  await expectCollapsed(page);
  await page.locator('#questionSummaryToggle').click();
  await expectContent(page, blood);
  await page.locator('#previousQuestionButton').click();
  await expect(page.locator('#questionText')).toHaveText(ai.card.question);
  await expectCollapsed(page);
  await page.locator('#questionSummaryToggle').click();
  await expectContent(page, ai);
  await page.reload();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expectCollapsed(page);
});

for (const field of ['question', 'scenario']) {
  test(`a revised source ${field} hides the outdated helper and its control`, async ({ page }) => {
    const revised = { ...ai.card, [field]: ai.card[field] + '（改訂）' };
    await page.route('**/level4.json', route => route.fulfill({ json: [revised] }));
    const query = new URLSearchParams({ level: '4', sample: ai.id, diagram: '0', summary: '1' });
    await page.goto(`${preview}question.html?${query}`);
    await expect(page.locator('#nextQuestionButton')).toBeEnabled();
    await expect(page.locator('#questionText')).toHaveText(revised.question);
    expect(await page.locator('#scenarioText').textContent()).toBe(revised.scenario);
    await expectCollapsed(page, { available: false });
  });
}

test('a loading failure has no helper, and retry restores only the closed control', async ({ page }) => {
  let fail = true;
  await page.route('**/level4.json', route => fail ? route.fulfill({ status: 503, body: 'Unavailable' }) : route.fulfill({ json: [ai.card] }));
  await page.goto(`${preview}warning.html?sample=${ai.id}&diagram=0&summary=1`);
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page.locator('#retryLoadButton')).toBeVisible();
  await expectCollapsed(page, { available: false });
  fail = false;
  await page.locator('#retryLoadButton').click();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expectCollapsed(page);
  await page.locator('#questionSummaryToggle').click();
  await expectContent(page, ai);
});

for (const query of ['summary=unknown', 'summary=1&summary=0', 'summary=']) {
  test(`invalid summary selection is stopped at the warning: ${query}`, async ({ page }) => {
    await page.goto(`${preview}warning.html?sample=${ai.id}&diagram=0&${query}`);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('link', { name: '続ける', exact: true })).toHaveCount(0);
    await expect(page.locator('#continueLink')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#questionSummary')).toHaveCount(0);
  });
}

for (const width of [320, 360, 768, 1280]) {
  for (const zoom of [1, 2]) {
    test(`requested AI bullets fit ${width}px at ${zoom * 100}% zoom and remain closable`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openSummary(page, ai, { reveal: false });
      if (zoom !== 1) await page.evaluate(value => { document.documentElement.style.zoom = String(value); }, zoom);
      await page.locator('#questionSummaryToggle').click();
      await expectContent(page, ai);
      const geometry = await summaryGeometry(page);
      expect(geometry.overflow).toBe(false);
      expect(geometry.clipped).toBe(false);
      expect(geometry.outside).toBe(false);
      expect(geometry.textFont).toBeGreaterThanOrEqual(16);
      await page.locator('#questionSummaryToggle').click();
      await expectCollapsed(page);
      await page.locator('#nextQuestionButton').click();
      await expect(page.locator('#questionText')).not.toHaveText(ai.card.question);
      await expect(page.locator('#previousQuestionButton')).toBeEnabled();
    });
  }
}

test('summary content renders safe text, bullets, a semantic table, a diagram and an accessible image, then cleans up', async ({ page }) => {
  await page.goto(`${preview}preview.html`);
  await page.evaluate(async () => {
    const { renderSummaryContent } = await import('/preview/omoi-v3/summary-content.mjs');
    const host = document.createElement('div');
    host.id = 'summaryRendererTest';
    host.className = 'question-summary-content';
    host.style.cssText = 'max-width:560px;margin:20px auto;';
    document.body.append(host);
    const literal = '<img src=x onerror="window.summaryInjected=true">';
    window.summaryRendererView = renderSummaryContent(host, [
      { type: 'text', text: literal },
      { type: 'bullets', items: [{ label: '条件', text: '同じ条件を確認する' }] },
      { type: 'table', caption: '二つの予定の比較', columns: ['予定', '時間'], rows: [['相談', '午前'], ['確認', '午後']] },
      { type: 'diagram', data: { nodes: [{ id: 'a', title: '依頼者', kind: 'person' }, { id: 'b', title: '担当者', kind: 'person' }], edges: [{ source: 'a', target: 'b', label: '依頼する', directed: true }] }, options: { layout: 'pairs', interactive: false } },
      { type: 'image', src: '../../omoi-icon.svg', alt: '表示テスト用のOmoiアイコン', caption: '図形の説明' },
    ]);
    window.summaryRendererLiteral = literal;
  });
  const host = page.locator('#summaryRendererTest');
  await expect(host.locator('p').first()).toHaveText('<img src=x onerror="window.summaryInjected=true">');
  await expect(host.locator('ul.summary-bullets li')).toContainText('同じ条件を確認する');
  await expect(host.locator('table caption')).toHaveText('二つの予定の比較');
  await expect(host.locator('thead th')).toHaveText(['予定', '時間']);
  await expect(host.locator('tbody tr')).toHaveCount(2);
  await expect(host.locator('tbody tr').first().locator('td')).toHaveText(['相談', '午前']);
  await expect(host.locator('[data-rd-ready="true"]')).toBeVisible();
  await expect(host.getByRole('link', { name: /原作.*VIUK-Light/ })).toBeVisible();
  await expect(host.getByRole('img', { name: '表示テスト用のOmoiアイコン', exact: true })).toBeVisible();
  await expect(host.locator('img')).toHaveCount(1);
  await expect(host.locator('figcaption')).toHaveText('図形の説明');
  expect(await page.evaluate(() => Boolean(window.summaryInjected))).toBe(false);
  const result = await page.evaluate(async () => {
    const { renderSummaryContent } = await import('/preview/omoi-v3/summary-content.mjs');
    const host = document.getElementById('summaryRendererTest');
    const before = host.textContent;
    let rejected = false;
    try { renderSummaryContent(host, [{ type: 'table', caption: '不正', columns: ['一列'], rows: [['多い', '列']] }]); } catch { rejected = true; }
    const unchanged = host.textContent === before;
    window.summaryRendererView.destroy();
    window.summaryRendererView.destroy();
    const empty = host.childElementCount === 0;
    const remounted = renderSummaryContent(host, [{ type: 'text', text: '再表示' }]);
    const restored = host.textContent === '再表示';
    remounted.destroy();
    const noGraph = host.querySelectorAll('.rd-diagram').length === 0;
    host.remove();
    delete window.summaryRendererView;
    return { rejected, unchanged, empty, restored, noGraph };
  });
  expect(result).toEqual({ rejected: true, unchanged: true, empty: true, restored: true, noGraph: true });
});
