import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getQuestionSummary, getQuestionSummaryContent } from './question-summary.mjs';

const datasets = new Map([3, 4].map(level => [level,
    JSON.parse(readFileSync(new URL(`../../level${level}.json`, import.meta.url)))
]));
const cases = [
    [4, 'l4-relationship-002'],
    [3, 'gender-l3-009'],
    [4, 'r6-08-02-l4']
];
const source = (level, id) => datasets.get(level).find(question => question.id === id);

test('the reviewed source questions have summaries without source mutation', () => {
    for (const [level, id] of cases) {
        const question = structuredClone(source(level, id));
        const before = structuredClone(question);
        Object.freeze(question);
        const summary = getQuestionSummary(question);
        assert.equal(typeof summary, 'string', id);
        assert.ok(summary.length > 0, id);
        assert.deepEqual(question, before);
        assert.equal(getQuestionSummary(source(level, id)), summary);
    }
});

test('a changed source question, scenario, level or ID never receives a stale summary', () => {
    for (const [level, id] of cases) {
        const question = source(level, id);
        for (const changed of [
            { ...question, question: question.question + '更新' },
            { ...question, scenario: (question.scenario ?? '') + '更新' },
            { ...question, level: level === 3 ? 4 : 3 },
            { ...question, level: String(level) },
            { ...question, id: 'unknown' },
            { ...question, question: null },
            { ...question, scenario: null }
        ]) {
            assert.equal(getQuestionSummary(changed), null, id);
            assert.equal(getQuestionSummaryContent(changed), null, id);
        }
        assert.equal(getQuestionSummary(question), getQuestionSummary(source(level, id)));
    }
});

test('unknown inputs and questions needing no explanation receive no generated summary', () => {
    for (const input of [undefined, null, false, 4, '', 'r6-08-02-l4', [], {}, { id: 'toString' }]) {
        assert.equal(getQuestionSummary(input), null);
        assert.equal(getQuestionSummaryContent(input), null);
    }
    const ordinary = datasets.get(4).find(question => !cases.some(([, id]) => question.id === id));
    assert.equal(getQuestionSummary(ordinary), null);
    assert.equal(getQuestionSummaryContent(ordinary), null);
    const clearQuestion = source(4, 'relationship-009');
    assert.equal(getQuestionSummary(clearQuestion), null);
    assert.equal(getQuestionSummaryContent(clearQuestion), null);
});

test('the AI summary identifies the decision and considerations without inferring demand or intent', () => {
    const summary = getQuestionSummary(source(4, 'r6-08-02-l4'));
    assert.match(summary, /開発責任者.*機能を増やすか/);
    assert.match(summary, /AIとの親密な会話.*事業の利益.*友人関係への影響/);
    assert.doesNotMatch(summary, /利用者が求める|依存|意図的|悪い|べき|短期|満足/);
});

test('the AI content separates the decision from considerations without deciding their value', () => {
    const question = source(4, 'r6-08-02-l4');
    const before = structuredClone(question);
    const blocks = getQuestionSummaryContent(question);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].type, 'bullets');
    assert.deepEqual(blocks[0].items.map(item => item.label), ['決めること', '考える論点']);
    const [decision, considerations] = blocks[0].items;
    assert.match(decision.text, /開発責任者.*機能を増やすか/);
    assert.match(considerations.text, /AIとの親密な会話.*事業の利益.*友人関係への影響/);
    assert.doesNotMatch(JSON.stringify(blocks), /利用者が求める|対立する価値|依存|意図的|悪い|べき|短期|満足|OK/);
    assert.deepEqual(question, before);
});

test('content views are separately owned while concise text remains available for simpler questions', () => {
    for (const [level, id] of cases) {
        const question = source(level, id);
        const first = getQuestionSummaryContent(question);
        const second = getQuestionSummaryContent(question);
        assert.deepEqual(first, second);
        assert.notEqual(first, second);
        assert.notEqual(first[0], second[0]);
        if (first[0].type === 'bullets') {
            first[0].items[0].label = 'changed';
            first[0].items[0].text = 'changed';
            first[0].items.push({ label: 'extra', text: 'extra' });
        } else {
            assert.equal(first[0].type, 'text');
            assert.equal(first[0].text, getQuestionSummary(question));
            first[0].text = 'changed';
        }
        first.push({ type: 'text', text: 'extra' });
        assert.deepEqual(getQuestionSummaryContent(question), second);
        assert.equal(typeof getQuestionSummary(question), 'string');
    }
});
