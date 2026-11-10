import test from 'node:test';
import assert from 'node:assert/strict';
import { REVIEW_BASE_COMMIT, fingerprintQuestion, validateV3Review } from './verify-v3-review.mjs';

function fixture() {
    const baseByLevel = Object.fromEntries([[1, 163], [2, 80], [3, 301], [4, 362]].map(([level, count]) => [level,
        Array.from({ length: count }, (_, index) => ({ id: `l${level}-${index}`, level, question: `Question ${level}/${index}`, scenario: 'Original situation', category: 'original' }))
    ]));
    const currentByLevel = structuredClone(baseByLevel);
    currentByLevel[3][0].summary = [{ type: 'text', text: 'A reviewed aid.' }];
    const currentRaw = Object.fromEntries(Object.entries(currentByLevel).map(([level, rows]) => [level, JSON.stringify(rows)]));
    const baseRaw = Object.fromEntries(Object.entries(baseByLevel).map(([level, rows]) => [level, JSON.stringify(rows)]));
    const records = [...currentByLevel[3], ...currentByLevel[4]].map(record => ({
        id: record.id, level: record.level, fingerprint: fingerprintQuestion(record),
        decisions: { summary: 'Retained where needed or omitted as unnecessary.', hints: 'Reviewed follow-up.', background: 'Omitted when unverified.', terms: 'Reviewed necessity.' },
        reviewer: 'editor-a', independentReviewer: 'reader-b'
    }));
    return { review: { version: 1, baseCommit: REVIEW_BASE_COMMIT, records }, currentByLevel, baseByLevel, currentRaw, baseRaw };
}

test('complete independent review permits omitted helpers and preserves every core card', () => {
    assert.deepEqual(validateV3Review(fixture()), []);
});

test('changing a question, situation, metadata or card order is not an allowed helper edit', () => {
    for (const field of ['question', 'scenario', 'category']) {
        const input = fixture();
        input.currentByLevel[3][0][field] = 'Changed';
        input.review.records[0].fingerprint = fingerprintQuestion(input.currentByLevel[3][0]);
        assert.ok(validateV3Review(input).some(error => error.code === 'changed_core_content'));
    }
    const input = fixture();
    input.currentByLevel[4].reverse();
    assert.ok(validateV3Review(input).some(error => error.code === 'changed_card_order_or_ids'));
});

test('every helper edit invalidates its prior review even when core text stays the same', () => {
    const input = fixture();
    input.currentByLevel[3][0].summary[0].text = 'An unreviewed change.';
    assert.ok(validateV3Review(input).some(error => error.code === 'stale_review'));
});

test('missing, duplicated, self-reviewed and unexplained entries fail the publication gate', () => {
    for (const change of [
        input => input.review.records.pop(),
        input => { input.review.records[1] = input.review.records[0]; },
        input => { input.review.records[0].independentReviewer = 'editor-a'; },
        input => { delete input.review.records[0].decisions.background; },
        input => { input.review.baseCommit = 'a'.repeat(40); }
    ]) {
        const input = fixture(); change(input);
        assert.ok(validateV3Review(input).length > 0);
    }
});

test('lower-level files remain byte-for-byte unchanged, including formatting', () => {
    const input = fixture();
    input.currentRaw[1] += '\n';
    assert.ok(validateV3Review(input).some(error => error.code === 'changed_lower_level_file'));
});
