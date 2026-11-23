import test from 'node:test';
import kuromoji from 'kuromoji';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    assignQuestionLabels,
    isKnownLabel,
    labelDefinitions,
    topicLabelIds,
    validateLabelList
} from './question-labels.mjs';

const kuromojiTokenizer = await new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((error, tokenizer) => {
        if (error) reject(error);
        else resolve(tokenizer);
    });
});
const katakanaToHiragana = value => String(value ?? '').replace(/[ァ-ン]/g, char =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
);
const flattenSummary = summary => {
    if (!Array.isArray(summary)) return '';
    return summary.map(block => {
        if (!block || typeof block !== 'object') return '';
        if (block.type === 'text') return typeof block.text === 'string' ? block.text : '';
        if (block.type === 'bullets' && Array.isArray(block.items)) {
            return block.items.map(item => {
                if (!item || typeof item !== 'object') return '';
                return [item.label, item.text].filter(value => typeof value === 'string' && value).join(' ');
            }).filter(Boolean).join(' ');
        }
        return '';
    }).filter(Boolean).join(' ');
};

const buildQuestionReading = record => {
    const text = [
        record.question,
        typeof record.scenario === 'string' ? record.scenario : '',
        flattenSummary(record.summary),
        Array.isArray(record.hints) ? record.hints.join(' ') : '',
        Array.isArray(record.terms)
            ? record.terms.map(term => (typeof term === 'string' ? term : (term?.term ?? '') + ' ' + (term?.definition ?? ''))).join(' ')
            : ''
    ].filter(Boolean).join(' ');
    try {
        const tokens = kuromojiTokenizer.tokenize(text);
        const reading = tokens
            .map(token => (token.reading && token.reading !== '*' ? token.reading : token.surface_form))
            .join('');
        return katakanaToHiragana(reading);
    } catch (error) {
        return katakanaToHiragana(text);
    }
};

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
    const read = name => {
        const directory = name.startsWith('level') ? '質問' : '索引';
        return JSON.parse(fs.readFileSync(new URL(`../データ/${directory}/${name}`, import.meta.url), 'utf8'));
    };
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

    const flattenSummary = summary => {
        if (!Array.isArray(summary)) return '';
        return summary.map(block => {
            if (!block || typeof block !== 'object') return '';
            if (block.type === 'text') return typeof block.text === 'string' ? block.text : '';
            if (block.type === 'bullets' && Array.isArray(block.items)) {
                return block.items.map(item => {
                    if (!item || typeof item !== 'object') return '';
                    return [item.label, item.text].filter(value => typeof value === 'string' && value).join(' ');
                }).filter(Boolean).join(' ');
            }
            return '';
        }).filter(Boolean).join(' ');
    };
    const buildQuestionSearchText = record => {
        const parts = [];
        for (const value of [
            record.category,
            record.topic,
            record.perspective,
            record.role,
            ...(Array.isArray(record.content_warning) ? record.content_warning : [])
        ]) {
            if (typeof value === 'string' && value) parts.push(value);
        }
        if (typeof record.scenario === 'string' && record.scenario) parts.push(record.scenario);
        const summary = flattenSummary(record.summary);
        if (summary) parts.push(summary);
        if (Array.isArray(record.hints)) {
            const hints = record.hints.filter(value => typeof value === 'string' && value).join(' ');
            if (hints) parts.push(hints);
        }
        if (Array.isArray(record.terms)) {
            const terms = record.terms.map(term => {
                if (!term || typeof term !== 'object') return '';
                return [term.term, term.definition].filter(value => typeof value === 'string' && value).join(' ');
            }).filter(Boolean).join(' ');
            if (terms) parts.push(terms);
        }
        return parts.join('\n');
    };

    const buildQuestionHints = record => Array.isArray(record.hints)
        ? record.hints.filter(value => typeof value === 'string' && value) : [];
    const buildQuestionTerms = record => Array.isArray(record.terms)
        ? record.terms.map(term => {
            if (!term || typeof term !== 'object' || typeof term.term !== 'string' || !term.term) return '';
            return term.definition ? term.term + ': ' + term.definition : term.term;
        }).filter(Boolean) : [];

    const addedDates = read('question-added-dates.json').dates;
    assert.deepEqual(read('questions-index.json'), {
        version: 6,
        questions: rows.map((row, i) => ({
            index: i,
            id: row.id,
            level: row.level,
            category: row.category,
            topic: row.topic ?? '',
            perspective: row.perspective ?? '',
            role: row.role ?? '',
            sensitivity: row.sensitivity ?? null,
            content_warning: row.content_warning ?? [],
            addedDate: addedDates[row.id],
            labels: row.labels,
            question: row.question,
            search: buildQuestionSearchText(row),
            scenario: typeof row.scenario === 'string' ? row.scenario : '',
            summary: flattenSummary(row.summary),
            hints: buildQuestionHints(row),
            terms: buildQuestionTerms(row),
            reading: buildQuestionReading(row)
        }))
    });

    assert.deepEqual(read('question-details-index.json'), {
        version: 1,
        questions: rows.filter(row => (Array.isArray(row.summary) && row.summary.length > 0) || row.detail)
            .map(row => ({
                id: row.id,
                summaryBlocks: Array.isArray(row.summary) ? row.summary : [],
                detail: row.detail ?? null
            }))
            .sort((left, right) => left.id.localeCompare(right.id))
    });

    assert.deepEqual(read('question-filter-index.json'), {
        version: 1,
        questions: rows.map((row, i) => ({
            index: i,
            id: row.id,
            level: row.level,
            sensitivity: row.sensitivity,
            labels: row.labels,
            question: row.question,
            reading: buildQuestionReading(row)
        }))
    });
});
