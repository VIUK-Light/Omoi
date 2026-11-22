import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { encodeSharePayload, decodeSharePayload, SHARE_BIT_COUNT } = require('../question-share.js');

test('round-trips indices within legacy 96-byte range', () => {
    const indices = [0, 1, 2, 63, 64, 200, 742, 767];
    const payload = encodeSharePayload(indices);
    assert.equal(typeof payload, 'string');
    assert.ok(payload.length > 0);
    assert.deepEqual(decodeSharePayload(payload), [...indices].sort((a, b) => a - b));
});

test('encodes legacy-range payloads as 96 bytes for backward compatibility', () => {
    const payload = encodeSharePayload([0, 10, 767]);
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (payload.length % 4)) % 4);
    const bytes = Buffer.from(padded, 'base64');
    assert.equal(bytes.length, 96);
});

test('decodes legacy 96-byte payloads and new 104-byte payloads', () => {
    const legacy = encodeSharePayload([5, 100, 743 - 1]);
    assert.deepEqual(decodeSharePayload(legacy), [5, 100, 742]);

    const extended = encodeSharePayload([0, 768, 800, 831]);
    const padded = extended.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (extended.length % 4)) % 4);
    const bytes = Buffer.from(padded, 'base64');
    assert.equal(bytes.length, 104);
    assert.deepEqual(decodeSharePayload(extended), [0, 768, 800, 831]);
});

test('rejects out-of-range indices and invalid payload lengths', () => {
    assert.equal(encodeSharePayload([832]), '');
    assert.deepEqual(decodeSharePayload(''), []);
    assert.deepEqual(decodeSharePayload('not-base64url'), []);
    // 95 bytes equivalent payload should be rejected by length check after decode
    assert.deepEqual(decodeSharePayload('AQI'), []);
});

test('share bit count covers extended range', () => {
    assert.equal(SHARE_BIT_COUNT, 832);
});
