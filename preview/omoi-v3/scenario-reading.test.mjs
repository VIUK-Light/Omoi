import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getScenarioSegments } from './scenario-reading.mjs';
import { readPreviewState, sampleEntryHref, previewHref } from './preview-state.mjs';

const card = JSON.parse(readFileSync(new URL('../../level4.json', import.meta.url))).find(item => item.id === 'l4-relationship-002');

test('reading segments preserve every source character without mutating the source question', () => {
    const before = structuredClone(card);
    const parts = getScenarioSegments(card);
    assert.equal(parts.length, 3);
    assert.equal(parts.join(''), card.scenario);
    assert.deepEqual(card, before);
    parts[0] = 'external change';
    assert.equal(getScenarioSegments(card).join(''), card.scenario);
});

test('different cards and revised scenarios fall back to their original text', () => {
    assert.equal(getScenarioSegments({ ...card, id: 'ordinary' }), null);
    assert.equal(getScenarioSegments({ ...card, scenario: card.scenario + '更新' }), null);
    assert.equal(getScenarioSegments(null), null);
});

test('reading comparison survives the warning and can exit to the original baseline', () => {
    const state = readPreviewState('?sample=l4-relationship-002&reading=chunks');
    const baseUrl = 'https://example.test/project/preview/omoi-v3/preview.html';
    const entry = new URL(sampleEntryHref(card.id, state, { baseUrl }));
    assert.equal(entry.pathname, '/project/preview/omoi-v3/warning.html');
    assert.equal(entry.searchParams.get('reading'), 'chunks');
    const question = new URL(previewHref('question.html', state, { baseUrl: entry.href, sampleId: card.id, level: 4 }));
    assert.equal(question.searchParams.get('reading'), 'chunks');
    assert.equal(question.searchParams.has('diagram'), false);
    const baseline = new URL(sampleEntryHref(card.id, state, { baseUrl: question.href, reading: null }));
    assert.equal(baseline.searchParams.has('reading'), false);
    assert.equal(readPreviewState('?reading=original').reading, 'original');
    for (const search of ['?reading=unknown', '?reading=chunks&reading=original', '?reading=']) {
        assert.throws(() => readPreviewState(search), /文章の表示条件/);
    }
});
