const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const preview = '/preview/omoi-v3/';
const samples = [
  { id: 'relationship-009', level: 4, count: 2, kind: '場面', nodes: [1, 2] },
  { id: 'l4-relationship-002', level: 4, count: 3, kind: '場面', nodes: [3, 3, 3] },
  { id: 'gender-l3-009', level: 3, count: 2, kind: 'ケース', nodes: [2, 2] },
].map(sample => ({
  ...sample,
  card: JSON.parse(fs.readFileSync(path.join(__dirname, `../level${sample.level}.json`), 'utf8')).find(card => card.id === sample.id),
}));

async function openSequence(page, sample) {
  const warning = sample.level === 3 ? 'warning3.html' : 'warning.html';
  await page.goto(`${preview}${warning}?sample=${sample.id}&diagram=1`);
  await expect(page.getByRole('heading', { name: '話をはじめる前に' })).toBeVisible();
  await expect(page.locator('.rd-sequence')).toHaveCount(0);
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expect(page.locator('#questionText')).toHaveText(sample.card.question);
  await expect(page.locator('#relationDiagram')).toBeHidden();
  await page.getByRole('button', { name: '関係図を表示', exact: true }).click();
  const sequence = page.locator('#relationDiagram .rd-sequence');
  await expect(sequence).toHaveAttribute('data-scene-count', String(sample.count));
  await expectScene(sequence, sample, 0);
  return sequence;
}

async function expectScene(sequence, sample, index) {
  await expect(sequence).toHaveAttribute('data-scene-index', String(index));
  await expect(sequence.locator('.rd-scene-position')).toHaveText(`${sample.kind} ${index + 1} / ${sample.count}`);
  await expect(sequence.locator('.rd-scene-previous')).toHaveAttribute('aria-label', `前の${sample.kind}`);
  await expect(sequence.locator('.rd-scene-next')).toHaveAttribute('aria-label', `次の${sample.kind}`);
  if (index === 0) await expect(sequence.locator('.rd-scene-previous')).toBeDisabled();
  else await expect(sequence.locator('.rd-scene-previous')).toBeEnabled();
  if (index === sample.count - 1) await expect(sequence.locator('.rd-scene-next')).toBeDisabled();
  else await expect(sequence.locator('.rd-scene-next')).toBeEnabled();
  await expect(sequence.locator('[data-rd-ready="true"]')).toBeVisible();
  await expect(sequence.locator('[data-node-id]')).toHaveCount(sample.nodes[index]);
  const page = sequence.page();
  await expect(page.locator('#questionText')).toHaveText(sample.card.question);
  if (sample.card.scenario) expect(await page.locator('#scenarioText').textContent()).toBe(sample.card.scenario);
  await expect(sequence.getByRole('link', { name: /原作.*VIUK-Light/ })).toHaveCount(1);
  if (sample.id === 'relationship-009') {
    if (index === 0) {
      await expect(sequence.locator('[data-node-id="partner"]')).toHaveCount(0);
      await expect(sequence.locator('.rd-node-body')).toHaveText(/一度だけ\s*浮気した/);
      await expect(sequence.locator('.rd-edge-label')).toHaveCount(0);
      await expect(sequence.locator('.rd-scene-label')).toHaveText('浮気したあと');
    } else {
      await expect(sequence.locator('[data-node-id="partner"]')).toHaveText('浮気された相手');
      await expect(sequence.locator('.rd-edge-label')).toHaveText('話す？');
      await expect(sequence.locator('.rd-scene-label')).toHaveText('相手に伝えるか');
      const edge = await sequence.locator('.rd-canvas').evaluate(canvas => {
        const edge = canvas._cyreg.cy.edges()[0];
        return { source: edge.data('source'), target: edge.data('target'), arrow: edge.style('target-arrow-shape'), style: edge.style('line-style') };
      });
      expect(edge).toEqual({ source: 'self', target: 'partner', arrow: 'triangle', style: 'dashed' });
    }
    await expect(sequence).not.toContainText('相手は知らない');
    await expect(sequence).not.toContainText('別れた');
  } else if (sample.id === 'l4-relationship-002') {
    if (index === 0) {
      await expect(sequence.locator('[data-node-id="spouse"] .rd-node-body')).toHaveCount(0);
      await expect(sequence.locator('.rd-edge-label[data-edge-id="upbringing"]')).toHaveText(/血縁があると\s*思っていた/);
      await expect(sequence.locator('.rd-scene-label')).toHaveText('育ててきた');
    } else if (index === 1) {
      await expect(sequence.locator('[data-node-id="child"] .rd-node-body')).toHaveText(/配偶者と\s*別の人の子/);
      await expect(sequence.locator('[data-node-id="spouse"] .rd-node-body')).toHaveCount(0);
      await expect(sequence.locator('.rd-edge-label[data-edge-id="upbringing"]')).toContainText('血縁なし');
      await expect(sequence.locator('.rd-scene-label')).toHaveText('血縁がないと分かった');
    } else {
      await expect(sequence.locator('[data-node-id="child"] .rd-node-body')).toHaveText(/配偶者と\s*別の人の子/);
      await expect(sequence.locator('[data-node-id="spouse"] .rd-node-body')).toHaveText('血縁なしを隠した');
      await expect(sequence.locator('.rd-scene-label')).toHaveText('配偶者は前から知っていた');
    }
  } else {
    const sex = index ? '女性' : '男性';
    const prefix = index ? 'female' : 'male';
    const other = index ? 'male' : 'female';
    await expect(sequence.locator('.rd-scene-label')).toHaveText(`${sex}の場合`);
    await expect(sequence.locator('.rd-node-title')).toHaveText(['交際相手', sex]);
    await expect(sequence.locator(`[data-node-id="${other}-victim"]`)).toHaveCount(0);
    await expect(sequence.locator(`[data-node-id="${prefix}-victim"]`)).toHaveText(sex);
    await expect(sequence.locator('.rd-edge-label')).toHaveText('殴る');
    await expect(sequence.locator('.rd-note')).toHaveText('同じけが・性別以外は同じ条件');
    await expect(sequence.locator('.rd-scene-position')).not.toContainText('場面');
  }
}

