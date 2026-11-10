import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreviewState, assertSampleLevel, previewHref, sampleEntryHref, putSampleFirst } from './preview-state.mjs';

test('comparison parameters have one valid value and never silently choose a different sample', () => {
  assert.deepEqual(readPreviewState(''), { sampleId: null });
  assert.deepEqual(readPreviewState('?diagram=0&sample=relationship-009'), { sampleId: 'relationship-009' });
  for (const query of ['?sample=unknown', '?sample=relationship-009&sample=relationship-009']) {
    assert.throws(() => readPreviewState(query));
  }
  for (const query of ['?diagram=1', '?diagram=other', '?diagram=0&diagram=1']) {
    assert.deepEqual(readPreviewState(query), { sampleId: null });
  }
  assert.throws(() => assertSampleLevel({ sampleId: 'gender-l3-009' }, 4), /Level 3/);
});

test('sample navigation uses the matching warning and preserves a GitHub Pages subpath', () => {
  const state = { sampleId: null };
  const baseUrl = 'https://example.test/project/preview/omoi-v3/preview.html?diagram=1';
  const entry = new URL(sampleEntryHref('gender-l3-009', state, { baseUrl }));
  assert.equal(entry.pathname, '/project/preview/omoi-v3/warning3.html');
  assert.equal(entry.searchParams.has('diagram'), false);
  assert.equal(entry.searchParams.get('sample'), 'gender-l3-009');
  const next = new URL(previewHref('question.html', state, { baseUrl: entry.href, level: 3, sampleId: 'gender-l3-009' }));
  assert.equal(next.pathname, '/project/preview/omoi-v3/question.html');
  assert.equal(next.searchParams.get('level'), '3');
  assert.equal(next.searchParams.get('sample'), 'gender-l3-009');
  const back = new URL(previewHref('select.html', state, { baseUrl: next.href }));
  assert.equal(back.searchParams.has('diagram'), false);
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
