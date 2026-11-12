import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../question.js', import.meta.url), 'utf8');
const cards = Array.from({ length: 5 }, (_, i) => ({
    id: `test-${i}`, level: 2, question: `Question ${i}`
}));
const helperCards = cards.map(card => ({
    ...card, level: 3,
    detail: { text: 'Background', sources: [{ title: 'Reviewed source', url: 'https://example.test/source' }] }
}));
const plainReadings = questions => Array.isArray(questions)
    ? Object.fromEntries(questions.map(question => [
    question.id,
    { question: [{ text: question.question }] }
    ]))
    : {};
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(search = '?level=2') {
    const elements = new Map();
    const createdElements = [];
    const element = id => {
        if (!elements.has(id)) {
            const classes = new Set();
            const node = {
                hidden: false, disabled: false, textContent: '', attrs: {}, children: [], dataset: {},
                classList: {
                    add(...names) { names.forEach(name => classes.add(name)); },
                    remove(...names) { names.forEach(name => classes.delete(name)); },
                    contains(name) { return classes.has(name); },
                    toggle(name, force = !classes.has(name)) {
                        if (force) classes.add(name);
                        else classes.delete(name);
                        return force;
                    }
                },
                setAttribute(key, value) { this.attrs[key] = value; },
                removeAttribute(key) { delete this[key]; },
                set innerHTML(value) { this.children = []; this.textContent = ''; },
                addEventListener(event, handler) {
                    if (event === 'close') this.onClose = handler;
                    else this[event] = handler;
                },
                showModal() { this.open = true; },
                close() {
                    this.open = false;
                    this.onClose?.();
                },
                appendChild(child) {
                    this.children.push(child);
                    this.textContent += child.textContent ?? '';
                },
                replaceChildren() { this.children = []; this.textContent = ''; },
                focus() { this.focused = true; },
                scrollHeight: 100, clientHeight: 100, scrollTop: 0
            };
            elements.set(id, node);
        }
        return elements.get(id);
    };
    const requests = [], errors = [];
    let onTimeout;
    const location = { search, href: `https://example.test/question.html${search}` };
    const documentStub = {
        getElementById: element,
        querySelector: element,
        createElement() {
            const node = element(`created-${createdElements.length}`);
            createdElements.push(node);
            return node;
        },
        createTextNode(textContent) { return { textContent }; },
        querySelectorAll() {
            return [...elements.values()].filter(node => node.dataset?.furiganaPath);
        },
        addEventListener(event, handler) { this[event] = handler; }
    };
    vm.runInNewContext(code, {
        URL, URLSearchParams, AbortController,
        Math: { random: () => 0.999, floor: Math.floor },
        setTimeout(fn) { onTimeout = fn; return 1; }, clearTimeout() {},
        console: { error(...args) { errors.push(args); } },
        document: documentStub,
        window: { location, addEventListener() {} }, requestAnimationFrame(fn) { fn(); },
        fetch(url, options) {
            return new Promise((resolve, reject) => {
                requests.push({ url, resolve, reject });
                options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
            });
        }
    });
    return {
        element, requests, location, errors, document: documentStub,
        timeout: () => onTimeout(),
        respond(data = cards, ok = true, readings = plainReadings(data)) {
            const [questionsRequest, readingsRequest] = requests.slice(-2);
            questionsRequest.resolve({
                ok, status: ok ? 200 : 404,
                json: async () => structuredClone(data)
            });
            readingsRequest.resolve({
                ok, status: ok ? 200 : 404,
                json: async () => structuredClone(readings)
            });
        }
    };
}

test('loading blocks navigation, then all cards finish once', async () => {
    const app = setup();
    assert.equal(app.element('nextQuestionButton').disabled, true);
    app.element('nextQuestionButton').click();
    assert.match(app.location.href, /question.html/);
    app.respond(); await flush();
    assert.equal(app.element('nextQuestionButton').disabled, false);
    for (let i = 0; i < 4; i++) app.element('nextQuestionButton').click();
    assert.match(app.location.href, /question.html/);
    app.element('nextQuestionButton').click();
    assert.equal(app.location.href, 'index.html');
    assert.equal(app.element('nextQuestionButton').disabled, true);
});

