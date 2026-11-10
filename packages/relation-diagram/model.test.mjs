import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeData, normalizeOptions, branchMetrics, branchPositions, rightBranchMetrics, rightBranchPositions, pairMetrics, pairPositions, pathMetrics, pathPositions, relationshipText } from './model.mjs';

const branches = () => ({
  heading: '同じ出来事を見る',
  nodes: [
    { id: 'parent', title: '前提', body: ['短い場面。'], kind: 'context' },
    { id: 'a', title: '一つ目の見方', body: '説明。' },
    { id: 'b', title: 'もう一つの見方', body: '別の説明。' },
  ],
  edges: [{ source: 'parent', target: 'a' }, { source: 'parent', target: 'b' }],
});
const branchOptions = normalizeOptions();
const networkOptions = normalizeOptions({ layout: 'network' });
const pathOptions = normalizeOptions({ layout: 'path' });
const rightOptions = normalizeOptions({ direction: 'right' });
const pairOptions = normalizeOptions({ layout: 'pairs' });
const path = () => ({
  nodes: [
    { id: 'first', title: '最初の人', kind: 'person' },
    { id: 'middle', title: '間の人', kind: 'person' },
    { id: 'last', title: '最後の人', kind: 'person' },
  ],
  edges: [
    { source: 'first', target: 'middle', label: '内容を伝える', directed: true },
    { source: 'middle', target: 'last', label: '一緒に作業する' },
  ],
});

test('a parent and any number of distinct children are inferred without application IDs', () => {
  const input = branches();
  input.nodes.push({ id: 'c', title: '追加の見方' });
  input.edges.push({ source: 'parent', target: 'c' });
  const model = normalizeData(input, branchOptions);
  assert.equal(model.rootId, 'parent');
  assert.equal(model.nodes.length, 4);
  assert.deepEqual(model.nodes[1].body, ['説明。']);
  assert.equal(model.edges[0].directed, false);
});

test('normalization owns its arrays and does not mutate supplied data', () => {
  const input = branches();
  const before = structuredClone(input);
  const model = normalizeData(input, branchOptions);
  assert.deepEqual(input, before);
  input.nodes[0].body.push('後から変更');
  input.edges[0].source = 'b';
  assert.deepEqual(model.nodes[0].body, ['短い場面。']);
  assert.equal(model.edges[0].source, 'parent');
});

test('node captions are optional literal strings and may be empty', () => {
  const input = branches();
  input.nodes[0].caption = '共通の状況';
  input.nodes[1].caption = '';
  let model = normalizeData(input, branchOptions);
  assert.deepEqual(model.nodes.map(node => node.caption), ['共通の状況', '', '']);
  input.nodes[0].caption = '<img src=x onerror=alert(1)>';
  input.nodes[1].caption = '  ';
  model = normalizeData(input, branchOptions);
  assert.equal(model.nodes[0].caption, input.nodes[0].caption);
  assert.equal(model.nodes[1].caption, '  ');
});

test('node captions reject non-string values', () => {
  for (const caption of [null, false, 0, [], {}]) {
    const input = branches();
    input.nodes[1].caption = caption;
    assert.throws(() => normalizeData(input, branchOptions), /nodes\[1\]\.caption must be a string/);
  }
});

test('network accepts cycles, self connections, and disconnected people', () => {
  const input = branches();
  input.nodes.push({ id: 'other', title: '別の人', kind: 'person' });
  input.edges.push({ source: 'a', target: 'b', directed: true }, { source: 'b', target: 'parent' }, { source: 'a', target: 'a' });
  const model = normalizeData(input, networkOptions);
  assert.equal(model.edges.length, 5);
  assert.equal(model.nodes.length, 4);
});

test('branches does not silently render a cycle or a grandchild as a direct branch', () => {
  const input = branches();
  input.edges[1] = { source: 'a', target: 'b' };
  assert.throws(() => normalizeData(input, branchOptions), /direct children/);
  input.edges.push({ source: 'b', target: 'parent' });
  assert.throws(() => normalizeData(input, branchOptions), /exactly one parent/);
});

