import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreviewState, assertSampleLevel, previewHref, sampleEntryHref, putSampleFirst } from './preview-state.mjs';
import { SAMPLES, getRelationDiagram, getRelationDiagramOptions } from './adapter.mjs';

test('comparison parameters have one valid value and never silently choose a different sample', () => {
  assert.deepEqual(readPreviewState(''), { diagram: true, sampleId: null });
  assert.deepEqual(readPreviewState('?diagram=0&sample=relationship-009'), { diagram: false, sampleId: 'relationship-009' });
  for (const query of ['?diagram=2', '?diagram=0&diagram=1', '?sample=unknown', '?sample=relationship-009&sample=relationship-009']) {
    assert.throws(() => readPreviewState(query));
  }
  assert.throws(() => assertSampleLevel({ sampleId: 'gender-l3-009' }, 4), /Level 3/);
});

test('sample navigation uses the matching warning and preserves a GitHub Pages subpath', () => {
  const state = { diagram: false, sampleId: null };
  const baseUrl = 'https://example.test/project/preview/omoi-v3/preview.html';
  const entry = new URL(sampleEntryHref('gender-l3-009', state, { baseUrl }));
  assert.equal(entry.pathname, '/project/preview/omoi-v3/warning3.html');
  assert.equal(entry.searchParams.get('diagram'), '0');
  assert.equal(entry.searchParams.get('sample'), 'gender-l3-009');
  const next = new URL(previewHref('question.html', state, { baseUrl: entry.href, level: 3, sampleId: 'gender-l3-009' }));
  assert.equal(next.pathname, '/project/preview/omoi-v3/question.html');
  assert.equal(next.searchParams.get('level'), '3');
  assert.equal(next.searchParams.get('sample'), 'gender-l3-009');
  const back = new URL(previewHref('select.html', state, { baseUrl: next.href }));
  assert.equal(back.searchParams.get('diagram'), '0');
  assert.equal(back.searchParams.has('sample'), false);
});

test('pinning a sample changes only order and includes each original question once', () => {
  const cards = [{ id: 'other' }, { id: 'relationship-009' }, { id: 'another' }];
  const before = structuredClone(cards);
  const ordered = putSampleFirst(cards, 'relationship-009', 4);
  assert.deepEqual(cards, before);
  assert.deepEqual(ordered.map(card => card.id), ['relationship-009', 'other', 'another']);
  assert.equal(new Set(ordered.map(card => card.id)).size, cards.length);
  assert.throws(() => putSampleFirst(cards, 'gender-l3-009', 4), /Level 3/);
  assert.throws(() => putSampleFirst([], 'relationship-009', 4), /質問データにありません/);
});

test('the adapter leaves questions untouched and returns separately owned diagram data', () => {
  for (const sample of SAMPLES) {
    const question = { id: sample.id, level: sample.level, question: '変更してはいけない問い' };
    const before = structuredClone(question);
    const graph = getRelationDiagram(question);
    assert.deepEqual(question, before);
    const options = getRelationDiagramOptions(question);
    if (sample.diagram === false) {
      assert.equal(graph, null);
      assert.equal(options, null);
      continue;
    }
    assert.ok(graph.nodes.every(node => node.kind === 'person'));
    assert.ok(['branches', 'pairs'].includes(options.layout));
    graph.nodes[0].title = '外部で変更';
    assert.notEqual(getRelationDiagram(question).nodes[0].title, graph.nodes[0].title);
  }
  assert.equal(getRelationDiagram({ id: 'ordinary', level: 4 }), null);
  assert.equal(getRelationDiagramOptions({ id: 'ordinary', level: 4 }), null);
});
