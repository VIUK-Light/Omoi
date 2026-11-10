const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const preview = '/preview/omoi-v3/';
const cases = [
  { id: 'relationship-009', level: 4, nodeCount: 2 },
  { id: 'l4-relationship-002', level: 4, nodeCount: 3 },
  { id: 'gender-l3-009', level: 3, nodeCount: 2 },
].map(sample => ({
  ...sample,
  card: JSON.parse(fs.readFileSync(path.join(__dirname, `../level${sample.level}.json`), 'utf8'))
    .find(card => card.id === sample.id),
}));

async function advanceToFinalScene(host) {
  const next = host.locator('.rd-scene-next');
  await expect(next).toBeVisible();
  while (await next.isEnabled()) await next.click();
  await expect(host.locator('[data-rd-ready="true"]')).toBeVisible();
}

async function openSample(page, sample, diagram = '1', { reveal = true, finalScene = true } = {}) {
  const warning = sample.level === 3 ? 'warning3.html' : 'warning.html';
  const mode = diagram === null ? '' : `&diagram=${diagram}`;
  await page.goto(`${preview}${warning}?sample=${sample.id}${mode}`);
  await expect(page.getByRole('heading', { name: '話をはじめる前に' })).toBeVisible();
  await page.getByRole('link', { name: '続ける', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`question\\.html\\?.*level=${sample.level}`));
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expect(page.locator('#questionText')).toHaveText(sample.card.question);
  const host = page.locator('#relationDiagram');
  const toggle = page.locator('#relationDiagramToggle');
  await expect(host).toBeHidden();
  if (diagram === '0') {
    await expect(toggle).toBeHidden();
  } else {
    await expect(toggle).toHaveText('関係図を表示');
    await expect(toggle).toHaveAttribute('aria-controls', 'relationDiagram');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    if (reveal) {
      await toggle.click();
      await expect(host).toBeVisible();
      await expect(toggle).toHaveText('関係図を閉じる');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      if (finalScene) await advanceToFinalScene(host);
    }
  }
  return host;
}

async function expectCanvasTextStyle(diagram, opacity, expectedArrows = {}, expectedLineStyles = {}) {
  await expect(diagram.locator('[data-rd-ready="true"]')).toBeVisible();
  let rendered;
  await expect.poll(async () => {
    // Inspect the vendored renderer only in tests: duplicate canvas text is not in the HTML DOM.
    rendered = await diagram.locator('.rd-canvas').evaluate(canvas => canvas._cyreg?.cy?.edges().map(edge => ({
      id: edge.id(),
      textOpacity: Number(edge.style('text-opacity')),
      backgroundOpacity: Number(edge.style('text-background-opacity')),
      directed: edge.data('directed'),
      arrow: edge.style('target-arrow-shape'),
      lineStyle: edge.style('line-style'),
    })) || []);
    return [...new Set(rendered.map(edge => `${edge.textOpacity}/${edge.backgroundOpacity}`))];
  }, { message: `Canvas edge text and backgrounds have opacity ${opacity}` }).toEqual([`${opacity}/${opacity}`]);
  for (const edge of rendered) expect(edge.arrow, `${edge.id} retains its arrow style`).toBe(edge.directed ? 'triangle' : 'none');
  for (const [id, arrow] of Object.entries(expectedArrows)) expect(rendered.find(edge => edge.id === id)).toMatchObject({ id, arrow });
  for (const [id, lineStyle] of Object.entries(expectedLineStyles)) expect(rendered.find(edge => edge.id === id)).toMatchObject({ id, lineStyle });
}