test('branches rejects missing and duplicate child connections', () => {
  const input = branches();
  input.edges.pop();
  assert.throws(() => normalizeData(input, branchOptions), /exactly one parent/);
  input.rootId = 'parent';
  input.edges.push({ source: 'parent', target: 'a' });
  assert.throws(() => normalizeData(input, branchOptions), /direct children/);
});

test('network can represent parallel relations, while branches rejects duplicate children', () => {
  const input = branches();
  input.edges.push({ source: 'parent', target: 'a', label: '別の関係' });
  assert.equal(normalizeData(input, networkOptions).edges.length, 3);
  assert.throws(() => normalizeData(input, branchOptions), /direct children/);
});

test('node and edge IDs occupy one collision-free namespace', () => {
  const input = branches();
  input.nodes[1].id = 'rd-edge-0';
  input.edges[0].target = 'rd-edge-0';
  input.edges[1].id = 'rd-edge-0_';
  const model = normalizeData(input, branchOptions);
  assert.equal(model.edges[0].id, 'rd-edge-0__');
  input.edges[1].id = 'parent';
  assert.throws(() => normalizeData(input, branchOptions), /Duplicate element id/);
});

test('duplicate node IDs, dangling edges, and invalid root IDs are errors', () => {
  const input = branches();
  input.nodes.push({ id: 'a', title: '重複' });
  assert.throws(() => normalizeData(input, branchOptions), /Duplicate node/);
  input.nodes.pop();
  input.edges[0].target = 'missing';
  assert.throws(() => normalizeData(input, branchOptions), /unknown node/);
  input.edges[0].target = 'a';
  input.rootId = 'missing';
  assert.throws(() => normalizeData(input, branchOptions), /rootId/);
});

test('strings remain literal text, and invalid body and direction types are rejected', () => {
  const input = branches();
  input.nodes[1].title = '<img src=x onerror=alert(1)>';
  assert.equal(normalizeData(input, branchOptions).nodes[1].title, input.nodes[1].title);
  input.nodes[1].body = [null];
  assert.throws(() => normalizeData(input, branchOptions), /body/);
  input.nodes[1].body = '';
  input.edges[0].directed = 'false';
  assert.throws(() => normalizeData(input, branchOptions), /boolean/);
});

test('empty inputs and unsupported node kinds are rejected', () => {
  assert.throws(() => normalizeData({ nodes: [], edges: [] }, branchOptions), /non-empty array/);
  const input = branches();
  input.nodes[0].kind = 'application-specific';
  assert.throws(() => normalizeData(input, branchOptions), /Unsupported node kind/);
});

test('a single parent without edges is supported', () => {
  const model = normalizeData({ nodes: [{ id: 'only', title: '一つの項目' }], edges: [] }, branchOptions);
  assert.equal(model.rootId, 'only');
});

test('options default by layout, merge for updates, and reject invalid values', () => {
  assert.deepEqual(normalizeOptions(), { layout: 'branches', direction: 'down', interactive: false });
  assert.deepEqual(networkOptions, { layout: 'network', interactive: true });
  assert.deepEqual(pathOptions, { layout: 'path', interactive: false });
  assert.deepEqual(pairOptions, { layout: 'pairs', interactive: false });
  assert.deepEqual(normalizeOptions({ interactive: false }, networkOptions), { layout: 'network', interactive: false });
  assert.throws(() => normalizeOptions({ layout: 'other' }), /layout/);
  assert.throws(() => normalizeOptions({ interactive: 'yes' }), /boolean/);
  assert.throws(() => normalizeOptions({ direction: 'left' }), /direction/);
  assert.deepEqual(normalizeOptions({}, rightOptions), rightOptions);
  assert.equal(normalizeOptions({ direction: 'down' }, rightOptions).direction, 'down');
  const switched = normalizeOptions({ layout: 'path' }, rightOptions);
  assert.equal('direction' in switched, false);
  assert.equal(normalizeOptions({ layout: 'branches' }, switched).direction, 'down');
});