for (const sample of samples) {
  test(`scene controls advance and return without changing the source card: ${sample.id}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const sequence = await openSequence(page, sample);
    for (let index = 1; index < sample.count; index++) {
      await sequence.locator('.rd-scene-next').click();
      await expectScene(sequence, sample, index);
    }
    for (let index = sample.count - 2; index >= 0; index--) {
      await sequence.locator('.rd-scene-previous').click();
      await expectScene(sequence, sample, index);
    }
    await sequence.locator('.rd-scene-next').focus();
    await page.keyboard.press('Enter');
    await expectScene(sequence, sample, 1);
    await sequence.locator('.rd-scene-previous').focus();
    await page.keyboard.press('Space');
    await expectScene(sequence, sample, 0);
    expect(errors).toEqual([]);
  });

  test(`close, reload and card navigation reset the scene: ${sample.id}`, async ({ page }) => {
    const sequence = await openSequence(page, sample);
    await sequence.locator('.rd-scene-next').click();
    await expectScene(sequence, sample, 1);
    await page.locator('#relationDiagramToggle').click();
    await expect(page.locator('#relationDiagram')).toBeHidden();
    await expect(page.locator('.rd-sequence')).toHaveCount(0);
    await page.locator('#relationDiagramToggle').click();
    await expectScene(sequence, sample, 0);
    await sequence.locator('.rd-scene-next').click();
    await page.locator('#nextQuestionButton').click();
    await expect(page.locator('#relationDiagram')).toBeHidden();
    await expect(page.locator('.rd-sequence')).toHaveCount(0);
    await page.locator('#previousQuestionButton').click();
    await expect(page.locator('#questionText')).toHaveText(sample.card.question);
    await expect(page.locator('#relationDiagram')).toBeHidden();
    await page.locator('#relationDiagramToggle').click();
    await expectScene(sequence, sample, 0);
    await page.reload();
    await expect(page.locator('#nextQuestionButton')).toBeEnabled();
    await expect(page.locator('#relationDiagram')).toBeHidden();
    await page.locator('#relationDiagramToggle').click();
    await expectScene(sequence, sample, 0);
  });
}

for (const width of [320, 360, 768, 1280]) {
  for (const sample of samples) {
    test(`every scene remains inside the page at ${width}px, normal and 200% text: ${sample.id}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const sequence = await openSequence(page, sample);
      for (const enlarged of [false, true]) {
        if (enlarged) {
          await page.addStyleTag({ content: '.rd-node-title {font-size:36px} .rd-node-body,.rd-edge-label,.rd-note,.rd-scene-label {font-size:32px} .rd-scene-position {font-size:28px}' });
          await expect(sequence.locator('.rd-node-title').first()).toHaveCSS('font-size', '36px');
        }
        for (let index = 0; index < sample.count; index++) {
          await expectScene(sequence, sample, index);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const geometry = await sequence.evaluate(host => {
            const surface = host.querySelector('.rd-surface').getBoundingClientRect();
            const elements = [...host.querySelectorAll('.rd-node,.rd-edge-label')];
            const boxes = elements.map(element => ({ node: element, rect: element.getBoundingClientRect() }));
            return {
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
              clipped: elements.some(element => element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2),
              outside: boxes.some(({ rect }) => rect.left < surface.left - 2 || rect.right > surface.right + 2 || rect.top < surface.top - 2 || rect.bottom > surface.bottom + 2),
              overlapping: boxes.some((a, i) => boxes.some((b, j) => j > i && Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left) > 2 && Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top) > 2)),
              navigationOutside: [...host.querySelectorAll('.rd-sequence-navigation button')].some(button => { const rect = button.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1; }),
            };
          });
          expect(geometry).toEqual({ overflow: false, clipped: false, outside: false, overlapping: false, navigationOutside: false });
          if (index < sample.count - 1) await sequence.locator('.rd-scene-next').click();
        }
        if (!enlarged) while (await sequence.locator('.rd-scene-previous').isEnabled()) await sequence.locator('.rd-scene-previous').click();
      }
    });
  }
}

