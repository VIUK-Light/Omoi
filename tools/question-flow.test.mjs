import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { encodeSharePayload } = require('../スクリプト/question-share.js');
const progressCode = fs.readFileSync(new URL('../スクリプト/progress.js', import.meta.url), 'utf8');
const questionCode = fs.readFileSync(new URL('../スクリプト/question.js', import.meta.url), 'utf8');
const code = `${progressCode}\n${questionCode}`;
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
function createStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
        clear() { values.clear(); },
        key(index) { return [...values.keys()][index] ?? null; },
        get length() { return values.size; }
    };
}
function setup(search = '?level=2', storage = createStorage()) {
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
                contains() { return false; },
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
        window: {
            location,
            localStorage: storage,
            addEventListener() {},
            setTimeout(fn) { onTimeout = fn; return 1; },
            clearTimeout() {},
            OmoiShare: {
                decodeSharePayload: value => {
                    try {
                        const padded = value.replace(/-/g, '+').replace(/_/g, '/') +
                            '==='.slice(0, (4 - (value.length % 4)) % 4);
                        const binary = atob(padded);
                        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
                        const wordCount = bytes.length === 96 ? 12 : (bytes.length === 104 ? 13 : 0);
                        if (!wordCount) return [];
                        const indices = [];
                        for (let w = 0; w < wordCount; w++) {
                            let word = 0n;
                            for (let b = 7; b >= 0; b--) {
                                word = (word << 8n) | BigInt(bytes[w * 8 + b]);
                            }
                            for (let b = 0; b < 64; b++) {
                                if (word & (1n << BigInt(b))) indices.push(w * 64 + b);
                            }
                        }
                        return indices;
                    } catch (error) {
                        return [];
                    }
                }
            }
        },
        requestAnimationFrame(fn) { fn(); },
        navigator: { clipboard: { writeText: async () => {} } },
        fetch(url, options) {
            return new Promise((resolve, reject) => {
                requests.push({ url, resolve, reject, resolved: false });
                options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
            });
        }
    });
    return {
        element, requests, location, errors, document: documentStub, storage,
        window: { OmoiShare: { encodeSharePayload } },
        timeout: () => onTimeout(),
        respond(data = cards, ok = true, readings = plainReadings(data)) {
            const [questionsRequest, readingsRequest] = requests.slice(-2);
            questionsRequest.resolved = true;
            readingsRequest.resolved = true;
            questionsRequest.resolve({
                ok, status: ok ? 200 : 404,
                json: async () => structuredClone(data)
            });
            readingsRequest.resolve({
                ok, status: ok ? 200 : 404,
                json: async () => structuredClone(readings)
            });
        },
        respondAll(byLevel, ok = true) {
            for (const request of requests) {
                if (request.resolved) continue;
                const match = /(?:^|\/)level(\d+)(-furigana)?\.json$/.exec(request.url);
                if (!match) continue;
                const level = Number(match[1]);
                const data = byLevel[level] ?? [];
                const body = match[2] ? plainReadings(data) : data;
                request.resolved = true;
                request.resolve({
                    ok, status: ok ? 200 : 404,
                    json: async () => structuredClone(body)
                });
            }
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
    assert.match(app.location.href, /question\.html/);
    assert.equal(app.element('sessionComplete').hidden, false);
    assert.equal(app.element('nextQuestionButton').disabled, true);
    assert.equal(app.storage.getItem('omoi-progress'), null);
});

test('finish button opens an Omoi confirmation dialog', async () => {
    const app = setup();
    app.respond(); await flush();
    app.element('finishButton').click();
    assert.equal(app.element('finishConfirmDialog').open, true);
    assert.equal(app.element('cancelFinishButton').focused, true);
    assert.equal(app.location.href, 'https://example.test/question.html?level=2');
});

test('shared question shows its label and other-questions link without finish or classroom mode', async () => {
    const app = setup('?level=2&id=test-2');
    app.respond(); await flush();

    assert.equal(app.element('sharedQuestionNotice').hidden, false);
    assert.equal(app.element('otherQuestionsLink').hidden, false);
    assert.equal(app.element('changeCategoryLink').hidden, true);
    assert.equal(app.element('finishButton').hidden, true);
    assert.equal(app.element('classroomModeToggle').hidden, true);
    assert.equal(app.element('questionText').textContent, cards[2].question);

    app.element('finishButton').click();
    app.element('classroomModeToggle').click();
    assert.equal(app.element('finishConfirmDialog').open, undefined);
    assert.equal(app.element('.question-screen').classList.contains('classroom-mode'), false);
});