async function expectPairContent(diagram, sample) {
  await expect(diagram.locator('.rd-diagram')).toHaveAttribute('data-layout', 'pairs');
  await expect(diagram.locator('[data-node-id]')).toHaveCount(sample.nodeCount);
  await expect(diagram.locator('.rd-heading')).toBeHidden();
  await expect(diagram.locator('.rd-node-caption')).toHaveCount(0);
  if (sample.id === 'relationship-009') {
    await expect(diagram.locator('[data-node-id="self"] .rd-node-title')).toHaveText('自分');
    await expect(diagram.locator('[data-node-id="self"] .rd-node-body')).toHaveText(/一度だけ\s*浮気した/);
    await expect(diagram.locator('[data-node-id="partner"]')).toHaveText('浮気された相手');
    await expect(diagram.locator('.rd-node-body')).toHaveCount(1);
    await expect(diagram.locator('.rd-note')).toBeHidden();
    await expect(diagram.locator('.rd-edge-label[data-edge-id="disclosure"]')).toHaveText('話す？');
    await expect(diagram.locator('.rd-edge-label')).toHaveCount(1);
    await expect(diagram).not.toContainText('相手に話すか、話さないか。');
    await expect(diagram).not.toContainText('自分が相手の立場なら');
    await expect(diagram).not.toContainText('何をどう伝えるか');
    await expectCanvasTextStyle(diagram, 0, { disclosure: 'triangle' }, { disclosure: 'dashed' });
  } else {
    await expect(diagram.locator('[data-node-id="male-partner"]')).toHaveCount(0);
    await expect(diagram.locator('[data-node-id="female-partner"]')).toHaveText('交際相手');
    await expect(diagram.locator('[data-node-id="male-victim"]')).toHaveCount(0);
    await expect(diagram.locator('[data-node-id="female-victim"]')).toHaveText('女性');
    await expect(diagram.locator('.rd-node-body')).toHaveCount(0);
    await expect(diagram.locator('.rd-note')).toHaveText('同じけが・性別以外は同じ条件');
    await expect(diagram.locator('.rd-edge-label')).toHaveCount(1);
    await expect(diagram.locator('.rd-edge-label[data-edge-id="male-violence"]')).toHaveCount(0);
    await expect(diagram.locator('.rd-edge-label[data-edge-id="female-violence"]')).toHaveText('殴る');
    await expect(diagram).not.toContainText('どんな点がそう感じさせるか');
    await expect(diagram).not.toContainText('「被害者らしさ」をどう感じるか');
    await expectCanvasTextStyle(diagram, 0, { 'female-violence': 'triangle' }, { 'female-violence': 'solid' });
  }
  for (const label of await diagram.locator('.rd-edge-label').all()) {
    await expect(label).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
}

async function expectPairsFit(diagram, scale = 1) {
  await expect(diagram.locator('[data-rd-ready="true"]')).toBeVisible();
  await diagram.page().evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const geometry = await diagram.evaluate(host => {
    const surface = host.querySelector('.rd-surface').getBoundingClientRect();
    const elements = [...host.querySelectorAll('[data-node-id], .rd-edge-label')];
    const boxes = elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { id: element.dataset.nodeId || element.dataset.edgeId, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    const byId = new Map(boxes.map(box => [box.id, box]));
    const rows = [...host.querySelectorAll('.rd-edge-label')].map(label => {
      const source = byId.get(label.dataset.source), target = byId.get(label.dataset.target);
      return { id: label.dataset.edgeId, source, target, label: byId.get(label.dataset.edgeId), lineY: (source.top + source.bottom) / 2 };
    });
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      clipped: elements.some(element => element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2),
      outside: boxes.filter(box => box.left < surface.left - 1 || box.right > surface.right + 1 || box.top < surface.top - 1 || box.bottom > surface.bottom + 1).map(box => box.id),
      clearance: Math.min(...boxes.flatMap((a, i) => boxes.slice(i + 1).map(b => Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom)))),
      lineClearances: rows.flatMap(row => rows.map(other => {
        const left = (other.source.left + other.source.right) / 2;
        const right = (other.target.left + other.target.right) / 2;
        const dx = Math.max(left - row.label.right, row.label.left - right, 0);
        const dy = Math.max(row.label.top - other.lineY, other.lineY - row.label.bottom, 0);
        return { label: row.id, line: other.id, distance: Math.hypot(dx, dy) };
      })),
      surfaceWidth: surface.width,
      nodeWidths: [...host.querySelectorAll('[data-node-id]')].map(node => node.getBoundingClientRect().width),
      rows,
    };
  });
  expect(geometry.overflow).toBe(false);
  expect(geometry.clipped).toBe(false);
  expect(geometry.outside).toEqual([]);
  expect(geometry.surfaceWidth).toBeLessThanOrEqual(640 * scale);
  expect(geometry.nodeWidths.every(width => width <= 120 * scale)).toBe(true);
  expect(geometry.clearance).toBeGreaterThanOrEqual(16 * scale);
  for (const result of geometry.lineClearances) expect(result.distance, `${result.label} stays away from ${result.line}`).toBeGreaterThanOrEqual(8 * scale);
  for (const [index, row] of geometry.rows.entries()) {
    expect(row.source.right).toBeLessThan(row.target.left);
    expect(Math.abs((row.source.top + row.source.bottom) / 2 - (row.target.top + row.target.bottom) / 2)).toBeLessThan(1);
    expect(row.label.top).toBeGreaterThanOrEqual(row.lineY + 8 * scale);
    expect(Math.abs((row.label.left + row.label.right) / 2 - (row.source.left + row.source.right + row.target.left + row.target.right) / 4)).toBeLessThan(1);
    if (index) {
      const previous = geometry.rows[index - 1];
      expect(Math.min(row.source.top, row.target.top, row.label.top)).toBeGreaterThanOrEqual(Math.max(previous.source.bottom, previous.target.bottom, previous.label.bottom) + 16 * scale);
    }
  }
}

