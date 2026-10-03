import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const selectCode = fs.readFileSync(new URL('../select.js', import.meta.url), 'utf8');
const warning3Code = fs.readFileSync(new URL('../warning3.js', import.meta.url), 'utf8');

function setupSelect() {
    const levelInputs = ['1', '2', '3', '4'].map(value => ({
        value, change: null,
        addEventListener(event, handler) { this[event] = handler; }
    }));
    const countInputs = ['5', '10', '30', '60'].map(value => ({
        value, change: null,
        addEventListener(event, handler) { this[event] = handler; }
    }));
    const nextButton = {
        disabled: true, click: null,
        addEventListener(event, handler) { this[event] = handler; }
    };
    const location = { href: '' };

    vm.runInNewContext(selectCode, {
        document: {
            querySelectorAll(selector) {
                return selector.includes('level') ? levelInputs : countInputs;
            },
            getElementById() { return nextButton; }
        },
        window: { location }
    });

    return {
        levelInputs, countInputs, nextButton, location,
        choose(level, count) {
            levelInputs.find(input => input.value === level).change();
            countInputs.find(input => input.value === count).change();
        }
    };
}

function setupWarning3(search) {
    const continueLink = { href: '' };
    const location = { search };

    vm.runInNewContext(warning3Code, {
        URLSearchParams,
        document: { getElementById() { return continueLink; } },
        window: { location }
    });

    return { continueLink };
}

test('next stays disabled until both level and count are selected', () => {
    const app = setupSelect();
    assert.equal(app.nextButton.disabled, true);
    app.levelInputs[2].change();
    assert.equal(app.nextButton.disabled, true);
    app.countInputs[1].change();
    assert.equal(app.nextButton.disabled, false);
});

test('Level 3 routes through warning3.html and keeps the count', () => {
    const app = setupSelect();
    app.choose('3', '10');
    app.nextButton.click();
    assert.equal(app.location.href, 'warning3.html?count=10');
});

test('Level 4 keeps routing through warning.html', () => {
    const app = setupSelect();
    app.choose('4', '5');
    app.nextButton.click();
    assert.equal(app.location.href, 'warning.html?count=5');
});

test('Level 1 and 2 go directly to question.html', () => {
    for (const [level, count] of [['1', '5'], ['2', '30']]) {
        const app = setupSelect();
        app.choose(level, count);
        app.nextButton.click();
        assert.equal(app.location.href, `question.html?level=${level}&count=${count}`);
    }
});

test('warning3 continues to Level 3 questions with the same count', () => {
    const app = setupWarning3('?count=30');
    assert.equal(app.continueLink.href, 'question.html?level=3&count=30');
});
