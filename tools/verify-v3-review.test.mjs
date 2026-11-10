import test from 'node:test';
import assert from 'node:assert/strict';
import { REVIEW_BASE_COMMIT, ACTIVE_LEVELS, fingerprintQuestion, validateV3Review } from './verify-v3-review.mjs';

function fixture() {
    const baseByLevel = Object.fromEntries([[1, 163], [2, 80], [3, 301], [4, 362]].map(([level, count]) => [level,
        Array.from({ length: count }, (_, index) => ({ id: `l${level}-${index}`, level, question: `Question ${level}/${index}`, scenario: 'Original situation', category: 'original' }))
    ]));
    const currentByLevel = structuredClone(baseByLevel);
    delete currentByLevel[1];
    currentByLevel[3][0].summary = [{ type: 'text', text: 'A reviewed aid.' }];
    const currentRaw = Object.fromEntries(Object.entries(currentByLevel).map(([level, rows]) => [level, JSON.stringify(rows)]));
    const baseRaw = Object.fromEntries(Object.entries(baseByLevel).map(([level, rows]) => [level, JSON.stringify(rows)]));
    const records = [...currentByLevel[3], ...currentByLevel[4]].map(record => ({
        id: record.id, level: record.level, fingerprint: fingerprintQuestion(record),
        decisions: { summary: 'Retained where needed or omitted as unnecessary.', hints: 'Reviewed follow-up.', background: 'Omitted when unverified.', terms: 'Reviewed necessity.' },
        reviewer: 'editor-a', independentReviewer: 'reader-b'
    }));
    return { review: { version: 1, baseCommit: REVIEW_BASE_COMMIT, activeLevels: [...ACTIVE_LEVELS], records }, currentByLevel, baseByLevel, currentRaw, baseRaw };
}

test('complete independent review permits omitted helpers and preserves all 743 active core cards', () => {
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

test('Level 2 remains byte-for-byte unchanged, including formatting', () => {
    const input = fixture();
    input.currentRaw[2] += '\n';
    assert.ok(validateV3Review(input).some(error => error.code === 'changed_lower_level_file'));
});

test('retired Level 1 data is rejected even when active cards and reviews are unchanged', () => {
    for (const change of [
        input => { input.currentByLevel[1] = structuredClone(input.baseByLevel[1]); },
        input => { input.currentRaw[1] = input.baseRaw[1]; }
    ]) {
        const input = fixture(); change(input);
        assert.ok(validateV3Review(input).some(error => error.code === 'retired_level_present'));
    }
    const input = fixture();
    input.review.activeLevels = [1, 2, 3, 4];
    assert.ok(validateV3Review(input).some(error => error.code === 'invalid_review_manifest'));
});