async function expectKinshipGraph(diagram) {
  await expect(diagram.locator('.rd-diagram')).toHaveAttribute('data-layout', 'branches');
  await expect(diagram.locator('.rd-diagram')).toHaveAttribute('data-direction', 'right');
  await expect(diagram.locator('[data-node-id]')).toHaveCount(3);
  await expect(diagram.locator('[data-node-id="spouse"] .rd-node-title')).toHaveText('配偶者');
  await expect(diagram.locator('[data-node-id="spouse"] .rd-node-body')).toHaveText('血縁なしを隠した');
  await expect(diagram.locator('[data-node-id="self"]')).toHaveText('自分');
  await expect(diagram.locator('[data-node-id="child"] .rd-node-title')).toHaveText('子ども');
  await expect(diagram.locator('[data-node-id="child"] .rd-node-body')).toHaveText(/配偶者と\s*別の人の子/);
  await expect(diagram.locator('.rd-node-caption')).toHaveCount(0);
  await expect(diagram.locator('.rd-node-body')).toHaveCount(2);
  await expect(diagram.locator('.rd-node--root')).toHaveCount(1);
  await expect(diagram.locator('[data-node-id="self"]')).toHaveClass(/\brd-node--root\b/);
  await expect.poll(async () => {
    const backgrounds = await diagram.locator('[data-node-id]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.nodeId, getComputedStyle(node).backgroundColor])));
    return backgrounds.self !== backgrounds.spouse && backgrounds.self !== backgrounds.child && backgrounds.spouse === backgrounds.child;
  }, { message: 'Only the self card has the root background' }).toBe(true);
  await expect(diagram.locator('.rd-heading')).toBeHidden();
  await expect(diagram.locator('.rd-note')).toBeHidden();
  const concealment = diagram.locator('.rd-edge-label[data-edge-id="concealment"]');
  await expect(concealment).toHaveCount(0);
  const upbringing = diagram.locator('.rd-edge-label[data-edge-id="upbringing"]');
  await expect(upbringing).toBeVisible();
  await expect(upbringing).toHaveAttribute('data-source', 'self');
  await expect(upbringing).toHaveAttribute('data-target', 'child');
  await expect(upbringing).toHaveText(/育ててきた\s+血縁なし/);
  await expect(upbringing).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(diagram.locator('.rd-edge-label')).toHaveCount(1);
  await expect(diagram).not.toContainText('重く見るもの');
  await expect(diagram).not.toContainText('血縁と配偶者への信頼');
  await expect(diagram).not.toContainText('子どもと築いた関係');
  await expect(diagram).not.toContainText('どう受け止めるか');
  await expectCanvasTextStyle(diagram, 0, { concealment: 'none', upbringing: 'none' });
}

async function expectDiagramContentFits(diagram, { rootId = 'self', upperId = 'spouse', lowerId = 'child', scale = 1 } = {}) {
  await expect(diagram.locator('[data-rd-ready="true"]')).toBeVisible();
  // ResizeObserver and canvas/HTML synchronization take separate animation frames.
  await diagram.page().evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const geometry = await diagram.evaluate((host, ids) => {
    const surface = host.querySelector('.rd-surface').getBoundingClientRect();
    const elements = [...host.querySelectorAll('[data-node-id], .rd-edge-label')];
    const boxes = elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { id: element.dataset.nodeId || element.dataset.edgeId, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    const byId = new Map(boxes.map(box => [box.id, box]));
    const center = box => ({ x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 });
    const intersects = (a, b, box) => {
      let start = 0, end = 1;
      for (const [axis, min, max] of [['x', box.left, box.right], ['y', box.top, box.bottom]]) {
        const delta = b[axis] - a[axis];
        if (!delta) { if (a[axis] < min || a[axis] > max) return false; }
        else {
          const bounds = [(min - a[axis]) / delta, (max - a[axis]) / delta].sort((x, y) => x - y);
          start = Math.max(start, bounds[0]);
          end = Math.min(end, bounds[1]);
          if (start > end) return false;
        }
      }
      return true;
    };
    const labels = [...host.querySelectorAll('.rd-edge-label')];
    const root = center(byId.get(ids.rootId));
    const lines = [ids.upperId, ids.lowerId].map(id => ({ id, a: root, b: center(byId.get(id)) }));
    const pointSegmentDistance = (point, a, b) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
    };
    const pointBoxDistance = (point, box) => Math.hypot(Math.max(box.left - point.x, 0, point.x - box.right), Math.max(box.top - point.y, 0, point.y - box.bottom));
    const lineBoxDistance = (line, box) => {
      if (intersects(line.a, line.b, box)) return 0;
      const corners = [
        { x: box.left, y: box.top }, { x: box.left, y: box.bottom },
        { x: box.right, y: box.top }, { x: box.right, y: box.bottom },
      ];
      return Math.min(...corners.map(point => pointSegmentDistance(point, line.a, line.b)), pointBoxDistance(line.a, box), pointBoxDistance(line.b, box));
    };
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      clipped: elements.some(element => element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2),
      outsideSurface: boxes.filter(box => box.left < surface.left - 2 || box.right > surface.right + 2 || box.top < surface.top - 2 || box.bottom > surface.bottom + 2).map(box => box.id),
      overlapping: boxes.flatMap((a, i) => boxes.filter((b, j) => j > i && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2).map(b => [a.id, b.id])),
      clearance: Math.min(...boxes.flatMap((a, i) => boxes.slice(i + 1).map(b => Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom)))),
      labelLineDistances: labels.flatMap(label => lines.map(line => ({ label: label.dataset.edgeId, line: line.id, distance: lineBoxDistance(line, byId.get(label.dataset.edgeId)) }))),
      labelSides: labels.map(label => {
        const neighbourId = label.dataset.source === ids.rootId ? label.dataset.target : label.dataset.source;
        const neighbour = center(byId.get(neighbourId));
        const position = center(byId.get(label.dataset.edgeId));
        const cross = (neighbour.x - root.x) * (position.y - root.y) - (neighbour.y - root.y) * (position.x - root.x);
        return { id: label.dataset.edgeId, outward: Math.sign(neighbour.y - root.y) * cross };
      }),
      surfaceWidth: surface.width,
      nodeWidths: [...host.querySelectorAll('[data-node-id]')].map(node => node.getBoundingClientRect().width),
      boxes,
    };
  }, { rootId, upperId, lowerId });
  expect(geometry.overflow).toBe(false);
  expect(geometry.clipped).toBe(false);
  expect(geometry.outsideSurface).toEqual([]);
  expect(geometry.overlapping).toEqual([]);
  for (const result of geometry.labelLineDistances) {
    expect(result.distance, `${result.label} clearance from ${result.line} line`).toBeGreaterThanOrEqual(8 * scale);
  }
  for (const label of geometry.labelSides) expect(label.outward, `${label.id} sits outside its branch`).toBeGreaterThan(0);
  expect(geometry.clearance).toBeGreaterThanOrEqual(16 * scale);
  expect(geometry.surfaceWidth).toBeLessThanOrEqual(640 * scale);
  expect(geometry.nodeWidths.every(width => width <= 120 * scale)).toBe(true);
  expect(geometry.boxes.every(box => box.width > 20 && box.height > 20)).toBe(true);
  const root = geometry.boxes.find(box => box.id === rootId);
  const upper = geometry.boxes.find(box => box.id === upperId);
  const lower = geometry.boxes.find(box => box.id === lowerId);
  expect(root.right).toBeLessThan(upper.left);
  expect(root.right).toBeLessThan(lower.left);
  expect(upper.bottom).toBeLessThan(root.top);
  expect(root.bottom).toBeLessThan(lower.top);
  expect(Math.abs(upper.left - lower.left)).toBeLessThan(1);
  expect(Math.abs((upper.top + upper.bottom + lower.top + lower.bottom) / 4 - (root.top + root.bottom) / 2)).toBeLessThan(1);
}

