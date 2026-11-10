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
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(search = '?level=2') {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            hidden: false, disabled: false, textContent: '', attrs: {}, children: [],
            classList: { remove() {}, toggle() {} },
            setAttribute(key, value) { this.attrs[key] = value; },
            removeAttribute(key) { delete this[key]; },
            set innerHTML(value) { this.children = []; },
            addEventListener(event, handler) {
                if (event === 'close') this.onClose = handler;
                else this[event] = handler;
            },
            showModal() { this.open = true; },
            close() {
                this.open = false;
                this.onClose?.();
            },
            appendChild(child) { this.children.push(child); }, focus() { this.focused = true; },
            scrollHeight: 100, clientHeight: 100, scrollTop: 0
        });
        return elements.get(id);
    };
    const requests = [], errors = [];
    let onTimeout;
    const location = { search, href: `https://example.test/question.html${search}` };
    const documentStub = {
        getElementById: element,
        querySelector: element,
        createElement() {
            return {
                textContent: '', children: [],
                appendChild(child) { this.children.push(child); }
            };
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
        respond(data = cards, ok = true) {
            requests.at(-1).resolve({ ok, status: ok ? 200 : 404, json: async () => structuredClone(data) });
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
        if (failure === 'json') app.requests[0].resolve({ ok: true, json: async () => { throw new SyntaxError('Bad JSON'); } });
        if (failure === 'shape') app.respond({});
        if (failure === 'card') app.respond([{ level: 2, question: null }]);
        if (failure === 'timeout') app.timeout();
        await flush();
        assert.equal(app.errors.length, 1);
        assert.equal(app.element('retryLoadButton').hidden, false);
        assert.equal(app.element('nextQuestionButton').disabled, true);
        app.element('retryLoadButton').click();
        app.element('retryLoadButton').click();
        assert.equal(app.requests.length, 2);
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
    assert.equal(app.element('termsSection').hidden, true);
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
