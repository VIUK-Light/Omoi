import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const selectCode = fs.readFileSync(new URL('../select.js', import.meta.url), 'utf8');
const levelSelectCode = fs.readFileSync(new URL('../level-select.js', import.meta.url), 'utf8');
const customSelectCode = fs.readFileSync(new URL('../custom-select.js', import.meta.url), 'utf8');
const warningCode = fs.readFileSync(new URL('../warning.js', import.meta.url), 'utf8');
const warning3Code = fs.readFileSync(new URL('../warning3.js', import.meta.url), 'utf8');

const labelsDocument = {
    version: 1,
    labels: [
        { id: 'student', name: '学校・若者向け', kind: 'audience', order: 0 },
        { id: 'school', name: '学校', kind: 'topic', order: 10 },
        { id: 'friendship', name: '友人関係', kind: 'topic', order: 20 },
        { id: 'care', name: '介護・福祉', kind: 'topic', order: 30 }
    ]
};
const indexDocument = {
    version: 5,
    questions: [
        { index: 0, id: 'q1', level: 2, category: 'school_and_youth', labels: ['student', 'school'], question: 'Q1', search: '', scenario: '', summary: '', hints: [], terms: [], reading: 'q1' },
        { index: 1, id: 'q2', level: 3, category: 'school_and_youth', labels: ['student', 'school'], question: 'Q2', search: '', scenario: '', summary: '', hints: [], terms: [], reading: 'q2' },
        { index: 2, id: 'q3', level: 4, category: 'family_and_care', labels: ['care'], question: 'Q3', search: '背景テキスト ヒント', scenario: '背景テキスト', summary: '', hints: ['ヒント'], terms: [], reading: 'q3' },
        { index: 3, id: 'q4', level: 2, category: 'relationships_and_communication', labels: ['friendship'], question: 'Q4', search: '', scenario: '', summary: '', hints: [], terms: [], reading: 'q4' }
    ]
};

function makeElement() {
    return {
        hidden: false, disabled: false, textContent: '', className: '',
        value: '', checked: false, dataset: {}, children: [], scrollTop: 0,
        addEventListener(event, handler) { this[event] = handler; },
        append(...children) { this.children.push(...children); },
        replaceChildren(...children) { this.children = children; },
        setAttribute(name, value) { this[name] = value; },
        focus() {}
    };
}

function setupSelect() {
    const modeInputs = ['student', 'all', 'custom'].map(value => Object.assign(makeElement(), { value }));
    const nextButton = makeElement();
    const location = { href: 'https://omoi.viuk-light.org/select.html' };
    vm.runInNewContext(selectCode, {
        URL,
        document: {
            querySelectorAll(selector) {
                return selector === 'input[name="mode"]' ? modeInputs : [];
            },
            getElementById(id) { return id === 'nextButton' ? nextButton : null; }
        },
        window: { location }
    });

    return {
        location, nextButton, modeInputs,
        choose(value) {
            const input = modeInputs.find(item => item.value === value);
            input.checked = true;
            input.change();
        }
    };
}

function setupLevelSelect() {
    const levelInputs = ['1', '2', '3', '4'].map(value => Object.assign(makeElement(), { value }));
    const nextButton = makeElement();
    const location = { href: 'https://omoi.viuk-light.org/level-select.html' };
    vm.runInNewContext(levelSelectCode, {
        URL,
        document: {
            querySelectorAll(selector) {
                return selector === 'input[name="level"]' ? levelInputs : [];
            },
            getElementById(id) { return id === 'nextButton' ? nextButton : null; }
        },
        window: { location }
    });

    return {
        location, nextButton, levelInputs,
        choose(value) {
            const input = levelInputs.find(item => item.value === value);
            input.checked = true;
            input.change();
        }
    };
}

function setupCustomSelect() {
    const elements = new Map();
    for (const id of [
        'nextButton', 'labelList', 'labelSelectionSummary', 'clearLabels',
        'questionPickerDetails', 'questionPicker', 'questionPickerStatus',
        'questionPickerCount', 'questionSearch', 'questionCategoryFilter', 'selectAllQuestions', 'showMoreQuestions',
        'customTotal', 'customBreakdown', 'customError', 'customErrorText',
        'retryLoadButton',
        'tabLabels', 'tabQuestions', 'labelsPanel', 'questionsPanel',
        'labelTabCount', 'selectedQuestionsPanel', 'selectedQuestionsCount',
        'selectedQuestionList', 'clearQuestions',
        'openSelectedQuestions', 'selectedQuestionsDialog', 'closeSelectedQuestions', 'selectedQuestionsDialogStatus'
    ]) {
        elements.set(id, makeElement());
    }
    const location = { href: 'https://omoi.viuk-light.org/custom-select.html' };
    const selections = [];
    const context = {
        URL, URLSearchParams, AbortController,
        setTimeout() { return 1; }, clearTimeout() {},
        console: { error() {} },
        document: {
            querySelectorAll() { return []; },
            getElementById(id) { return elements.get(id) ?? null; },
            createElement() { return makeElement(); }
        },
        window: {
            location,
            OmoiProgress: {
                createToken: () => 'token123456',
                writeSelection(selection) {
                    selections.push(selection);
                    return true;
                }
            }
        },
        fetch(url) {
            const body = url === 'labels.json' ? labelsDocument : indexDocument;
            return Promise.resolve({ ok: true, json: async () => structuredClone(body) });
        }
    };
    vm.runInNewContext(customSelectCode, context);

    return {
        location, elements, selections,
        labelCheckbox(value) {
            for (const option of elements.get('labelList').children) {
                if (option.children[0]?.value === value) return option.children[0];
            }
            return null;
        }
    };
}