test('rightward branches requires an explicit root and preserves incoming and outgoing arrows', () => {
  const input = path();
  assert.throws(() => normalizeData(input, rightOptions), /explicit rootId/);
  input.rootId = 'middle';
  const before = structuredClone(input);
  const model = normalizeData(input, rightOptions);
  assert.equal(model.rootId, 'middle');
  assert.deepEqual(model.nodes.map(node => node.id), ['first', 'middle', 'last']);
  assert.deepEqual(model.edges.map(({ source, target, directed }) => ({ source, target, directed })), [
    { source: 'first', target: 'middle', directed: true },
    { source: 'middle', target: 'last', directed: false },
  ]);
  assert.deepEqual(input, before);
  assert.throws(() => normalizeData(input, branchOptions), /direct children/);
});

test('rightward branches rejects missing, repeated, self, or indirect connections', () => {
  const input = { ...path(), rootId: 'middle' };
  for (const edges of [
    [], [input.edges[0]],
    [...input.edges, { source: 'middle', target: 'first' }],
    [{ source: 'middle', target: 'middle' }, input.edges[1]],
    [input.edges[0], { source: 'first', target: 'last' }],
  ]) {
    assert.throws(() => normalizeData({ ...input, edges }, rightOptions), /branch/);
  }
});

test('rightward branches keeps measured text in two columns with at least 16px clearance', () => {
  for (const availableWidth of [120, 224, 272, 312, 640, 1280]) {
    for (const count of [0, 1, 2, 3, 6]) {
      const metrics = rightBranchMetrics(availableWidth);
      assert.ok(metrics.width <= 640 && metrics.nodeWidth <= 120);
      const nodes = [{ id: 'center', width: metrics.nodeWidth, height: 86 }];
      for (let i = 0; i < count; i++) nodes.push({ id: `person-${i}`, width: metrics.nodeWidth, height: 70 + i * 41 });
      const edges = nodes.slice(1).map((node, i) => ({
        id: `edge-${i}`, source: i % 2 ? 'center' : node.id, target: i % 2 ? node.id : 'center',
      }));
      const labels = edges.map((edge, i) => ({ id: edge.id, width: metrics.labelWidth, height: 60 + i * 35 }));
      const plan = rightBranchPositions(availableWidth, 'center', nodes, labels, edges);
      const boxes = [...nodes, ...labels].map(size => {
        const p = (plan.positions.get(size.id) || plan.labelPositions.get(size.id));
        const box = { left: p.x - size.width / 2, right: p.x + size.width / 2, top: p.y - size.height / 2, bottom: p.y + size.height / 2 };
        assert.ok(box.left >= -.01 && box.right <= metrics.width + .01, `${size.id} outside width ${availableWidth}`);
        assert.ok(box.top >= -.01 && box.bottom <= plan.height + .01);
        return box;
      });
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const clearance = Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom);
          assert.ok(clearance >= 16, `Insufficient clearance at width ${availableWidth}, count ${count}`);
        }
      }
      const center = plan.positions.get('center');
      for (const node of nodes.slice(1)) assert.ok(plan.positions.get(node.id).x > center.x);
      if (count === 2) {
        assert.ok(plan.positions.get('person-0').y < center.y);
        assert.ok(plan.positions.get('person-1').y > center.y);
      }
    }
  }
});

