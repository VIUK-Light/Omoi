import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestionSupport } from './question-support-schema.mjs';

const source = { title: 'Reviewed source', url: 'https://example.test/source' };
test('each helper is optional, including terms without a background explanation', () => {
    for (const support of [
        {},
        { hints: ['What would change your view?'] },
        { terms: [{ term: 'Consent', definition: 'An explanation of the term.' }] },
        { summary: [{ type: 'text', text: 'A long contextual explanation. '.repeat(30) }] },
        { summary: [{ type: 'bullets', items: [{ text: 'One useful point.' }] }] },
        { detail: { text: 'A checked fact.', sources: [source] } }
    ]) assert.deepEqual(validateQuestionSupport({ level: 3, ...support }), []);
});

test('Level 1/2 do not accept helpers even when their structure is valid', () => {
    for (const level of [1, 2]) {
        assert.deepEqual(validateQuestionSupport({ level }), []);
        assert.ok(validateQuestionSupport({ level, hints: ['A question?'] }).some(error => error.code === 'helper_level_not_supported'));
    }
});

test('malformed content and empty filler fail without enforcing a fixed number of items', () => {
    for (const support of [
        { summary: [] }, { summary: [{ type: 'text', text: ' ' }] },
        { summary: [{ type: 'bullets', items: [] }] },
        { summary: [{ type: 'bullets', items: [{ text: 'Point', label: '' }] }] },
        { summary: [{ type: 'html', text: '<b>Point</b>' }] },
        { hints: [] }, { hints: [''] }, { terms: [] },
        { terms: [{ term: 'Term', definition: null }] },
        { detail: { sources: [source] } }
    ]) assert.ok(validateQuestionSupport({ level: 4, ...support }).length > 0, JSON.stringify(support));
    assert.deepEqual(validateQuestionSupport({ level: 4, summary: [{ type: 'bullets', items: Array.from({ length: 5 }, (_, i) => ({ text: `Relevant point ${i}` })) }] }), []);
});

test('published background needs linked sources with safe, valid URLs', () => {
    for (const sources of [undefined, [], [{ title: 'Source', url: 'javascript:alert(1)' }], [{ title: '', url: source.url }], [{ title: 'Source', url: 'invalid' }]]) {
        assert.ok(validateQuestionSupport({ level: 4, detail: { text: 'Background', sources } }).length > 0);
    }
    assert.deepEqual(validateQuestionSupport({ level: 4, detail: { text: 'Background', sources: [source] } }), []);
});
