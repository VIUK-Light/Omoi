import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    assignQuestionLabels,
    isKnownLabel,
    labelDefinitions,
    topicLabelIds,
    validateLabelList
} from './question-labels.mjs';

test('label definitions separate audience and topic labels', () => {
    assert.equal(labelDefinitions.filter(label => label.kind === 'audience').length, 1);
    assert.ok(topicLabelIds.length >= 20);
    assert.ok(isKnownLabel('student'));
    assert.ok(topicLabelIds.every(label => isKnownLabel(label)));
});

test('every question receives a topic label from its category', () => {
    const labels = assignQuestionLabels({ category: 'unknown_category', topic: '' });
    assert.deepEqual(labels, ['values']);

    const school = assignQuestionLabels({ category: 'school_and_youth', topic: 'bullying' });
    assert.ok(school.includes('student'));
    assert.ok(school.includes('school'));
    assert.ok(school.includes('bullying'));
});

test('student labels are added only to school and youth questions', () => {
    assert.ok(assignQuestionLabels({ category: 'school_and_youth', topic: 'support' }).includes('student'));
    assert.ok(!assignQuestionLabels({ category: 'family_and_care', topic: 'care' }).includes('student'));
});

test('invalid label lists are reported', () => {
    assert.deepEqual(validateLabelList(['student', 'school']), []);
    assert.ok(validateLabelList([]).length > 0);
    assert.ok(validateLabelList(['student']).some(message => message.includes('topic')));
    assert.ok(validateLabelList(['school', 'school']).some(message => message.includes('Duplicate')));
    assert.ok(validateLabelList(['school', 'unknown']).some(message => message.includes('Unknown')));
    assert.ok(validateLabelList(['school', '']).some(message => message.includes('non-empty')));
});

test('generated label files match the current question data', () => {
    const read = name => JSON.parse(fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));
    assert.deepEqual(read('labels.json'), {
        version: 1,
        labels: labelDefinitions.map(label => ({ ...label }))
    });

    const rows = [2, 3, 4].flatMap(level => read(`level${level}.json`));
    assert.equal(rows.length, 743);
    assert.equal(rows.filter(row => row.labels.includes('student')).length, 120);
    for (const row of rows) {
        assert.deepEqual(validateLabelList(row.labels), []);
        assert.equal(row.labels.includes('student'), row.category === 'school_and_youth');
    }

    assert.deepEqual(read('questions-index.json').questions, rows.map(row => ({
        id: row.id,
        level: row.level,
        category: row.category,
        labels: row.labels,
        question: row.question
    })));
});
