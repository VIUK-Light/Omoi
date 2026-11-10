import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelationSequence, normalizeSequence } from './sequence.mjs';

const sequence = () => ({
  frames: [
    {
      label: '最初の場面',
      data: { rootId: 'person', nodes: [{ id: 'person', title: '一人', body: ['手元で準備する。'], kind: 'person' }], edges: [] },
      options: { layout: 'branches', direction: 'right' },
    },
    {
      label: '受け渡しを考える',
      data: {
        nodes: [{ id: 'sender', title: '渡す人', kind: 'person' }, { id: 'receiver', title: '受け取る人', kind: 'person' }],
        edges: [{ source: 'sender', target: 'receiver', label: '渡す？', directed: true, lineStyle: 'dashed' }],
      },
      options: { layout: 'pairs' },
    },
  ],
});

test('a sequence owns every frame and keeps each graph layout and arrow semantics', () => {
  const input = sequence();
  const before = structuredClone(input);
  const normalized = normalizeSequence(input);
  assert.equal(normalized.kind, 'timeline');
  assert.deepEqual(normalized.frames.map(frame => frame.label), ['最初の場面', '受け渡しを考える']);
  assert.deepEqual(normalized.frames[0].options, { layout: 'branches', direction: 'right', interactive: false });
  assert.deepEqual(normalized.frames[1].options, { layout: 'pairs', interactive: false });
  assert.deepEqual(normalized.frames[1].data.edges[0], {
    id: 'rd-edge-0', source: 'sender', target: 'receiver', label: '渡す？', directed: true, lineStyle: 'dashed',
  });
  assert.deepEqual(input, before);
  input.frames[0].data.nodes[0].body.push('後から変更');
  input.frames[0].options.direction = 'down';
  input.frames[1].data.edges[0].target = 'sender';
  input.frames.push(input.frames[0]);
  assert.equal(normalized.frames.length, 2);
  assert.deepEqual(normalized.frames[0].data.nodes[0].body, ['手元で準備する。']);
  assert.equal(normalized.frames[0].options.direction, 'right');
  assert.equal(normalized.frames[1].data.edges[0].target, 'receiver');
});

test('comparison kind is explicit, and display labels stay literal text', () => {
  const input = { ...sequence(), kind: 'comparison' };
  input.frames[0].label = '<img src=x onerror=alert(1)>';
  const normalized = normalizeSequence(input);
  assert.equal(normalized.kind, 'comparison');
  assert.equal(normalized.frames[0].label, input.frames[0].label);
  assert.equal(normalized.frames.length, 2);
});

test('every later frame is validated up front without changing any supplied data', () => {
  const input = sequence();
  input.frames[1].data.edges[0].target = 'missing';
  const before = structuredClone(input);
  assert.throws(() => normalizeSequence(input), /unknown node/);
  assert.deepEqual(input, before);
  input.frames[1] = { label: '不正な配置', data: input.frames[0].data, options: { layout: 'unsupported' } };
  assert.throws(() => normalizeSequence(input), /layout/);
});

test('a single frame is supported without inventing a next state', () => {
  const input = sequence();
  input.frames.length = 1;
  const normalized = normalizeSequence(input);
  assert.equal(normalized.frames.length, 1);
  assert.equal(normalized.frames[0].data.nodes.length, 1);
});

test('missing frames, unsupported kinds, and invalid labels are rejected', () => {
  for (const input of [undefined, null, [], {}, { frames: [] }, { frames: {} }, { frames: [null] }, { frames: [[]] }]) {
    assert.throws(() => normalizeSequence(input), TypeError);
  }
  for (const label of ['', '  ', null, 0, [], {}]) {
    const input = sequence();
    input.frames[0].label = label;
    assert.throws(() => normalizeSequence(input), /label/);
  }
  assert.throws(() => normalizeSequence({ ...sequence(), kind: 'automatic' }), /kind/);
});

test('mounting requires a browser element before touching the supplied host', () => {
  for (const host of [null, undefined, {}, 'not an element']) {
    assert.throws(() => createRelationSequence(host, sequence()), /Element/);
  }
  assert.throws(() => createRelationSequence({ nodeType: 1, ownerDocument: { defaultView: null } }, sequence()), /browser document/);
});
