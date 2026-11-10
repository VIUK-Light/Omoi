import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSummaryContent, renderSummaryContent } from './summary-content.mjs';

const graph = () => ({
    nodes: [{ id: 'sender', title: '送る人', body: ['原稿を持っている'], kind: 'person' }, { id: 'receiver', title: '受け取る人', kind: 'person' }],
    edges: [{ id: 'handover', source: 'sender', target: 'receiver', label: '渡す', directed: true }]
});
const baseUrl = 'https://example.test/preview/summary-content.mjs';

test('normalization owns all nested arrays and preserves literal text rather than HTML', () => {
    const input = [
        { type: 'text', text: '<img src=x onerror=alert(1)>' },
        { type: 'bullets', items: [{ label: '<strong>立場</strong>', text: '担当者' }, { text: '判断は未定' }] },
        { type: 'table', caption: '条件の比較', columns: ['項目', '条件'], rows: [['状況', '同じ']] },
        { type: 'diagram', data: graph(), options: { layout: 'pairs' } },
        { type: 'image', src: './assets/scene.svg', alt: '二人が原稿を受け渡す場面', caption: '架空の例' }
    ];
    const before = structuredClone(input);
    const output = normalizeSummaryContent(input, { baseUrl });
    assert.deepEqual(input, before);
    assert.equal(output[0].text, input[0].text);
    assert.equal(output[1].items[0].label, '<strong>立場</strong>');
    assert.equal(output[4].src, 'https://example.test/preview/assets/scene.svg');
    input[1].items[0].text = '書き換え';
    input[2].columns[0] = '書き換え';
    input[2].rows[0][0] = '書き換え';
    input[3].data.nodes[0].body.push('追加');
    input[3].data.edges[0].label = '書き換え';
    assert.equal(output[1].items[0].text, '担当者');
    assert.equal(output[2].columns[0], '項目');
    assert.equal(output[2].rows[0][0], '状況');
    assert.deepEqual(output[3].data.nodes[0].body, ['原稿を持っている']);
    assert.equal(output[3].data.edges[0].label, '渡す');
});

test('invalid or incomplete presentation blocks are rejected instead of filling missing facts', () => {
    const invalid = [
        null, [], {}, [{ type: 'unknown', text: '説明' }], [{ type: 'text', text: '' }],
        [{ type: 'bullets', items: [] }], [{ type: 'bullets', items: ['説明'] }],
        [{ type: 'bullets', items: [{ label: '', text: '説明' }] }],
        [{ type: 'table', caption: '', columns: ['A'], rows: [['B']] }],
        [{ type: 'table', caption: '比較', columns: ['A', 'B'], rows: [['不足']] }],
        [{ type: 'table', caption: '比較', columns: ['A'], rows: [[null]] }],
        [{ type: 'diagram', data: graph(), options: { layout: 'other' } }],
        [{ type: 'diagram', data: { nodes: [], edges: [] } }]
    ];
    for (const input of invalid) assert.throws(() => normalizeSummaryContent(input, { baseUrl }), TypeError);
    assert.throws(() => renderSummaryContent(null, [{ type: 'text', text: '説明' }]), /host must be an Element/);
});

test('illustrations require meaningful alt text and same-origin HTTP(S) assets', () => {
    for (const src of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'file:///tmp/image.png', 'https://other.test/picture.png', '//other.test/picture.png']) {
        assert.throws(() => normalizeSummaryContent([{ type: 'image', src, alt: '場面' }], { baseUrl }), /same-origin HTTP/);
    }
    for (const alt of [undefined, '', '  ', null]) {
        assert.throws(() => normalizeSummaryContent([{ type: 'image', src: '/scene.svg', alt }], { baseUrl }), /alt/);
    }
    const image = normalizeSummaryContent([{ type: 'image', src: '/scene.svg', alt: '場面' }], { baseUrl })[0];
    assert.equal(image.src, 'https://example.test/scene.svg');
    assert.equal('caption' in image, false);
});

test('diagram blocks follow the existing graph contract and retain arrow direction and line style', () => {
    const input = graph(); input.edges[0].lineStyle = 'dashed';
    const output = normalizeSummaryContent([{ type: 'diagram', data: input, options: { layout: 'pairs', interactive: false } }]);
    assert.equal(output[0].data.edges[0].source, 'sender');
    assert.equal(output[0].data.edges[0].target, 'receiver');
    assert.equal(output[0].data.edges[0].directed, true);
    assert.equal(output[0].data.edges[0].lineStyle, 'dashed');
    const invalid = graph(); invalid.edges[0].target = 'unknown';
    assert.throws(() => normalizeSummaryContent([{ type: 'diagram', data: invalid, options: { layout: 'pairs' } }]), /unknown node/);
});