function segmentBoxDistance(start, end, box) {
  const dx = end.x - start.x, dy = end.y - start.y;
  let enter = 0, leave = 1;
  for (const [origin, delta, min, max] of [[start.x, dx, box.left, box.right], [start.y, dy, box.top, box.bottom]]) {
    if (!delta) {
      if (origin < min || origin > max) { enter = 2; break; }
    } else {
      const first = (min - origin) / delta, second = (max - origin) / delta;
      enter = Math.max(enter, Math.min(first, second));
      leave = Math.min(leave, Math.max(first, second));
    }
  }
  if (enter <= leave) return 0;
  const pointBox = point => Math.hypot(Math.max(box.left - point.x, 0, point.x - box.right), Math.max(box.top - point.y, 0, point.y - box.bottom));
  const pointLine = point => {
    const fraction = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.x - start.x - fraction * dx, point.y - start.y - fraction * dy);
  };
  return Math.min(pointBox(start), pointBox(end), ...[
    { x: box.left, y: box.top }, { x: box.right, y: box.top },
    { x: box.left, y: box.bottom }, { x: box.right, y: box.bottom },
  ].map(pointLine));
}

test('beside labels clear every continuous line at narrow widths and with enlarged measured text', () => {
  for (const availableWidth of [120, 224, 272, 312, 640, 1280]) {
    for (const enlarged of [false, true]) {
      for (const count of [1, 2, 3, 6]) {
        for (const oneLabel of [false, true]) {
          const metrics = rightBranchMetrics(availableWidth);
          const nodes = [{ id: 'center', width: metrics.nodeWidth, height: enlarged ? 86 : 56 }];
          for (let i = 0; i < count; i++) nodes.push({ id: `person-${i}`, width: metrics.nodeWidth, height: enlarged ? 314 - i * 20 : 126 - i * 10 });
          const edges = nodes.slice(1).map((node, i) => ({ id: `edge-${i}`, source: i % 2 ? 'center' : node.id, target: i % 2 ? node.id : 'center' }));
          const labels = edges.filter((_, i) => !oneLabel || i === edges.length - 1).map(edge => ({ id: edge.id, width: metrics.labelWidth, height: enlarged ? 244 : 68 }));
          const plan = rightBranchPositions(availableWidth, 'center', nodes, labels, edges);
          const boxes = [...nodes, ...labels].map(size => {
            const p = plan.positions.get(size.id) || plan.labelPositions.get(size.id);
            return { id: size.id, left: p.x - size.width / 2, right: p.x + size.width / 2, top: p.y - size.height / 2, bottom: p.y + size.height / 2 };
          });
          for (const box of boxes) {
            assert.ok(box.left >= -.01 && box.right <= metrics.width + .01);
            assert.ok(box.top >= -.01 && box.bottom <= plan.height + .01);
          }
          for (let i = 0; i < boxes.length; i++) {
            for (const b of boxes.slice(i + 1)) {
              const a = boxes[i];
              assert.ok(Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom) >= 16);
            }
          }
          for (const label of labels) {
            const box = boxes.find(box => box.id === label.id);
            for (const edge of edges) {
              const distance = segmentBoxDistance(plan.positions.get(edge.source), plan.positions.get(edge.target), box);
              assert.ok(distance >= 8, `Label ${label.id} is ${distance}px from ${edge.id} at ${availableWidth}px`);
            }
            const edge = edges.find(edge => edge.id === label.id);
            const root = plan.positions.get('center');
            const child = plan.positions.get(edge.source === 'center' ? edge.target : edge.source);
            const position = plan.labelPositions.get(label.id);
            const cross = (child.x - root.x) * (position.y - root.y) - (child.y - root.y) * (position.x - root.x);
            assert.equal(Math.sign(cross), Math.sign(child.y - root.y));
          }
          if (count === 2) {
            const rootY = plan.positions.get('center').y;
            assert.ok(Math.abs(rootY - (plan.positions.get('person-0').y + plan.positions.get('person-1').y) / 2) < .01);
          }
        }
      }
    }
  }
});