test('generic sequence API validates updates before mutation, resets, destroys and remounts', async ({ page }) => {
  await page.goto('/packages/relation-diagram/demo/index.html');
  const result = await page.evaluate(async () => {
    const { createRelationSequence } = await import('/packages/relation-diagram/sequence.mjs');
    const host = document.createElement('div'); document.body.append(host);
    const graph = title => ({ rootId: 'person', nodes: [{ id: 'person', title, kind: 'person' }], edges: [] });
    const input = { frames: [{ label: '最初', data: graph('一人目'), options: { layout: 'branches', direction: 'right' } }, { label: '次', data: graph('二人目'), options: { layout: 'branches', direction: 'right' } }] };
    const sequence = createRelationSequence(host, input);
    host.querySelector('.rd-scene-next').click();
    const advanced = host.querySelector('.rd-sequence').dataset.sceneIndex;
    const before = host.textContent;
    let rejected = false;
    try { sequence.update({ frames: [{ label: '不正', data: { nodes: [], edges: [] } }] }); } catch { rejected = true; }
    const unchanged = host.textContent === before && host.querySelector('.rd-sequence').dataset.sceneIndex === '1';
    sequence.update({ kind: 'comparison', frames: [{ label: '比較', data: graph('更新した人'), options: { layout: 'branches', direction: 'right' } }] });
    const reset = host.querySelector('.rd-sequence').dataset.sceneIndex;
    const counter = host.querySelector('.rd-scene-position').textContent;
    const caption = host.querySelector('.rd-scene-label').textContent;
    const controlsDisabled = [...host.querySelectorAll('.rd-sequence-navigation button')].every(button => button.disabled);
    sequence.destroy(); sequence.destroy();
    const empty = host.childElementCount === 0;
    let afterDestroyRejected = false; try { sequence.update(input); } catch { afterDestroyRejected = true; }
    const remounted = createRelationSequence(host, input);
    const mountedAgain = host.querySelector('.rd-sequence').dataset.sceneIndex;
    remounted.destroy(); host.remove();
    return { advanced, rejected, unchanged, reset, counter, caption, controlsDisabled, empty, afterDestroyRejected, mountedAgain };
  });
  expect(result).toEqual({ advanced: '1', rejected: true, unchanged: true, reset: '0', counter: 'ケース 1 / 1', caption: '比較', controlsDisabled: true, empty: true, afterDestroyRejected: true, mountedAgain: '0' });
});
