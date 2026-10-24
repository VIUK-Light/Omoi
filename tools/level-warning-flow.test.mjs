import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const selectCode = fs.readFileSync(new URL('../select.js', import.meta.url), 'utf8');
const warningCode = fs.readFileSync(new URL('../warning.js', import.meta.url), 'utf8');
const warning3Code = fs.readFileSync(new URL('../warning3.js', import.meta.url), 'utf8');

function setupSelect() {
    const levelInputs = ['1', '2', '3', '4'].map(value => ({
        value, change: null,
        addEventListener(event, handler) { this[event] = handler; }
    }));
    const nextButton = {
        disabled: true, click: null,
        addEventListener(event, handler) { this[event] = handler; }
    };
    const location = { href: 'https://omoi.viuk-light.org/select.html' };

    vm.runInNewContext(selectCode, {
        URL,
        document: {
            querySelectorAll() { return levelInputs; },
            getElementById() { return nextButton; }
        },
        window: { location }
    });

    return {
        levelInputs, nextButton, location,
        choose(level) {
            levelInputs.find(input => input.value === level).change();
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

test('next stays disabled until a level is selected', () => {
    const app = setupSelect();
    assert.equal(app.nextButton.disabled, true);
    app.levelInputs[2].change();
    assert.equal(app.nextButton.disabled, false);
});

test('Level 3 routes through warning3.html without a count', () => {
    const app = setupSelect();
    app.choose('3');
    app.nextButton.click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/warning3.html');
});

test('Level 4 keeps routing through warning.html', () => {
    const app = setupSelect();
    app.choose('4');
    app.nextButton.click();
    assert.equal(app.location.href, 'https://omoi.viuk-light.org/warning.html');
});

test('Level 1 and 2 go directly to question.html', () => {
    for (const level of ['1', '2']) {
        const app = setupSelect();
        app.choose(level);
        app.nextButton.click();
        assert.equal(app.location.href, `https://omoi.viuk-light.org/question.html?level=${level}`);
    }
});

test('warning pages continue to questions without a count', () => {
    const level3 = setupWarning(warning3Code);
    const level4 = setupWarning(warningCode);
    assert.equal(level3.continueLink.href, 'question.html?level=3');
    assert.equal(level4.continueLink.href, 'question.html?level=4');
});