test('a phone label uses spare horizontal room instead of falling below the child card', () => {
  for (const enlarged of [false, true]) {
    const metrics = rightBranchMetrics(272);
    const nodes = [
      { id: 'self', width: metrics.nodeWidth, height: enlarged ? 86 : 56 },
      { id: 'spouse', width: metrics.nodeWidth, height: enlarged ? 314 : 126 },
      { id: 'child', width: metrics.nodeWidth, height: enlarged ? 142 : 56 },
    ];
    const edges = [{ id: 'spouse-link', source: 'spouse', target: 'self' }, { id: 'child-link', source: 'self', target: 'child' }];
    const label = { id: 'child-link', width: metrics.labelWidth, height: enlarged ? 244 : 68 };
    const plan = rightBranchPositions(272, 'self', nodes, [label], edges);
    const position = plan.labelPositions.get(label.id);
    const child = plan.positions.get('child');
    assert.ok(position.x + label.width / 2 <= child.x - nodes[2].width / 2 - 16);
    assert.ok(position.y - label.height / 2 < child.y + nodes[2].height / 2);
    assert.ok(position.y + label.height / 2 > child.y - nodes[2].height / 2);
  }
});

test('path follows nodes order, accepting reversed or unordered edges without changing their direction', () => {
  const input = path();
  input.edges = [
    { source: 'last', target: 'middle', directed: true, label: '前の人に返す' },
    { source: 'middle', target: 'first', directed: false },
  ];
  const model = normalizeData(input, pathOptions);
  assert.deepEqual(model.nodes.map(node => node.id), ['first', 'middle', 'last']);
  assert.deepEqual(model.edges.map(({ source, target, directed }) => ({ source, target, directed })), [
    { source: 'last', target: 'middle', directed: true },
    { source: 'middle', target: 'first', directed: false },
  ]);
  assert.equal('rootId' in model, false);
  assert.deepEqual(input.edges[0], { source: 'last', target: 'middle', directed: true, label: '前の人に返す' });
});

test('path accepts a single node and rejects skipped, repeated, branching, cyclic, or missing connections', () => {
  const single = normalizeData({ nodes: [{ id: 'only', title: '一人' }], edges: [] }, pathOptions);
  assert.equal(single.nodes.length, 1);
  assert.equal(single.edges.length, 0);
  const invalidEdges = [
    [],
    [{ source: 'first', target: 'middle' }],
    [{ source: 'first', target: 'middle' }, { source: 'middle', target: 'first' }],
    [{ source: 'first', target: 'middle' }, { source: 'first', target: 'last' }],
    [{ source: 'first', target: 'first' }, { source: 'middle', target: 'last' }],
    [...path().edges, { source: 'last', target: 'first' }],
    [...path().edges, { source: 'first', target: 'middle' }],
  ];
  for (const edges of invalidEdges) {
    assert.throws(() => normalizeData({ ...path(), edges }, pathOptions), /path/, JSON.stringify(edges));
  }
});

test('path reserves readable widths and switches to a vertical line when the row would not fit', () => {
  const narrow = pathMetrics(312, 3);
  const wide = pathMetrics(1280, 3);
  assert.equal(narrow.orientation, 'vertical');
  assert.ok(narrow.nodeWidth >= 180 && narrow.labelWidth >= 160);
  assert.equal(wide.orientation, 'horizontal');
  assert.ok(wide.nodeWidth >= 180 && wide.labelWidth >= 160);
  assert.equal(pathMetrics(240, 1, 0).orientation, 'horizontal');
  assert.equal(pathMetrics(680, 3, 0).orientation, 'horizontal');
});

