import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    flattenPickupIds,
    pickupLevels,
    pickupQuestionsFile,
    pickupQuestionsPerLevel,
    pickupQuestionsTotal,
    validatePickupDocument
} from './pickup-questions.mjs';

function documentWith(idsByLevel = {}) {
    const levels = Object.fromEntries(pickupLevels.map(level => [
        String(level),
        idsByLevel[level] ??
            Array.from({ length: pickupQuestionsPerLevel }, (_, index) => `q${level}-${index}`)
    ]));
    return {
        version: 1,
        month: '2026-11',
        title: '今月のピックアップ質問',
        levels
    };
}

function questionIdsByLevel(document) {
    return new Map(pickupLevels.map(level => [
        level,
        new Set(document.levels[String(level)])
    ]));
}

function codes(findings) {
    return findings.map(finding => finding.code);
}

test('a complete pickup document passes validation', () => {
    const document = documentWith();
    assert.deepEqual(validatePickupDocument(document, questionIdsByLevel(document)), []);
});

test('the published pickup document matches the current question data', () => {
    const document = JSON.parse(fs.readFileSync(
        new URL(`../${pickupQuestionsFile}`, import.meta.url), 'utf8'
    ));
    const idsByLevel = new Map();
    for (const level of pickupLevels) {
        const records = JSON.parse(fs.readFileSync(
            new URL(`../データ/質問/level${level}.json`, import.meta.url), 'utf8'
        ));
        idsByLevel.set(level, new Set(records.map(record => record.id)));
    }

    assert.deepEqual(validatePickupDocument(document, idsByLevel), []);
    const ids = flattenPickupIds(document);
    assert.equal(ids.length, pickupQuestionsTotal);
    assert.deepEqual(
        ids.slice(0, pickupQuestionsPerLevel),
        document.levels['2']
    );
    assert.deepEqual(
        ids.slice(pickupQuestionsPerLevel, pickupQuestionsPerLevel * 2),
        document.levels['3']
    );
    assert.deepEqual(
        ids.slice(pickupQuestionsPerLevel * 2),
        document.levels['4']
    );
});

test('short or long level groups are rejected', () => {
    const document = documentWith({ 3: ['q3-0', 'q3-1'] });
    const findings = validatePickupDocument(document, questionIdsByLevel(document));
    assert.ok(codes(findings).includes('invalid_level_count'));
    assert.ok(codes(findings).includes('invalid_total'));
});

test('duplicate and unknown question IDs are rejected', () => {
    const document = documentWith();
    document.levels['2'][1] = document.levels['2'][0];
    const idsByLevel = questionIdsByLevel(document);
    idsByLevel.get(3).delete(document.levels['3'][0]);
    document.levels['3'][0] = 'missing-question';

    const findings = validatePickupDocument(document, idsByLevel);
    assert.ok(codes(findings).includes('duplicate_id'));
    assert.ok(codes(findings).includes('unknown_question'));
});

test('invalid metadata and level keys are rejected', () => {
    const document = documentWith();
    document.version = 2;
    document.month = '2026-13';
    document.title = ' ';
    document.levels['5'] = [];
    const findings = validatePickupDocument(document, questionIdsByLevel(document));
    for (const code of [
        'invalid_version', 'invalid_month', 'invalid_title', 'unknown_level'
    ]) {
        assert.ok(codes(findings).includes(code), code);
    }
});

test('a non-object document is rejected without throwing', () => {
    for (const value of [null, [], 'text']) {
        assert.ok(codes(validatePickupDocument(value, new Map())).includes('invalid_root'));
    }
});