for (const sample of cases) {
  test(`v3 ${sample.id}: warning, unchanged question, diagram, and comparison`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const diagram = await openSample(page, sample);
    await expect(page).toHaveURL(new RegExp(`sample=${sample.id}`));
    await expect(diagram).toBeVisible();
    await expect(diagram.locator('[data-node-id]')).toHaveCount(sample.nodeCount);
    if (sample.id !== 'l4-relationship-002') await expectPairContent(diagram, sample);
    await expect(diagram.getByRole('link', { name: /原作.*VIUK-Light/ })).toBeVisible();
    if (sample.card.scenario) await expect(page.locator('#scenarioText')).toHaveText(sample.card.scenario);
    if (sample.card.detail?.text || sample.card.terms?.length) {
      await page.locator('#detailButton').click();
      await expect(page.locator('#detailText')).toHaveText(sample.card.detail?.text ?? '');
      await expect(page.locator('#termsList dt')).toHaveCount(sample.card.terms?.length ?? 0);
      await page.locator('#detailButton').click();
    } else {
      await expect(page.locator('#detailButton')).toBeHidden();
    }
    await page.locator('#previewDiagramOff').click();
    await expect(page.getByRole('heading', { name: '話をはじめる前に' })).toBeVisible();
    await page.getByRole('link', { name: '続ける', exact: true }).click();
    await expect(page.locator('#nextQuestionButton')).toBeEnabled();
    await expect(page.locator('#relationDiagram')).toBeHidden();
    await expect(page.locator('#relationDiagramToggle')).toBeHidden();
    await expect(page.locator('#questionText')).toHaveText(sample.card.question);
    expect(errors).toEqual([]);
  });
}