test('path text cards and edge labels remain disjoint and inside the surface at small and wide sizes', () => {
  for (const width of [120, 240, 312, 680, 900, 1000, 1280, 2400]) {
    for (const count of [1, 2, 3, 6]) {
      for (const labeled of [false, true]) {
        const metrics = pathMetrics(width, count, labeled ? count - 1 : 0);
        const nodeSizes = Array.from({ length: count }, (_, index) => ({ id: `n${index}`, width: metrics.nodeWidth, height: 60 + index * 43 }));
        const edges = nodeSizes.slice(1).map((node, index) => ({ id: `e${index}`, source: node.id, target: nodeSizes[index].id }));
        const labelSizes = labeled ? edges.map((edge, index) => ({ id: edge.id, width: metrics.labelWidth, height: 72 + index * 47 })) : [];
        const plan = pathPositions(width, nodeSizes, labelSizes, edges);
        const boxes = [...nodeSizes, ...labelSizes].map(size => {
          const p = (size.id.startsWith('n') ? plan.positions : plan.labelPositions).get(size.id);
          const box = { left: p.x - size.width / 2, right: p.x + size.width / 2, top: p.y - size.height / 2, bottom: p.y + size.height / 2 };
          assert.ok(box.left >= -.01 && box.right <= width + .01, `width ${width}, count ${count}, ${size.id}`);
          assert.ok(box.top >= -.01 && box.bottom <= plan.height + .01);
          return box;
        });
        assert.equal(plan.positions.size, count);
        assert.equal(plan.labelPositions.size, labelSizes.length);
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i], b = boxes[j];
            assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, `Overlap at ${width}px, count ${count}`);
          }
        }
      }
    }
  }
});

test('small containers stack text cards rather than shrinking their width for a row', () => {
  const small = branchMetrics(312, 2);
  const large = branchMetrics(680, 2);
  assert.equal(small.stacked, true);
  assert.ok(small.childWidth > 220);
  assert.equal(large.stacked, false);
  assert.ok(large.childWidth >= 220);
});

test('variable-height cards remain inside the surface and do not overlap at supported widths', () => {
  for (const width of [240, 312, 680, 1000, 1400]) {
    for (const count of [0, 1, 2, 3, 6]) {
      const metrics = branchMetrics(width, count);
      const sizes = [{ id: 'parent', width: metrics.rootWidth, height: 145 }];
      for (let i = 0; i < count; i++) sizes.push({ id: `child-${i}`, width: metrics.childWidth, height: 70 + i * 41 });
      const plan = branchPositions(width, 'parent', sizes);
      const boxes = sizes.map(size => {
        const p = plan.positions.get(size.id);
        const box = { left: p.x - size.width / 2, right: p.x + size.width / 2, top: p.y - size.height / 2, bottom: p.y + size.height / 2 };
        assert.ok(box.left >= 0 && box.right <= width + .01, `width ${width}, count ${count}`);
        assert.ok(box.top >= 0 && box.bottom <= plan.height + .01);
        return box;
      });
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
        }
      }
    }
  }
});

test('the text alternative preserves edge labels and direction', () => {
  const titles = new Map([['a', '葵'], ['b', '圭']]);
  assert.equal(relationshipText({ source: 'a', target: 'b', directed: true, label: '相談する' }, titles), '葵 → 圭：相談する');
  assert.equal(relationshipText({ source: 'a', target: 'b', directed: false, label: '' }, titles), '葵 — 圭');
});

test('pairs owns independent people and preserves edge order, direction, and optional line style', () => {
  const input = {
    nodes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }, { id: 'd', title: 'D' }],
    edges: [
      { id: 'second', source: 'd', target: 'c', label: '確認する？', directed: true, lineStyle: 'dashed' },
      { id: 'first', source: 'b', target: 'a', label: 'つながる', lineStyle: 'solid' },
    ],
  };
  const before = structuredClone(input);
  const model = normalizeData(input, pairOptions);
  assert.equal('rootId' in model, false);
  assert.deepEqual(model.edges.map(({ id, source, target, directed, lineStyle }) => ({ id, source, target, directed, lineStyle })), [
    { id: 'second', source: 'd', target: 'c', directed: true, lineStyle: 'dashed' },
    { id: 'first', source: 'b', target: 'a', directed: false, lineStyle: 'solid' },
  ]);
  assert.deepEqual(input, before);
  input.nodes[0].title = 'changed';
  assert.equal(model.nodes[0].title, 'A');
  const unstyled = normalizeData({ nodes: before.nodes.slice(0, 2), edges: [{ source: 'a', target: 'b' }] }, pairOptions);
  assert.equal('lineStyle' in unstyled.edges[0], false);
});