test('finish button opens an Omoi confirmation dialog', async () => {
    const app = setup();
    app.respond(); await flush();
    app.element('finishButton').click();
    assert.equal(app.element('finishConfirmDialog').open, true);
    assert.equal(app.element('cancelFinishButton').focused, true);
    assert.equal(app.location.href, 'https://example.test/question.html?level=2');
});

test('confirming finish ends the session', async () => {
    const app = setup();
    app.respond(); await flush();
    app.element('finishButton').click();
    app.element('confirmFinishButton').click();
    assert.equal(app.element('finishConfirmDialog').open, false);
    assert.equal(app.location.href, 'index.html');
    assert.equal(app.element('finishButton').disabled, true);
});

test('canceling finish confirmation keeps the current session open', async () => {
    const app = setup();
    app.respond(); await flush();
    app.element('finishButton').click();
    app.element('cancelFinishButton').click();
    assert.equal(app.element('finishConfirmDialog').open, false);
    assert.equal(app.location.href, 'https://example.test/question.html?level=2');
    assert.equal(app.element('finishButton').disabled, false);
    assert.equal(app.element('finishButton').focused, true);
});

test('previous question navigation is disabled initially and returns to the prior question', async () => {
    const app = setup();
    app.respond(); await flush();
    const firstQuestion = app.element('questionText').textContent;
    assert.equal(app.element('previousQuestionButton').disabled, true);
    app.element('nextQuestionButton').click();
    assert.equal(app.element('previousQuestionButton').disabled, false);
    assert.notEqual(app.element('questionText').textContent, firstQuestion);
    app.element('previousQuestionButton').click();
    assert.equal(app.element('previousQuestionButton').disabled, true);
    assert.equal(app.element('questionText').textContent, firstQuestion);
});

test('legacy count parameter does not limit available questions', async () => {
    const app = setup('?level=2&count=1');
    app.respond(); await flush();
    for (let i = 0; i < 4; i++) app.element('nextQuestionButton').click();
    app.element('nextQuestionButton').click();
    assert.equal(app.location.href, 'index.html');
});

for (const search of ['?', '?level=0', '?level=1', '?level=1&level=2', '?level=2&level=2']) {
    test(`invalid parameters do not fetch: ${search}`, () => {
        const app = setup(search);
        assert.equal(app.requests.length, 0);
        assert.match(app.element('questionText').textContent, /条件が正しくありません/);
        assert.equal(app.element('nextQuestionButton').disabled, true);
    });
}

for (const failure of ['http', 'network', 'json', 'shape', 'card', 'timeout']) {
    test(`${failure} displays error and permits a successful retry`, async () => {
        const app = setup();
        if (failure === 'http') app.respond([], false);
        if (failure === 'network') app.requests[0].reject(new Error('Offline'));
        if (failure === 'json') {
            const [questionsRequest, readingsRequest] = app.requests;
            questionsRequest.resolve({
                ok: true, json: async () => { throw new SyntaxError('Bad JSON'); }
            });
            readingsRequest.resolve({ ok: true, json: async () => ({}) });
        }
        if (failure === 'shape') app.respond({}, true, {});
        if (failure === 'card') app.respond([{ level: 2, question: null }]);
        if (failure === 'timeout') app.timeout();
        await flush();
        assert.equal(app.errors.length, 1);
        assert.equal(app.element('retryLoadButton').hidden, false);
        assert.equal(app.element('nextQuestionButton').disabled, true);
        app.element('retryLoadButton').click();
        app.element('retryLoadButton').click();
        assert.equal(app.requests.length, 4);
        app.respond(); await flush();
        assert.equal(app.element('retryLoadButton').hidden, true);
        assert.equal(app.element('nextQuestionButton').disabled, false);
    });
}

test('empty data is distinct from failure', async () => {
    const app = setup(); app.respond([]); await flush();
    assert.match(app.element('questionText').textContent, /まだありません/);
    assert.equal(app.element('retryLoadButton').hidden, true);
    assert.equal(app.errors.length, 0);
});