test('v3 kinship shows the people and established relationships without adding viewpoints or questions', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const sample = cases[1];
  const diagram = await openSample(page, sample, '1', { reveal: false });
  await expect(diagram).toBeHidden();
  await expect(page.locator('#scenarioText')).toHaveText(sample.card.scenario);
  await page.getByRole('button', { name: '関係図を表示', exact: true }).click();
  await advanceToFinalScene(diagram);
  await expectKinshipGraph(diagram);
  await expect(diagram).not.toContainText(sample.card.question);
  await expect(page.locator('#questionText')).toHaveText(sample.card.question);
  await expect(page.locator('#scenarioText')).toHaveText(sample.card.scenario);
  await diagram.getByText('つながりを文章で読む', { exact: true }).click();
  await expect(diagram.locator('.rd-relations')).toContainText(/配偶者\s*—\s*自分/);
  await expect(diagram.locator('.rd-relations')).toContainText(/自分\s*—\s*子ども/);
  await page.getByRole('button', { name: '関係図を閉じる', exact: true }).click();
  await expect(diagram).toBeHidden();
  await page.getByRole('button', { name: '関係図を表示', exact: true }).click();
  await advanceToFinalScene(diagram);
  await expectKinshipGraph(diagram);
  await expect(page.locator('#questionText')).toHaveText(sample.card.question);
  await expect(page.locator('#scenarioText')).toHaveText(sample.card.scenario);
  expect(errors).toEqual([]);
});

test('v3 copied home, selection, warning and finish stay in the preview', async ({ page }) => {
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

test('v3 clears the diagram on ordinary cards and keeps previous cards collapsed', async ({ page }) => {
  const sample = cases[1];
  const diagram = await openSample(page, sample);
  const specialQuestions = new Set(cases.map(item => item.card.question));
  let steps = 0;
  do {
    await page.locator('#nextQuestionButton').click();
    steps += 1;
  } while (specialQuestions.has(await page.locator('#questionText').innerText()) && steps < 4);
  await expect(diagram).toBeHidden();
  await expect(page.locator('#relationDiagramToggle')).toBeHidden();
  for (let index = 0; index < steps; index += 1) await page.locator('#previousQuestionButton').click();
  await expect(page.locator('#questionText')).toHaveText(sample.card.question);
  await expect(diagram).toBeHidden();
  await expect(page.locator('#relationDiagramToggle')).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: '関係図を表示', exact: true }).click();
  await expect(diagram).toBeVisible();
  await expect(diagram.locator('[data-node-id]')).toHaveCount(3);
});

for (const sample of [cases[0], cases[2]]) {
  test(`v3 ${sample.id} clears paired people and restores its own diagram after back navigation`, async ({ page }) => {
    const diagram = await openSample(page, sample);
    await expectPairContent(diagram, sample);
    const specialQuestions = new Set(cases.map(item => item.card.question));
    let steps = 0;
    do {
      await page.locator('#nextQuestionButton').click();
      steps += 1;
    } while (specialQuestions.has(await page.locator('#questionText').innerText()) && steps < 4);
    await expect(diagram).toBeHidden();
    await expect(page.locator('#relationDiagramToggle')).toBeHidden();
    for (let index = 0; index < steps; index += 1) await page.locator('#previousQuestionButton').click();
    await expect(page.locator('#questionText')).toHaveText(sample.card.question);
    await expect(diagram).toBeHidden();
    await expect(page.locator('#relationDiagramToggle')).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#relationDiagramToggle').click();
    await advanceToFinalScene(diagram);
    await expectPairContent(diagram, sample);
    await expectPairsFit(diagram);
  });
}