function setupWarning(code, search = '') {
    const continueLink = { href: '' };
    const location = { search };

    vm.runInNewContext(code, {
        URLSearchParams,
        document: { getElementById() { return continueLink; } },
        window: { location }
    });

    return { continueLink };
}

const flush = () => new Promise(resolve => setImmediate(resolve));
async function waitFor(check) {
    for (let attempt = 0; attempt < 50; attempt++) {
        if (check()) return;
        await flush();
    }
    throw new Error('Timed out waiting for selection UI.');
}

test('mode selection enables next only after a mode is chosen', () => {
    const app = setupSelect();
    assert.equal(app.nextButton.disabled, true);
    app.choose('student');
    assert.equal(app.nextButton.disabled, false);
});

test('student mode opens the settings screen without a warning screen', () => {
    const app = setupSelect();
    app.choose('student');
    app.nextButton.click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/student-select.html');
});

test('all mode moves to the level selection screen', () => {
    const app = setupSelect();
    app.choose('all');
    app.nextButton.click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/level-select.html');
});

test('custom mode moves to the category selection screen', () => {
    const app = setupSelect();
    app.choose('custom');
    app.nextButton.click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/custom-select.html');
});

test('level selection enables next only after choosing an active level', () => {
    const app = setupLevelSelect();
    assert.equal(app.nextButton.disabled, true);
    app.choose('1');
    assert.equal(app.nextButton.disabled, true);
    app.choose('2');
    assert.equal(app.nextButton.disabled, false);
});

test('Level 3 routes through warning3.html without a count', () => {
    const app = setupLevelSelect();
    app.choose('3');
    app.nextButton.click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/warning3.html');
});

test('Level 4 keeps routing through warning.html', () => {
    const app = setupLevelSelect();
    app.choose('4');
    app.nextButton.click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/warning.html');
});

test('Level 2 goes directly to question.html', () => {
    const app = setupLevelSelect();
    app.choose('2');
    app.nextButton.click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/question.html?level=2');
});

test('custom mode saves the selected category and starts without a warning', async () => {
    const app = setupCustomSelect();
    await waitFor(() => app.labelCheckbox('school') !== null);
    assert.equal(app.elements.get('nextButton').disabled, true);

    const checkbox = app.labelCheckbox('school');
    checkbox.checked = true;
    checkbox.change();
    assert.equal(app.elements.get('nextButton').disabled, false);
    assert.equal(app.elements.get('customTotal').textContent, '2問');
    assert.match(app.elements.get('customBreakdown').textContent, /カテゴリー1件/);

    app.elements.get('nextButton').click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/custom-confirm.html?mode=custom&session=token123456');
    assert.equal(app.selections.length, 1);
    assert.deepEqual([...app.selections[0].labels], ['school']);
    assert.deepEqual([...app.selections[0].ids], []);
});

test('custom mode can clear the selected categories', async () => {
    const app = setupCustomSelect();
    await waitFor(() => app.labelCheckbox('school') !== null);

    const checkbox = app.labelCheckbox('school');
    checkbox.checked = true;
    checkbox.change();
    assert.equal(app.elements.get('nextButton').disabled, false);

    app.elements.get('clearLabels').click();
    assert.equal(app.elements.get('nextButton').disabled, true);
    assert.equal(app.elements.get('customTotal').textContent, '0問');
    assert.equal(app.elements.get('clearLabels').hidden, true);
});

test('custom mode can start from an individually selected question only', async () => {
    const app = setupCustomSelect();
    await waitFor(() => app.elements.get('questionPicker').children.length > 0);
    const item = app.elements.get('questionPicker').children.find(node =>
        node.children[0].children[0].value === 'q3');
    const checkbox = item.children[0].children[0];
    checkbox.checked = true;
    checkbox.change();
    assert.equal(app.elements.get('nextButton').disabled, false);
    assert.equal(app.elements.get('customTotal').textContent, '1問');
    assert.match(app.elements.get('customBreakdown').textContent, /個別1問/);
    app.elements.get('nextButton').click();
    assert.deepEqual([...app.selections[0].labels], []);
    assert.deepEqual([...app.selections[0].ids], ['q3']);
});

test('category selection pre-checks its questions in the individual picker', async () => {
    const app = setupCustomSelect();
    await waitFor(() => app.labelCheckbox('school') !== null);

    const label = app.labelCheckbox('school');
    label.checked = true;
    label.change();

    await waitFor(() => app.elements.get('questionPicker').children.length > 0);
    assert.equal(app.elements.get('questionPickerCount').textContent, '2問');

    const item = app.elements.get('questionPicker').children.find(node =>
        node.children[0].children[0].value === 'q1');
    const checkbox = item.children[0].children[0];
    assert.equal(checkbox.checked, true);
    assert.equal(item.dataset.selected, 'true');

    // カテゴリーの問いを外すと、その問いだけが除外される。
    checkbox.checked = false;
    checkbox.change();
    assert.equal(item.dataset.selected, 'false');
    assert.equal(app.elements.get('customTotal').textContent, '1問');
    assert.match(app.elements.get('customBreakdown').textContent, /除外1問/);

    checkbox.checked = true;
    checkbox.change();
    assert.equal(item.dataset.selected, 'true');
    assert.equal(app.elements.get('customTotal').textContent, '2問');
    assert.equal(app.elements.get('nextButton').disabled, false);
});

test('warning pages continue to questions without a count', () => {
    const level3 = setupWarning(warning3Code);
    const level4 = setupWarning(warningCode);
    assert.equal(level3.continueLink.href, 'question.html?level=3');
    assert.equal(level4.continueLink.href, 'question.html?level=4');
});