test('detail button toggles the compact background panel and resets on navigation', async () => {
    const app = setup('?level=3'); app.respond(helperCards); await flush();
    app.element('detailButton').click();
    assert.equal(app.element('detailPanel').hidden, false);
    assert.equal(app.element('detailButton').attrs['aria-expanded'], 'true');
    assert.equal(app.element('detailButtonLabel').textContent, '背景を閉じる');
    app.element('detailButton').click();
    assert.equal(app.element('detailPanel').hidden, true);
    assert.equal(app.element('detailButton').attrs['aria-expanded'], 'false');
    assert.equal(app.element('detailButtonLabel').textContent, '問いの背景');
    app.element('detailButton').click();
    app.element('nextQuestionButton').click();
    assert.equal(app.element('detailPanel').hidden, true);
    assert.equal(app.element('detailButton').attrs['aria-expanded'], 'false');
});

test('scenario, hints, and terms are rendered and reset when moving to another card', async () => {
    const data = [
        {
            ...helperCards[0],
            scenario: 'Scenario context',
            hints: ['Hint one', 'Hint two'],
            terms: [{ term: 'Term', definition: 'Definition' }]
        },
        { ...cards[1], level: 3 }
    ];
    const app = setup('?level=3'); app.respond(data); await flush();

    assert.equal(app.element('scenarioText').textContent, 'Scenario context');
    assert.equal(app.element('scenarioBlock').attrs['aria-hidden'], 'false');
    assert.equal(app.element('scenarioText').textContent, 'Scenario context');
    assert.equal(app.element('hintButton').hidden, false);
    assert.deepEqual(app.element('hintsList').children.map(item => item.textContent), ['Hint one', 'Hint two']);
    assert.equal(app.element('termsSection').hidden, false);
    assert.deepEqual(app.element('termsList').children.map(item => item.textContent), ['Term', 'Definition']);

    app.element('hintButton').click();
    assert.equal(app.element('hintsPanel').hidden, false);
    assert.equal(app.element('hintButton').attrs['aria-expanded'], 'true');
    app.element('detailButton').click();
    assert.equal(app.element('hintsPanel').hidden, true);
    assert.equal(app.element('detailPanel').hidden, false);

    app.element('nextQuestionButton').click();
    assert.equal(app.element('scenarioBlock').attrs['aria-hidden'], 'true');
    assert.equal(app.element('hintButton').hidden, true);
    assert.equal(app.element('hintsPanel').hidden, true);
    assert.equal(app.element('detailPanel').hidden, true);
});

test('furigana starts off, toggles safely, and stays enabled across questions', async () => {
    const data = [
        { id: 'reading-1', level: 2, question: '学校で話す' },
        { id: 'reading-2', level: 2, question: '選択を考える' }
    ];
    const readings = {
        'reading-1': {
            question: [
                { ruby: '学校', reading: 'がっこう' },
                { text: 'で' },
                { ruby: '話', reading: 'はな' },
                { text: 'す' }
            ]
        },
        'reading-2': {
            question: [
                { ruby: '選択', reading: 'せんたく' },
                { text: 'を' },
                { ruby: '考', reading: 'かんが' },
                { text: 'える' }
            ]
        }
    };
    const app = setup();
    app.respond(data, true, readings);
    await flush();

    const toggle = app.element('furiganaToggle');
    assert.equal(toggle.hidden, false);
    assert.equal(toggle.attrs['aria-pressed'], 'false');
    assert.equal(app.element('questionText').textContent, data[0].question);

    toggle.click();
    assert.equal(toggle.attrs['aria-pressed'], 'true');
    assert.equal(app.element('questionText').textContent, '学校がっこうで話はなす');

    app.element('nextQuestionButton').click();
    assert.equal(app.element('questionText').textContent, '選択せんたくを考かんがえる');
    toggle.click();
    assert.equal(app.element('questionText').textContent, data[1].question);
    assert.equal(app.element('termsSection').hidden, true);
});

test('classroom mode enlarges the question and stays enabled across cards', async () => {
    const app = setup();
    app.respond();
    await flush();

    const toggle = app.element('classroomModeToggle');
    const questionScreen = app.element('.question-screen');
    assert.equal(toggle.hidden, false);
    assert.equal(toggle.attrs['aria-pressed'], 'false');
    assert.equal(questionScreen.classList.contains('classroom-mode'), false);

    toggle.click();
    assert.equal(toggle.attrs['aria-pressed'], 'true');
    assert.equal(toggle.textContent, '授業モードを終了');
    assert.equal(questionScreen.classList.contains('classroom-mode'), true);

    app.element('nextQuestionButton').click();
    assert.equal(toggle.attrs['aria-pressed'], 'true');
    assert.equal(questionScreen.classList.contains('classroom-mode'), true);

    toggle.click();
    assert.equal(toggle.attrs['aria-pressed'], 'false');
    assert.equal(toggle.textContent, '授業モード');
    assert.equal(questionScreen.classList.contains('classroom-mode'), false);
});