test('pairs rejects shared people, self links, unmatched people, and empty connections', () => {
  const nodes = ['a', 'b', 'c', 'd'].map(id => ({ id, title: id }));
  for (const input of [
    { nodes, edges: [] },
    { nodes, edges: [{ source: 'a', target: 'b' }] },
    { nodes, edges: [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }] },
    { nodes, edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }] },
    { nodes: nodes.slice(0, 2), edges: [{ source: 'a', target: 'a' }] },
  ]) assert.throws(() => normalizeData(input, pairOptions), /pairs/);
});

test('edge line styles reject unsupported values in every layout', () => {
  for (const options of [branchOptions, networkOptions, pathOptions, pairOptions]) {
    for (const lineStyle of ['', 'dotted', null, false, 1, {}]) {
      assert.throws(() => normalizeData({
        nodes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }],
        edges: [{ source: 'a', target: 'b', lineStyle }],
      }, options), /lineStyle/);
    }
  }
});

test('independent pair rows keep measured people horizontal and labels clear of boxes and every line', () => {
  for (const availableWidth of [224, 272, 312, 640, 1280]) {
    for (const enlarged of [false, true]) {
      for (const count of [1, 2, 4]) {
        for (const labeled of [false, true]) {
          const metrics = pairMetrics(availableWidth);
          assert.ok(metrics.width <= 640 && metrics.nodeWidth <= 120 && metrics.labelWidth <= 120);
          const edges = Array.from({ length: count }, (_, index) => ({ id: `e${index}`, source: `left-${index}`, target: `right-${index}` }));
          const nodes = edges.flatMap((edge, index) => [
            { id: edge.target, width: metrics.nodeWidth, height: enlarged ? 142 + index * 16 : 56 + index * 8 },
            { id: edge.source, width: metrics.nodeWidth, height: enlarged ? 314 + index * 17 : 126 + index * 11 },
          ]);
          const labels = labeled ? edges.map(edge => ({ id: edge.id, width: metrics.labelWidth, height: enlarged ? 244 : 68 })) : [];
          const plan = pairPositions(availableWidth, nodes, labels, edges);
          assert.equal(plan.positions.size, nodes.length);
          assert.equal(plan.labelPositions.size, labels.length);
          const boxes = [...nodes, ...labels].map(size => {
            const position = plan.positions.get(size.id) || plan.labelPositions.get(size.id);
            return { id: size.id, left: position.x - size.width / 2, right: position.x + size.width / 2, top: position.y - size.height / 2, bottom: position.y + size.height / 2 };
          });
          for (const box of boxes) {
            assert.ok(box.left >= -.01 && box.right <= metrics.width + .01, `${box.id} outside ${availableWidth}px`);
            assert.ok(box.top >= -.01 && box.bottom <= plan.height + .01);
          }
          for (let i = 0; i < boxes.length; i++) {
            for (const b of boxes.slice(i + 1)) {
              const a = boxes[i];
              assert.ok(Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom) >= 16, `${a.id} overlaps ${b.id} at ${availableWidth}px`);
            }
          }
          let previousBottom = -Infinity;
          for (const edge of edges) {
            const source = plan.positions.get(edge.source), target = plan.positions.get(edge.target);
            assert.equal(source.y, target.y);
            assert.ok(source.x < target.x);
            const row = boxes.filter(box => [edge.source, edge.target, edge.id].includes(box.id));
            assert.ok(Math.min(...row.map(box => box.top)) - previousBottom >= 24);
            previousBottom = Math.max(...row.map(box => box.bottom));
          }
          for (const label of labels) {
            const box = boxes.find(item => item.id === label.id);
            const ownEdge = edges.find(edge => edge.id === label.id);
            assert.ok(box.top - plan.positions.get(ownEdge.source).y >= 8);
            for (const edge of edges) {
              assert.ok(segmentBoxDistance(plan.positions.get(edge.source), plan.positions.get(edge.target), box) >= 8);
            }
          }
        }
      }
    }
  }
});
