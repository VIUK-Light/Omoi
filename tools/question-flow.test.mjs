import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../question.js', import.meta.url), 'utf8');
const cards = Array.from({ length: 5 }, (_, i) => ({
    id: `test-${i}`, level: 1, question: `Question ${i}`,
    detail: { text: 'Background', sources: [] }
}));
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(search = '?level=1&count=5') {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            hidden: false, disabled: false, textContent: '', attrs: {},
            classList: { remove() {}, toggle() {} },
            setAttribute(key, value) { this.attrs[key] = value; },
            removeAttribute(key) { delete this[key]; },
            addEventListener(event, handler) { this[event] = handler; },
            appendChild() {}, focus() { this.focused = true; },
            scrollHeight: 100, clientHeight: 100, scrollTop: 0
        });
        return elements.get(id);
    };
    const requests = [], errors = [];
    let onTimeout;
    const location = { search, href: `https://example.test/question.html${search}` };
    vm.runInNewContext(code, {
        URL, URLSearchParams, AbortController,
        setTimeout(fn) { onTimeout = fn; return 1; }, clearTimeout() {},
        console: { error(...args) { errors.push(args); } },
        document: { getElementById: element, querySelector: element, createElement: element },
        window: { location, addEventListener() {} }, requestAnimationFrame(fn) { fn(); },
        fetch(url, options) {
            return new Promise((resolve, reject) => {
                requests.push({ url, resolve, reject });
                options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
            });
        }
    });
    return { element, requests, location, errors, timeout: () => onTimeout(),
        respond(data = cards, ok = true) {
            requests.at(-1).resolve({ ok, status: ok ? 200 : 404, json: async () => structuredClone(data) });
        }
    };
}

test('loading blocks navigation, then five cards finish once', async () => {
    const app = setup();
    assert.equal(app.element('nextQuestionButton').disabled, true);
    app.element('nextQuestionButton').click();
    assert.match(app.location.href, /question.html/);
    app.respond(); await flush();
    assert.equal(app.element('nextQuestionButton').disabled, false);
    assert.equal(app.element('reportQuestionLink').hidden, false);
    for (let i = 0; i < 4; i++) app.element('skipQuestionButton').click();
    assert.match(app.location.href, /question.html/);
    app.element('nextQuestionButton').click();
    assert.equal(app.location.href, 'finish.html?level=1&count=5');
    assert.equal(app.element('nextQuestionButton').disabled, true);
});

for (const search of ['?level=1', '?level=0&count=5', '?level=1&count=-1', '?level=1&count=6', '?level=1&level=2&count=5']) {
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
        if (failure === 'card') app.respond([{ level: 1, question: null }]);
        if (failure === 'timeout') app.timeout();
        await flush();
        assert.equal(app.errors.length, 1);
        assert.equal(app.element('retryLoadButton').hidden, false);
        assert.equal(app.element('nextQuestionButton').disabled, true);
        assert.equal(app.element('reportQuestionLink').hidden, true);
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

test('detail state and focus reset correctly', async () => {
    const app = setup(); app.respond(); await flush();
    app.element('detailButton').click();
    assert.equal(app.element('detailButton').attrs['aria-expanded'], 'true');
    app.element('closeDetailButton').click();
    assert.equal(app.element('detailButton').focused, true);
    app.element('detailButton').click();
    app.element('nextQuestionButton').click();
    assert.equal(app.element('detailPanel').hidden, true);
    assert.equal(app.element('detailButton').attrs['aria-expanded'], 'false');
});