test('question loading rejects missing kanji readings and allows retry', async () => {
    const data = [{ id: 'missing-reading', level: 2, question: '学校' }];
    const app = setup();
    app.respond(data, true, {
        'missing-reading': { question: [{ text: '学校' }] }
    });
    await flush();
    assert.equal(app.errors.length, 1);
    assert.equal(app.element('retryLoadButton').hidden, false);
    assert.equal(app.element('nextQuestionButton').disabled, true);

    app.element('retryLoadButton').click();
    app.respond(data, true, {
        'missing-reading': { question: [{ ruby: '学校', reading: 'がっこう' }] }
    });
    await flush();
    assert.equal(app.element('nextQuestionButton').disabled, false);
});

test('furigana applies to scenarios and all supporting question content', async () => {
    const data = [{
        id: 'reading-helpers',
        level: 3,
        question: '学校',
        scenario: '家族',
        summary: [
            { type: 'text', text: '理由' },
            { type: 'bullets', items: [{ label: '対象', text: '読書' }] }
        ],
        hints: ['何'],
        detail: {
            text: '物語',
            sources: [{ title: '出典', url: 'https://example.test/source' }]
        },
        terms: [{ term: '漢字', definition: '意味' }]
    }];
    const ruby = (base, reading) => [{ ruby: base, reading }];
    const readings = {
        'reading-helpers': {
            question: ruby('学校', 'がっこう'),
            scenario: ruby('家族', 'かぞく'),
            'summary.0.text': ruby('理由', 'りゆう'),
            'summary.1.items.0.label': ruby('対象', 'たいしょう'),
            'summary.1.items.0.text': ruby('読書', 'どくしょ'),
            'hints.0': ruby('何', 'なに'),
            'detail.text': ruby('物語', 'ものがたり'),
            'terms.0.term': ruby('漢字', 'かんじ'),
            'terms.0.definition': ruby('意味', 'いみ'),
            'detail.sources.0.title': ruby('出典', 'しゅってん')
        }
    };
    const app = setup('?level=3');
    app.respond(data, true, readings);
    await flush();
    app.element('furiganaToggle').click();

    assert.equal(app.element('scenarioText').textContent, '家族かぞく');
    app.element('questionSummaryToggle').click();
    assert.match(app.element('questionSummaryText').textContent, /理由りゆう/);
    assert.match(app.element('questionSummaryText').textContent, /対象たいしょう/);
    assert.match(app.element('questionSummaryText').textContent, /読書どくしょ/);

    app.element('hintButton').click();
    assert.equal(app.element('hintsList').children[0].textContent, '何なに');
    app.element('detailButton').click();
    assert.equal(app.element('detailText').textContent, '物語ものがたり');
    assert.deepEqual(app.element('termsList').children.map(item => item.textContent), [
        '漢字かんじ', '意味いみ'
    ]);
    assert.equal(app.element('sourceList').children[0].children[0].textContent, '出典しゅってん');
});

test('Escape closes the furigana settings panel and restores focus to its icon', () => {
    const app = setup();
    const settings = app.element('.furigana-settings');
    settings.open = true;
    app.document.keydown({ key: 'Escape' });
    assert.equal(settings.open, false);
    assert.equal(app.element('furiganaSettingsSummary').focused, true);
});

test('escape closes the hints panel and restores focus to its button', async () => {
    const app = setup('?level=3'); app.respond([{ ...helperCards[0], hints: ['Hint'] }]); await flush();
    app.element('hintButton').click();
    app.document.keydown({ key: 'Escape' });
    assert.equal(app.element('hintsPanel').hidden, true);
    assert.equal(app.element('hintButton').attrs['aria-expanded'], 'false');
    assert.equal(app.element('hintButton').focused, true);
});


test('escape closes the detail panel and restores focus', async () => {
    const app = setup('?level=3'); app.respond(helperCards); await flush();
    app.element('detailButton').click();
    assert.equal(app.element('detailPanel').hidden, false);
    app.document.keydown({ key: 'Escape' });
    assert.equal(app.element('detailPanel').hidden, true);
    assert.equal(app.element('detailButton').attrs['aria-expanded'], 'false');
    assert.equal(app.element('detailButton').focused, true);
    assert.equal(app.element('detailButtonLabel').textContent, '問いの背景');
});