test('confirming finish ends the session', async () => {
    const app = setup();
    app.respond(); await flush();
    app.element('finishButton').click();
    app.element('confirmFinishButton').click();
    assert.equal(app.element('finishConfirmDialog').open, false);
    assert.equal(app.location.href, '../../index.html');
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

test('clicking another button clears the copied-link status', async () => {
    const app = setup();
    app.respond(); await flush();
    await app.element('shareUrlButton').click();
    assert.equal(app.element('shareStatus').textContent, '✓ リンクをコピーしました');

    app.document.click({
        target: { closest: () => app.element('hintButton') }
    });
    assert.equal(app.element('shareStatus').textContent, '');
});

test('the copied-link status clears after three seconds', async () => {
    const app = setup();
    app.respond(); await flush();
    await app.element('shareUrlButton').click();
    assert.equal(app.element('shareStatus').textContent, '✓ リンクをコピーしました');

    app.timeout();
    assert.equal(app.element('shareStatus').textContent, '');
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
    assert.match(app.location.href, /question\.html/);
    assert.equal(app.element('sessionComplete').hidden, false);
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

test('text size has three levels and classroom mode is independent', async () => {
    const app = setup('?mode=student');
    app.respondAll({
        2: [
            { id: 't2a', level: 2, sensitivity: 1, question: 'T2a', labels: ['student', 'school'] },
            { id: 't2b', level: 2, sensitivity: 1, question: 'T2b', labels: ['student', 'school'] }
        ],
        3: [],
        4: []
    });
    await flush();

    const smallToggle = app.element('smallTextToggle');
    const mediumToggle = app.element('mediumTextToggle');
    const largeToggle = app.element('largeTextToggle');
    const toggle = app.element('classroomModeToggle');
    const questionScreen = app.element('.question-screen');
    assert.equal(app.element('textSizeControl').hidden, false);
    assert.equal(toggle.hidden, false);
    assert.equal(smallToggle.attrs['aria-pressed'], 'false');
    assert.equal(mediumToggle.attrs['aria-pressed'], 'true');
    assert.equal(largeToggle.attrs['aria-pressed'], 'false');
    assert.equal(questionScreen.classList.contains('text-size-small'), false);
    assert.equal(questionScreen.classList.contains('text-size-large'), false);
    assert.equal(questionScreen.classList.contains('classroom-mode'), false);

    smallToggle.click();
    assert.equal(smallToggle.attrs['aria-pressed'], 'true');
    assert.equal(mediumToggle.attrs['aria-pressed'], 'false');
    assert.equal(questionScreen.classList.contains('text-size-small'), true);

    largeToggle.click();
    assert.equal(largeToggle.attrs['aria-pressed'], 'true');
    assert.equal(smallToggle.attrs['aria-pressed'], 'false');
    assert.equal(questionScreen.classList.contains('text-size-small'), false);
    assert.equal(questionScreen.classList.contains('text-size-large'), true);

    toggle.click();
    assert.equal(largeToggle.attrs['aria-pressed'], 'true');
    assert.equal(questionScreen.classList.contains('text-size-large'), true);
    assert.equal(toggle.attrs['aria-pressed'], 'true');
    assert.equal(toggle.textContent, '授業モードを終了');
    assert.equal(questionScreen.classList.contains('classroom-mode'), true);
    assert.equal(smallToggle.disabled, true);
    assert.equal(mediumToggle.disabled, true);
    assert.equal(largeToggle.disabled, true);

    // 授業モード中は文字の大きさを変えられない。
    smallToggle.click();
    assert.equal(questionScreen.classList.contains('text-size-small'), false);
    assert.equal(questionScreen.classList.contains('text-size-large'), true);

    app.element('nextQuestionButton').click();
    assert.equal(largeToggle.attrs['aria-pressed'], 'true');
    assert.equal(questionScreen.classList.contains('text-size-large'), true);
    assert.equal(questionScreen.classList.contains('classroom-mode'), true);

    toggle.click();
    assert.equal(toggle.attrs['aria-pressed'], 'false');
    assert.equal(toggle.textContent, '授業モード');
    assert.equal(questionScreen.classList.contains('classroom-mode'), false);
    assert.equal(largeToggle.attrs['aria-pressed'], 'true');
    assert.equal(smallToggle.disabled, false);
    assert.equal(mediumToggle.disabled, false);
    assert.equal(largeToggle.disabled, false);

    mediumToggle.click();
    assert.equal(mediumToggle.attrs['aria-pressed'], 'true');
    assert.equal(largeToggle.attrs['aria-pressed'], 'false');
    assert.equal(questionScreen.classList.contains('text-size-large'), false);
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

test('the share button opens a menu with a link and a picture', async () => {
    const app = setup();
    app.respond(); await flush();

    assert.equal(app.element('shareMenu').hidden, true);
    app.element('shareButton').click();
    assert.equal(app.element('shareMenu').hidden, false);
    assert.equal(app.element('shareButton').attrs['aria-expanded'], 'true');

    app.document.click({ target: { closest: () => null } });
    assert.equal(app.element('shareMenu').hidden, true);
});

test('a normal session is saved on the device and reloads without shared mode', async () => {
    const app = setup();
    app.respond(); await flush();

    const saved = JSON.parse(app.storage.getItem('omoi-progress'));
    assert.equal(saved.version, 2);
    assert.equal(saved.mode, 'all');
    assert.equal(saved.level, 2);
    assert.equal(saved.index, 0);
    assert.deepEqual(saved.ids, cards.map(card => card.id));
    assert.match(saved.token, /^[A-Za-z0-9_-]{6,64}$/);

    const reload = setup(`?level=2&id=${saved.ids[0]}&session=${saved.token}`, app.storage);
    reload.respond(); await flush();

    assert.equal(reload.element('sharedQuestionNotice').hidden, true);
    assert.equal(reload.element('nextQuestionButton').hidden, false);
    assert.equal(reload.element('finishButton').hidden, false);
    assert.equal(reload.element('questionText').textContent, cards[0].question);
});

test('a session token without saved progress falls back to a shared question', async () => {
    const app = setup('?level=2&id=test-2&session=abcdef123456');
    app.respond(); await flush();

    assert.equal(app.element('sharedQuestionNotice').hidden, false);
    assert.equal(app.element('nextQuestionButton').hidden, true);
    assert.equal(app.element('questionText').textContent, cards[2].question);
});

test('reloading restores the same position and order', async () => {
    const app = setup();
    app.respond(); await flush();
    app.element('nextQuestionButton').click();
    app.element('nextQuestionButton').click();
    const current = app.element('questionText').textContent;

    const saved = JSON.parse(app.storage.getItem('omoi-progress'));
    assert.equal(saved.index, 2);

    const reload = setup(`?level=2&id=${saved.ids[saved.index]}&session=${saved.token}`, app.storage);
    reload.respond(); await flush();

    assert.equal(reload.element('questionText').textContent, current);
    assert.equal(reload.element('previousQuestionButton').disabled, false);
    reload.element('previousQuestionButton').click();
    assert.equal(reload.element('questionText').textContent, cards[1].question);
});

test('changing the category discards the saved progress', async () => {
    const app = setup();
    app.respond(); await flush();
    app.element('nextQuestionButton').click();
    assert.notEqual(app.storage.getItem('omoi-progress'), null);

    app.element('changeCategoryLink').click();
    await flush();
    assert.equal(app.storage.getItem('omoi-progress'), null);
});

test('finishing mid-way keeps the progress, finishing every question clears it', async () => {
    const app = setup();
    app.respond(); await flush();
    app.element('finishButton').click();
    app.element('confirmFinishButton').click();
    assert.notEqual(app.storage.getItem('omoi-progress'), null);

    const complete = setup();
    complete.respond(); await flush();
    for (let index = 0; index < cards.length; index++) {
        complete.element('nextQuestionButton').click();
    }
    assert.match(complete.location.href, /question\.html/);
    assert.equal(complete.element('sessionComplete').hidden, false);
    assert.equal(complete.element('sessionCompleteTitle').focused, true);
    assert.equal(complete.storage.getItem('omoi-progress'), null);

    complete.element('restartSessionButton').click();
    assert.equal(complete.element('sessionComplete').hidden, true);
    assert.equal(complete.element('nextQuestionButton').disabled, false);
    const restarted = JSON.parse(complete.storage.getItem('omoi-progress'));
    assert.equal(restarted.index, 0);
});

test('student mode loads every level, keeps student labels and saves mode v3', async () => {
    const byLevel = {
        2: [{ id: 's2', level: 2, question: 'Student 2', labels: ['student', 'school'] }],
        3: [{ id: 's3', level: 3, question: 'Student 3', labels: ['student', 'care'] }],
        4: [{ id: 'n4', level: 4, question: 'Adult 4', labels: ['care'] }]
    };
    const app = setup('?mode=student');
    app.respondAll(byLevel); await flush();

    assert.equal(app.element('questionText').textContent, 'Student 2');
    assert.equal(app.element('sharedQuestionNotice').hidden, true);

    const saved = JSON.parse(app.storage.getItem('omoi-progress'));
    assert.equal(saved.version, 3);
    assert.equal(saved.mode, 'student');
    assert.equal('level' in saved, false);
    assert.deepEqual(saved.ids, ['s2', 's3']);
    assert.deepEqual(saved.student, {
        themes: [],
        levels: [],
        count: 'all',
        heavy: false,
        classroom: false,
        source: 'default'
    });

    app.element('nextQuestionButton').click();
    assert.equal(app.element('questionText').textContent, 'Student 3');

    const reload = setup(`?mode=student&session=${saved.token}`, app.storage);
    reload.respondAll(byLevel); await flush();
    assert.equal(reload.element('questionText').textContent, 'Student 3');
    assert.equal(reload.element('sharedQuestionNotice').hidden, true);
});

test('student mode filters by theme, level, heavy content and count', async () => {
    const byLevel = {
        2: [
            { id: 'b2', level: 2, sensitivity: 1, question: 'Bullying 2', labels: ['student', 'bullying'] },
            { id: 'f2', level: 2, sensitivity: 4, question: 'Friend heavy', labels: ['student', 'friendship'] },
            { id: 'b2b', level: 2, sensitivity: 2, question: 'Bullying 2b', labels: ['student', 'bullying'] }
        ],
        3: [{ id: 'b3', level: 3, sensitivity: 2, question: 'Bullying 3', labels: ['bullying'] }],
        4: [{ id: 'b4', level: 4, sensitivity: 3, question: 'Bullying 4', labels: ['bullying'] }]
    };
    const app = setup('?mode=student&themes=bullying&levels=2&count=2&heavy=1');
    app.respondAll(byLevel); await flush();

    // level=2 だけを読み、sensitivity 4 を除外して2問に絞る。
    assert.equal(app.requests.length, 2);
    assert.equal(app.element('questionText').textContent, 'Bullying 2');
    assert.equal(app.element('questionProgress').textContent, '1 / 2');

    const saved = JSON.parse(app.storage.getItem('omoi-progress'));
    assert.equal(saved.version, 3);
    assert.deepEqual(saved.ids, ['b2', 'b2b']);
    assert.deepEqual(saved.student, {
        themes: ['bullying'],
        levels: [2],
        count: 2,
        heavy: true,
        classroom: false,
        source: 'themes'
    });

    app.element('nextQuestionButton').click();
    assert.equal(app.element('questionText').textContent, 'Bullying 2b');
    assert.equal(app.element('questionProgress').textContent, '2 / 2');

    const reload = setup(`?mode=student&session=${saved.token}`, app.storage);
    reload.respondAll(byLevel); await flush();
    assert.equal(reload.element('questionText').textContent, 'Bullying 2b');
    assert.equal(reload.requestLevels?.join(',') ?? '2', '2');
});

test('student mode opens an explicitly selected deck through the share bitmask', async () => {
    const byLevel = {
        2: Array.from({ length: 5 }, (_, index) => ({
            id: `selected-${index}`,
            level: 2,
            sensitivity: 2,
            question: `Selected ${index}`,
            labels: ['student', 'school']
        })),
        3: [],
        4: []
    };
    const app = setup(`?mode=student&sel=${encodeSharePayload([1, 3])}`);
    app.respondAll(byLevel); await flush();

    assert.equal(app.element('questionText').textContent, 'Selected 1');
    assert.equal(app.element('questionProgress').textContent, '1 / 2');

    app.element('nextQuestionButton').click();
    assert.equal(app.element('questionText').textContent, 'Selected 3');

    const saved = JSON.parse(app.storage.getItem('omoi-progress'));
    assert.equal(saved.version, 3);
    assert.deepEqual(saved.ids, ['selected-1', 'selected-3']);
    assert.equal(saved.student.source, 'selection');
    assert.equal(saved.student.count, 'all');
});

test('classroom mode can start from the URL and its state is saved', async () => {
    const app = setup('?mode=student&classroom=1');
    app.respondAll({
        2: [
            { id: 's2a', level: 2, sensitivity: 1, question: 'S2a', labels: ['student', 'school'] },
            { id: 's2b', level: 2, sensitivity: 1, question: 'S2b', labels: ['student', 'school'] }
        ],
        3: [],
        4: []
    }); await flush();

    assert.equal(app.element('.question-screen').classList.contains('classroom-mode'), true);
    assert.equal(app.element('classroomModeButton').hidden, false);
    assert.equal(app.element('classroomModeButton').textContent, '授業モードを終了');
    assert.equal(app.element('questionProgress').hidden, false);
    assert.equal(app.element('questionProgress').textContent, '1 / 2');

    const saved = JSON.parse(app.storage.getItem('omoi-progress'));
    assert.equal(saved.classroom, true);

    app.element('nextQuestionButton').click();
    assert.equal(app.element('questionProgress').textContent, '2 / 2');

    app.element('classroomModeButton').click();
    assert.equal(app.element('.question-screen').classList.contains('classroom-mode'), false);
    assert.equal(app.element('classroomModeButton').textContent, '授業モード');
    const updated = JSON.parse(app.storage.getItem('omoi-progress'));
    assert.equal(updated.classroom, false);
});

test('arrow keys move between questions without leaving the page', async () => {
    const app = setup();
    app.respond(); await flush();
    const first = app.element('questionText').textContent;

    app.document.keydown({
        key: 'ArrowRight',
        target: { tagName: 'BODY' },
        preventDefault() {}
    });
    assert.notEqual(app.element('questionText').textContent, first);

    app.document.keydown({
        key: 'ArrowLeft',
        target: { tagName: 'BODY' },
        preventDefault() {}
    });
    assert.equal(app.element('questionText').textContent, first);
});

test('custom mode combines labels and individual questions across levels', async () => {
    const byLevel = {
        2: [{ id: 'c2', level: 2, question: 'Custom school', labels: ['school'] }],
        3: [{ id: 'c3', level: 3, question: 'Custom friend', labels: ['friendship'] }],
        4: [{ id: 'c4', level: 4, question: 'Custom selected', labels: ['care'] }]
    };
    const storage = createStorage();
    storage.setItem('omoi-selection', JSON.stringify({
        version: 1,
        token: 'seltoken123',
        mode: 'custom',
        labels: ['school'],
        ids: ['c4'],
        createdAt: Date.now()
    }));
    const app = setup('?mode=custom&session=seltoken123', storage);
    app.respondAll(byLevel); await flush();

    assert.equal(app.element('questionText').textContent, 'Custom school');
    assert.equal(app.element('sharedQuestionNotice').hidden, true);
    assert.equal(storage.getItem('omoi-selection'), null);

    const saved = JSON.parse(storage.getItem('omoi-progress'));
    assert.equal(saved.version, 2);
    assert.equal(saved.mode, 'custom');
    assert.deepEqual(saved.labels, ['school']);
    assert.deepEqual(saved.selectedIds, ['c4']);
    assert.deepEqual(saved.ids, ['c2', 'c4']);

    app.element('nextQuestionButton').click();
    assert.equal(app.element('questionText').textContent, 'Custom selected');

    const reload = setup(`?mode=custom&session=${saved.token}`, storage);
    reload.respondAll(byLevel); await flush();
    assert.equal(reload.element('questionText').textContent, 'Custom selected');
    reload.element('nextQuestionButton').click();
    assert.match(reload.location.href, /question\.html/);
    assert.equal(reload.element('sessionComplete').hidden, false);
    assert.equal(storage.getItem('omoi-progress'), null);
});

test('custom mode without a saved selection does not fetch', () => {
    const app = setup('?mode=custom&session=abcdef123456');
    assert.equal(app.requests.length, 0);
    assert.match(app.element('questionText').textContent, /見つかりませんでした/);
});

test('version 1 progress resumes as all mode and is rewritten as version 2', async () => {
    const storage = createStorage();
    storage.setItem('omoi-progress', JSON.stringify({
        version: 1,
        token: 'legacytoken1',
        level: 2,
        ids: cards.map(card => card.id),
        index: 2,
        updatedAt: Date.now()
    }));
    const app = setup('?level=2&session=legacytoken1', storage);
    app.respond(); await flush();

    assert.equal(app.element('questionText').textContent, cards[2].question);
    const saved = JSON.parse(storage.getItem('omoi-progress'));
    assert.equal(saved.version, 2);
    assert.equal(saved.mode, 'all');
    assert.equal(saved.level, 2);
    assert.equal(saved.index, 2);
});