test('v3 default flow starts collapsed and supports keyboard opening and closing', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const diagram = await openSample(page, cases[0], null, { reveal: false });
  const toggle = page.locator('#relationDiagramToggle');
  await expect(page.getByRole('button', { name: '関係図を表示', exact: true })).toBeVisible();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(diagram).toBeVisible();
  await expect(diagram.locator('[data-node-id]')).toHaveCount(1);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#relationDiagramToggle').focus();
  await page.keyboard.press('Space');
  await expect(diagram).toBeHidden();
  await expect(page.locator('#relationDiagramToggle')).toHaveText('関係図を表示');
  await expect(page.locator('#relationDiagramToggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#relationDiagramToggle')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(diagram).toBeVisible();
  await expect(diagram.locator('[data-node-id]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  await expect(diagram).toBeHidden();
  await expect(page.locator('#relationDiagramToggle')).toHaveText('関係図を表示');
  expect(errors).toEqual([]);
});

for (const sampleId of ['not-a-card', 'gender-l3-009']) {
  test(`v3 does not silently randomise invalid Level 4 sample ${sampleId}`, async ({ page }) => {
    await page.goto(`${preview}warning.html?sample=${sampleId}&diagram=1`);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('link', { name: '続ける', exact: true })).toHaveCount(0);
    await expect(page.locator('#continueLink')).toHaveAttribute('aria-disabled', 'true');
    await expect(page).toHaveURL(new RegExp(`${preview}warning.html`));
  });
}

for (const viewport of [{ width: 320, height: 800 }, { width: 360, height: 800 }, { width: 768, height: 1024 }, { width: 1280, height: 720 }]) {
  for (const sample of [cases[0], cases[2]]) {
    for (const enlarged of [false, true]) {
      test(`v3 ${sample.id} keeps actor/action pairs at ${viewport.width}px with ${enlarged ? '200%' : 'normal'} text`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const diagram = await openSample(page, sample);
        await expect(diagram.locator('[data-rd-ready="true"]')).toBeVisible();
        if (enlarged) {
          await page.addStyleTag({ content: '.rd-node-title { font-size: 36px; } .rd-node-body, .rd-edge-label { font-size: 32px; }' });
          await expect(diagram.locator('.rd-node-title').first()).toHaveCSS('font-size', '36px');
          await expect(diagram.locator('.rd-edge-label').first()).toHaveCSS('font-size', '32px');
        }
        await expectPairContent(diagram, sample);
        await expectPairsFit(diagram);
        await expect(page.locator('#questionText')).toHaveText(sample.card.question);
        if (sample.card.scenario) expect(await page.locator('#scenarioText').textContent()).toBe(sample.card.scenario);
      });
    }
  }

  test(`v3 kinship keeps the two rightward relationships at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const diagram = await openSample(page, cases[1]);
    await expectKinshipGraph(diagram);
    await expectDiagramContentFits(diagram);
  });

  test(`v3 kinship keeps two columns with 200% text at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const diagram = await openSample(page, cases[1]);
    await expect(diagram.locator('[data-rd-ready="true"]')).toBeVisible();
    await page.addStyleTag({ content: '.rd-node-title { font-size: 36px; } .rd-node-body, .rd-edge-label { font-size: 32px; }' });
    await expect(diagram.locator('.rd-node-title').first()).toHaveCSS('font-size', '36px');
    await expect(diagram.locator('.rd-node-body').first()).toHaveCSS('font-size', '32px');
    await expect(diagram.locator('.rd-edge-label').first()).toHaveCSS('font-size', '32px');
    await expectKinshipGraph(diagram);
    await expectDiagramContentFits(diagram);
  });
}