test('reviewed summaries are available without a query, start closed, and clear on navigation', async () => {
    const app = setup('?level=3');
    app.respond([
        { ...cards[0], level: 3, summary: [{ type: 'bullets', items: [{ label: 'Decision', text: '<img src=x onerror=alert(1)>' }] }] },
        { ...cards[1], level: 3 }
    ]);
    await flush();
    assert.equal(app.element('questionSummaryToggle').hidden, false);
    assert.equal(app.element('questionSummary').hidden, true);
    assert.equal(app.element('questionSummaryText').children.length, 0);
    app.element('questionSummaryToggle').click();
    assert.equal(app.element('questionSummary').hidden, false);
    assert.equal(app.element('questionSummaryToggle').attrs['aria-expanded'], 'true');
    const list = app.element('questionSummaryText').children[0];
    assert.equal(list.children[0].children[1].textContent, '<img src=x onerror=alert(1)>');
    app.element('nextQuestionButton').click();
    assert.equal(app.element('questionSummaryToggle').hidden, true);
    assert.equal(app.element('questionSummary').hidden, true);
    assert.equal(app.element('questionSummaryText').children.length, 0);
    app.element('previousQuestionButton').click();
    assert.equal(app.element('questionSummaryToggle').hidden, false);
    assert.equal(app.element('questionSummary').hidden, true);
});

test('summary, hints and background are mutually exclusive, and Escape restores summary focus', async () => {
    const app = setup('?level=3');
    app.respond([{ ...helperCards[0], summary: [{ type: 'text', text: 'What is being decided.' }], hints: ['Another view?'] }]);
    await flush();
    app.element('questionSummaryToggle').click();
    app.element('hintButton').click();
    assert.equal(app.element('questionSummary').hidden, true);
    assert.equal(app.element('hintsPanel').hidden, false);
    app.element('questionSummaryToggle').click();
    assert.equal(app.element('hintsPanel').hidden, true);
    app.element('detailButton').click();
    assert.equal(app.element('questionSummary').hidden, true);
    assert.equal(app.element('detailPanel').hidden, false);
    app.element('questionSummaryToggle').click();
    assert.equal(app.element('detailPanel').hidden, true);
    app.document.keydown({ key: 'Escape' });
    assert.equal(app.element('questionSummary').hidden, true);
    assert.equal(app.element('questionSummaryToggle').focused, true);
    assert.equal(app.element('questionSummaryText').children.length, 0);
});

test('Level 2 ignores well-formed helpers even if unexpected data includes them', async () => {
    for (const level of [2]) {
        const app = setup(`?level=${level}`);
        app.respond([{ ...helperCards[0], level, summary: [{ type: 'text', text: 'Not for this level.' }], hints: ['A hint?'], terms: [{ term: 'Term', definition: 'Meaning' }] }]);
        await flush();
        assert.equal(app.element('nextQuestionButton').disabled, false);
        for (const id of ['questionSummaryToggle', 'hintButton', 'detailButton']) assert.equal(app.element(id).hidden, true, id);
        assert.equal(app.element('questionSummaryText').children.length, 0);
        assert.equal(app.element('hintsList').children.length, 0);
        assert.equal(app.element('termsList').children.length, 0);
    }
});

test('omitted helpers, hints-only and terms-only cards work without a background explanation', async () => {
    for (const support of [{}, { hints: ['A useful follow-up?'] }, { terms: [{ term: 'Term', definition: 'Meaning' }] }]) {
        const app = setup('?level=4');
        app.respond([{ ...cards[0], level: 4, ...support }]);
        await flush();
        assert.equal(app.element('nextQuestionButton').disabled, false);
        assert.equal(app.element('questionSummaryToggle').hidden, true);
        assert.equal(app.element('hintButton').hidden, !support.hints);
        assert.equal(app.element('detailButton').hidden, !support.terms);
        if (support.terms) {
            app.element('detailButton').click();
            assert.equal(app.element('termsSection').hidden, false);
            assert.equal(app.element('sourceSection').hidden, true);
            assert.equal(app.element('detailText').textContent, '');
        }
    }
});