test('standalone relationship demo uses the same renderer without Omoi data or a CDN', async ({ page }) => {
  const requests = [];
  const errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/packages/relation-diagram/demo/index.html');
  await expect(page.locator('[data-node-id]').first()).toBeVisible();
  await expect(page.locator('[data-node-id]')).toHaveCount(5);
  await expect(page.locator('.rd-diagram')).toHaveAttribute('data-layout', 'network');
  await expectCanvasTextStyle(page.locator('#diagram'), 1);
  await expect(page.getByRole('link', { name: /原作.*VIUK-Light/ })).toBeVisible();
  await page.getByRole('button', { name: '原稿の受け渡し', exact: true }).click();
  await expect(page.locator('.rd-diagram')).toHaveAttribute('data-layout', 'path');
  await expect(page.locator('.rd-node--person')).toHaveCount(3);
  await expect(page.locator('.rd-node-caption')).toHaveCount(3);
  await expect(page.locator('[data-node-id="writer"]')).toContainText('秋');
  await expect(page.locator('[data-node-id="editor"]')).toContainText('望');
  await expect(page.locator('[data-node-id="designer"]')).toContainText('楓');
  await expect(page.locator('.rd-edge-label[data-edge-id="draft"]')).toBeVisible();
  await expect(page.locator('.rd-edge-label[data-edge-id="draft"]')).toHaveText('書いた原稿を渡す');
  await expect(page.locator('.rd-edge-label[data-edge-id="reviewed"]')).toBeVisible();
  await expect(page.locator('.rd-edge-label[data-edge-id="reviewed"]')).toHaveText('確認した原稿を渡す');
  await expectCanvasTextStyle(page.locator('#diagram'), 0, { draft: 'triangle', reviewed: 'triangle' });
  await page.getByRole('button', { name: '編集者を中心に見る', exact: true }).click();
  await expect(page.locator('.rd-diagram')).toHaveAttribute('data-layout', 'branches');
  await expect(page.locator('.rd-diagram')).toHaveAttribute('data-direction', 'right');
  await expect(page.locator('.rd-diagram')).not.toHaveAttribute('data-orientation');
  await expect(page.locator('.rd-node-caption')).toHaveCount(0);
  await expect(page.locator('.rd-edge-label[data-edge-id="manuscript"]')).toHaveAttribute('data-target', 'editor');
  await expect(page.locator('.rd-edge-label[data-edge-id="production"]')).toHaveAttribute('data-source', 'editor');
  await expect(page.locator('[data-node-id="editor"]')).toHaveClass(/\brd-node--root\b/);
  await expect(page.locator('.rd-relations')).toContainText(/執筆者\s*→\s*編集者/);
  await expect(page.locator('.rd-relations')).toContainText(/編集者\s*→\s*制作者/);
  await expect(page.locator('.rd-edge-label').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expectCanvasTextStyle(page.locator('#diagram'), 0, { manuscript: 'triangle', production: 'triangle' });
  await expectDiagramContentFits(page.locator('#diagram'), { rootId: 'editor', upperId: 'writer', lowerId: 'designer' });
  await page.getByRole('button', { name: '二つのやりとり', exact: true }).click();
  await expect(page.locator('.rd-diagram')).toHaveAttribute('data-layout', 'pairs');
  await expect(page.locator('.rd-diagram')).not.toHaveAttribute('data-direction');
  await expect(page.locator('.rd-diagram')).not.toHaveAttribute('data-orientation');
  await expect(page.locator('.rd-node--root')).toHaveCount(0);
  await expect(page.locator('.rd-node--person')).toHaveCount(4);
  await expect(page.locator('.rd-edge-label[data-edge-id="delivery"]')).toHaveText('荷物を渡す');
  await expect(page.locator('.rd-edge-label[data-edge-id="guidance"]')).toHaveText('案内する');
  await expect(page.locator('.rd-edge-label[data-edge-id="delivery"]')).toHaveAttribute('data-source', 'courier');
  await expect(page.locator('.rd-edge-label[data-edge-id="delivery"]')).toHaveAttribute('data-target', 'recipient');
  await expect(page.locator('.rd-edge-label[data-edge-id="guidance"]')).toHaveAttribute('data-source', 'receptionist');
  await expect(page.locator('.rd-edge-label[data-edge-id="guidance"]')).toHaveAttribute('data-target', 'visitor');
  await expectCanvasTextStyle(page.locator('#diagram'), 0, { delivery: 'triangle', guidance: 'triangle' }, { delivery: 'solid', guidance: 'solid' });
  await expectPairsFit(page.locator('#diagram'));
  await page.getByRole('button', { name: '展示会の準備', exact: true }).click();
  await expect(page.locator('.rd-diagram')).toHaveAttribute('data-layout', 'branches');
  await expect(page.locator('.rd-diagram')).toHaveAttribute('data-direction', 'down');
  await expect(page.locator('[data-node-id]')).toHaveCount(4);
  await expect(page.locator('.rd-edge-label')).toHaveCount(0);
  await expect(page.locator('.rd-node-caption')).toHaveCount(0);
  await expect(page.locator('[data-node-id="writer"]')).toHaveCount(0);
  await expect(page.locator('#diagram')).not.toContainText('書いた原稿を渡す');
  await expectCanvasTextStyle(page.locator('#diagram'), 1);
  await page.getByRole('button', { name: '読書会の人物相関', exact: true }).click();
  await expect(page.locator('.rd-diagram')).toHaveAttribute('data-layout', 'network');
  await expect(page.locator('.rd-diagram')).not.toHaveAttribute('data-direction');
  await expect(page.locator('.rd-node--root')).toHaveCount(0);
  await expect(page.locator('[data-node-id]')).toHaveCount(5);
  await expect(page.locator('.rd-edge-label')).toHaveCount(0);
  await expect(page.locator('.rd-node-caption')).toHaveCount(0);
  await expect(page.locator('[data-node-id="exhibition"]')).toHaveCount(0);
  await expect(page.locator('#demo-error')).toBeHidden();
  await expectCanvasTextStyle(page.locator('#diagram'), 1);
  expect(requests.filter(url => /^https?:/.test(url)).every(url => new URL(url).hostname === '127.0.0.1')).toBe(true);
  expect(requests.some(url => /level[1-4]\.json/.test(url))).toBe(false);
  expect(errors).toEqual([]);
});

test('the public component API safely updates, rejects invalid input, destroys and remounts', async ({ page }) => {
  await page.goto('/packages/relation-diagram/demo/index.html');
  const result = await page.evaluate(async () => {
    const { createRelationDiagram } = await import('/packages/relation-diagram/index.mjs');
    const host = document.createElement('div');
    document.body.append(host);
    const literal = '<img src=x onerror="window.diagramInjected=true">';
    const input = { nodes: [{ id: 'root', title: literal }, { id: 'child', title: '別の見方' }], edges: [{ source: 'root', target: 'child' }] };
    const diagram = createRelationDiagram(host, input);
    const title = host.querySelector('h3').textContent;
    const injected = Boolean(window.diagramInjected) || Boolean(host.querySelector('img'));
    let rejected = false;
    try { diagram.update({ nodes: [{ id: 'duplicate', title: '一つ目' }, { id: 'duplicate', title: '二つ目' }], edges: [] }); }
    catch { rejected = true; }
    const unchanged = host.querySelectorAll('[data-node-id]').length === 2;
    diagram.update({ nodes: [{ id: 'one', title: '一つ' }], edges: [] });
    const updated = host.querySelectorAll('[data-node-id]').length;
    diagram.update({
      nodes: [{ id: 'first', title: '一人目' }, { id: 'second', title: '二人目' }, { id: 'third', title: '三人目' }],
      edges: [{ id: 'first-link', source: 'first', target: 'second', label: '伝えた', directed: true }, { id: 'second-link', source: 'second', target: 'third', label: '一緒に育てた', directed: false }],
    }, { layout: 'path' });
    const pathState = {
      layout: host.querySelector('.rd-diagram').dataset.layout,
      labels: [...host.querySelectorAll('.rd-edge-label')].map(label => label.dataset.edgeId),
      firstLabel: host.querySelector('.rd-edge-label[data-edge-id="first-link"]')?.textContent,
    };
    diagram.update({
      nodes: [{ id: 'target-a', title: '受取人' }, { id: 'source-a', title: '配達員' }, { id: 'target-b', title: '来訪者' }, { id: 'source-b', title: '受付' }],
      edges: [{ id: 'pair-a', source: 'source-a', target: 'target-a', label: '渡す？', directed: true, lineStyle: 'dashed' }, { id: 'pair-b', source: 'source-b', target: 'target-b', label: '案内する', directed: true }],
    }, { layout: 'pairs' });
    const pairsState = {
      layout: host.querySelector('.rd-diagram').dataset.layout,
      nodes: host.querySelectorAll('[data-node-id]').length,
      labels: [...host.querySelectorAll('.rd-edge-label')].map(label => label.dataset.edgeId),
      staleLabels: host.querySelectorAll('.rd-edge-label[data-edge-id="first-link"], .rd-edge-label[data-edge-id="second-link"]').length,
    };
    diagram.update({
      nodes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }],
      edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }, { source: 'c', target: 'a' }],
    }, { layout: 'network' });
    const networkState = {
      layout: host.querySelector('.rd-diagram').dataset.layout,
      nodes: [...host.querySelectorAll('[data-node-id]')].map(node => node.dataset.nodeId),
      staleLabels: host.querySelectorAll('.rd-edge-label[data-edge-id="first-link"], .rd-edge-label[data-edge-id="second-link"], .rd-edge-label[data-edge-id="pair-a"], .rd-edge-label[data-edge-id="pair-b"]').length,
    };
    diagram.destroy();
    diagram.destroy();
    const empty = host.childElementCount === 0;
    const next = createRelationDiagram(host, input);
    const remounted = host.querySelectorAll('[data-node-id]').length;
    next.destroy();
    host.remove();
    return { title, literal, injected, rejected, unchanged, updated, pathState, pairsState, networkState, empty, remounted };
  });
  expect(result.title).toBe(result.literal);
  expect(result.injected).toBe(false);
  expect(result.rejected).toBe(true);
  expect(result.unchanged).toBe(true);
  expect(result.updated).toBe(1);
  expect(result.pathState).toEqual({ layout: 'path', labels: ['first-link', 'second-link'], firstLabel: '伝えた' });
  expect(result.pairsState).toEqual({ layout: 'pairs', nodes: 4, labels: ['pair-a', 'pair-b'], staleLabels: 0 });
  expect(result.networkState).toEqual({ layout: 'network', nodes: ['a', 'b', 'c'], staleLabels: 0 });
  expect(result.empty).toBe(true);
  expect(result.remounted).toBe(2);
});

test('200% page zoom reflows the kinship people and edge labels without clipping or overlap', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const diagram = await openSample(page, cases[1]);
  await expect(diagram.locator('[data-rd-ready="true"]')).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await page.waitForTimeout(250);
  await expectKinshipGraph(diagram);
  await expectDiagramContentFits(diagram, { scale: 2 });
});
