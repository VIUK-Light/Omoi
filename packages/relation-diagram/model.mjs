const KINDS = new Set(['context', 'view', 'person']);
const LAYOUTS = new Set(['branches', 'network', 'path', 'pairs']);
const DIRECTIONS = new Set(['down', 'right']);
const LINE_STYLES = new Set(['solid', 'dashed']);

function record(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
}

function string(value, name, { empty = false } = {}) {
  if (typeof value !== 'string' || (!empty && !value.trim())) {
    throw new TypeError(`${name} must be ${empty ? 'a' : 'a non-empty'} string.`);
  }
  return value;
}

export function normalizeOptions(options = {}, previous = {}) {
  record(options, 'options');
  const layout = options.layout ?? previous.layout ?? 'branches';
  const interactive = options.interactive ?? previous.interactive ?? (layout === 'network');
  const direction = options.direction ?? (layout === previous.layout ? previous.direction : undefined) ?? 'down';
  if (!LAYOUTS.has(layout)) throw new TypeError('layout must be branches, network, path, or pairs.');
  if (typeof interactive !== 'boolean') throw new TypeError('interactive must be a boolean.');
  if (!DIRECTIONS.has(direction)) throw new TypeError('direction must be down or right.');
  return { layout, interactive, ...(layout === 'branches' ? { direction } : {}) };
}

/** Return owned, validated data. No DOM or Cytoscape dependency. */
export function normalizeData(input, options) {
  record(input, 'data');
  if (!Array.isArray(input.nodes) || input.nodes.length === 0) {
    throw new TypeError('nodes must be a non-empty array.');
  }
  if (!Array.isArray(input.edges)) throw new TypeError('edges must be an array.');
  const ids = new Set();
  const nodes = input.nodes.map((node, index) => {
    record(node, `nodes[${index}]`);
    const id = string(node.id, `nodes[${index}].id`);
    if (ids.has(id)) throw new TypeError(`Duplicate node id: ${id}`);
    ids.add(id);
    const title = string(node.title, `nodes[${index}].title`);
    const caption = node.caption === undefined ? '' : string(node.caption, `nodes[${index}].caption`, { empty: true });
    let body = [];
    if (node.body !== undefined) {
      body = typeof node.body === 'string' ? [node.body] : node.body;
      if (!Array.isArray(body) || body.some(item => typeof item !== 'string')) {
        throw new TypeError(`nodes[${index}].body must be a string or an array of strings.`);
      }
    }
    const kind = node.kind ?? 'view';
    if (!KINDS.has(kind)) throw new TypeError(`Unsupported node kind: ${kind}`);
    return { id, title, caption, body: [...body], kind };
  });

  const allIds = new Set(ids);
  const explicitEdgeIds = new Set();
  for (const edge of input.edges) {
    record(edge, 'edge');
    if (edge.id === undefined) continue;
    const id = string(edge.id, 'edge.id');
    if (allIds.has(id)) throw new TypeError(`Duplicate element id: ${id}`);
    allIds.add(id);
    explicitEdgeIds.add(id);
  }
  const edges = input.edges.map((edge, index) => {
    const source = string(edge.source, `edges[${index}].source`);
    const target = string(edge.target, `edges[${index}].target`);
    if (!ids.has(source) || !ids.has(target)) {
      throw new TypeError(`Edge ${index} refers to an unknown node.`);
    }
    const label = edge.label === undefined ? '' : string(edge.label, `edges[${index}].label`, { empty: true });
    if (edge.directed !== undefined && typeof edge.directed !== 'boolean') {
      throw new TypeError(`edges[${index}].directed must be a boolean.`);
    }
    if (edge.lineStyle !== undefined && !LINE_STYLES.has(edge.lineStyle)) {
      throw new TypeError(`edges[${index}].lineStyle must be solid or dashed.`);
    }
    let id = edge.id;
    if (id === undefined) {
      id = `rd-edge-${index}`;
      while (allIds.has(id)) id += '_';
      allIds.add(id);
    }
    return { id, source, target, label, directed: edge.directed ?? false,
      ...(edge.lineStyle === undefined ? {} : { lineStyle: edge.lineStyle }) };
  });

  let rootId = input.rootId;
  if (rootId !== undefined) {
    string(rootId, 'rootId');
    if (!ids.has(rootId)) throw new TypeError('rootId refers to an unknown node.');
  }
  if (options.layout === 'branches') {
    const right = options.direction === 'right';
    if (right && rootId === undefined) throw new TypeError('Rightward branches requires an explicit rootId.');
    const incoming = new Set(edges.map(edge => edge.target));
    const roots = nodes.filter(node => !incoming.has(node.id));
    if (rootId === undefined) {
      if (roots.length !== 1) throw new TypeError('branches requires exactly one parent.');
      rootId = roots[0].id;
    }
    const targets = new Set();
    for (const edge of edges) {
      const childId = right && edge.target === rootId ? edge.source : edge.target;
      const touchesRoot = right ? edge.source === rootId || edge.target === rootId : edge.source === rootId;
      if (!touchesRoot || childId === rootId || targets.has(childId)) {
        throw new TypeError('branches supports one parent and distinct direct children only.');
      }
      targets.add(childId);
    }
    if (edges.length !== nodes.length - 1 || nodes.some(node => node.id !== rootId && !targets.has(node.id))) {
      throw new TypeError('Every branch child must connect directly to the parent.');
    }
  }
  if (options.layout === 'path') {
    const indexes = new Map(nodes.map((node, index) => [node.id, index]));
    const pairs = new Set();
    for (const edge of edges) {
      const source = indexes.get(edge.source);
      const target = indexes.get(edge.target);
      const pair = Math.min(source, target);
      if (Math.abs(source - target) !== 1 || pairs.has(pair)) {
        throw new TypeError('path requires exactly one edge between each pair of adjacent nodes in nodes order.');
      }
      pairs.add(pair);
    }
    if (edges.length !== nodes.length - 1) {
      throw new TypeError('path must connect all adjacent nodes in nodes order.');
    }
  }
  if (options.layout === 'pairs') {
    const paired = new Set();
    if (!edges.length || nodes.length !== edges.length * 2) {
      throw new TypeError('pairs requires at least one edge and exactly two distinct nodes per edge.');
    }
    for (const edge of edges) {
      if (edge.source === edge.target || paired.has(edge.source) || paired.has(edge.target)) {
        throw new TypeError('pairs requires each node to belong to exactly one distinct pair.');
      }
      paired.add(edge.source);
      paired.add(edge.target);
    }
  }
  return {
    heading: input.heading === undefined ? '' : string(input.heading, 'heading', { empty: true }),
    note: input.note === undefined ? '' : string(input.note, 'note', { empty: true }),
    ...(rootId === undefined ? {} : { rootId }),
    nodes,
    edges,
  };
}

/** Keep two people side by side, leaving a visible connection on phones. */
export function pairMetrics(availableWidth) {
  const width = Math.max(1, Math.min(640, availableWidth));
  const inset = Math.min(16, width / 12);
  const columnGap = 48;
  const nodeWidth = Math.max(1, Math.min(120, (width - inset * 2 - columnGap) / 2));
  return { width, inset, nodeWidth, labelWidth: nodeWidth, gap: 18, lineGap: 10, rowGap: 32 };
}

/** Each edge is an independent row; source stays left and target stays right. */
export function pairPositions(availableWidth, nodeSizes, labelSizes, edges) {
  const metrics = pairMetrics(availableWidth);
  const nodes = new Map(nodeSizes.map(node => [node.id, node]));
  const labels = new Map(labelSizes.map(label => [label.id, label]));
  const positions = new Map();
  const labelPositions = new Map();
  let top = metrics.inset;
  for (const edge of edges) {
    const source = nodes.get(edge.source), target = nodes.get(edge.target);
    if (!source || !target) throw new TypeError('Missing pair node dimensions.');
    const y = top + Math.max(source.height, target.height) / 2;
    const people = [
      { ...source, x: metrics.inset + source.width / 2 },
      { ...target, x: metrics.width - metrics.inset - target.width / 2 },
    ];
    for (const person of people) positions.set(person.id, { x: person.x, y });
    let bottom = y + Math.max(source.height, target.height) / 2;
    const label = labels.get(edge.id);
    if (label) {
      const x = metrics.width / 2;
      let labelTop = y + metrics.lineGap;
      for (const person of people) {
        if (Math.abs(x - person.x) < (label.width + person.width) / 2 + metrics.gap) {
          labelTop = Math.max(labelTop, y + person.height / 2 + metrics.gap);
        }
      }
      labelPositions.set(edge.id, { x, y: labelTop + label.height / 2 });
      bottom = Math.max(bottom, labelTop + label.height);
    }
    top = bottom + metrics.rowGap;
  }
  return { positions, labelPositions, height: edges.length ? top - metrics.rowGap + metrics.inset : metrics.inset * 2 };
}

/** Two columns at every width; the HTML renderer wraps text before measuring. */
export function rightBranchMetrics(availableWidth) {
  const width = Math.max(1, Math.min(640, availableWidth));
  const inset = Math.min(16, width / 12);
  const gap = 18; // Two pixels of tolerance above the minimum 16px visible gap.
  return {
    width, inset, gap,
    nodeWidth: Math.max(1, Math.min(120, (width - inset * 2 - gap) / 2)),
    // Keep labels narrow enough to sit beside a line on a phone, without
    // reducing their font size. The renderer measures the resulting wrapping.
    labelWidth: Math.max(1, Math.min(120, (width - inset * 2 - gap) / 2)),
  };
}

/** Keep the root on the left and its neighbours above/below it on the right. */
export function rightBranchPositions(availableWidth, rootId, nodeSizes, labelSizes, edges) {
  const metrics = rightBranchMetrics(availableWidth);
  const root = nodeSizes.find(node => node.id === rootId);
  if (!root) throw new TypeError('Missing parent dimensions.');
  const children = nodeSizes.filter(node => node.id !== rootId);
  const positions = new Map();
  const labelPositions = new Map();
  if (!children.length) {
    positions.set(rootId, { x: metrics.width / 2, y: metrics.inset + root.height / 2 });
    return { positions, labelPositions, height: root.height + metrics.inset * 2 };
  }
  const rootX = metrics.inset + root.width / 2;
  const labels = new Map(labelSizes.map(label => [label.id, label]));
  const connections = new Map(edges.map(edge => [edge.source === rootId ? edge.target : edge.source, edge]));
  const items = [{ ...root, x: rootX, y: 0, label: false }];
  const above = children.length === 1 ? 0 : Math.ceil(children.length / 2);
  const branches = children.map((child, index) => {
    const row = index < above ? -(2 * (above - index) - 1) : 2 * (index - above) + 1;
    const x = metrics.width - metrics.inset - child.width / 2;
    const edge = connections.get(child.id);
    if (!edge) throw new TypeError('Missing branch connection.');
    return { ...child, x, row, edge, label: false };
  });
  // Keep the root visibly between its neighbours even when one card has body
  // text and the others contain only a name.
  let spacing = metrics.gap;
  for (const child of branches) {
    spacing = Math.max(spacing, ((root.height + child.height) / 2 + metrics.gap) / Math.abs(child.row));
  }
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i], b = branches[j];
      spacing = Math.max(spacing, ((a.height + b.height) / 2 + metrics.gap) / Math.abs(a.row - b.row));
    }
  }
  for (const child of branches) {
    child.y = child.row * spacing;
    const dx = child.x - rootX;
    const length = Math.hypot(dx, child.y);
    // Outward means left/up for an upper branch, and left/down for a lower one.
    child.normal = { x: -Math.abs(child.y) / length, y: Math.sign(child.y) * dx / length };
    items.push(child);
  }
  for (const child of branches) {
    const label = labels.get(child.edge.id);
    if (!label) continue;
    const side = Math.sign(child.y);
    const projectedHalfSize = normal => Math.abs(normal.x) * label.width / 2 + Math.abs(normal.y) * label.height / 2;
    // Ten pixels leave tolerance above the required 8px rendered-line gap.
    const offset = projectedHalfSize(child.normal) + 10;
    const minX = metrics.inset + label.width / 2;
    const maxX = metrics.width - metrics.inset - label.width / 2;
    let x = Math.max(minX, Math.min(maxX, (rootX + child.x) / 2 + child.normal.x * offset));
    // On a phone a midpoint label can overlap the right column by only a few
    // pixels. Move it left into the available column rather than putting the
    // entire label beyond the person's card vertically.
    const beforeChildren = Math.min(...branches.map(branch => branch.x - branch.width / 2)) - metrics.gap - label.width / 2;
    if (beforeChildren >= minX) x = Math.min(x, beforeChildren);
    let y = 0;
    for (const other of branches) {
      if (Math.sign(other.y) !== side) continue;
      // Stay outside every same-side line, including the corresponding line.
      // Solving Y after clamping X preserves clearance on narrow screens.
      const required = (projectedHalfSize(other.normal) + 10 - other.normal.x * (x - rootX)) / other.normal.y;
      y = side < 0 ? Math.min(y, required) : Math.max(y, required);
    }
    const obstacles = [...items].sort((a, b) => side * (a.y - b.y));
    for (const obstacle of obstacles) {
      if (Math.abs(x - obstacle.x) >= (label.width + obstacle.width) / 2 + metrics.gap) continue;
      const clearance = (label.height + obstacle.height) / 2 + metrics.gap;
      if (Math.abs(y - obstacle.y) < clearance) y = obstacle.y + side * clearance;
    }
    items.push({ ...label, x, y, label: true });
  }
  const top = Math.min(...items.map(item => item.y - item.height / 2));
  const bottom = Math.max(...items.map(item => item.y + item.height / 2));
  for (const item of items) {
    (item.label ? labelPositions : positions).set(item.id, {
      x: item.x, y: item.y - top + metrics.inset,
    });
  }
  return { positions, labelPositions, height: bottom - top + metrics.inset * 2 };
}

/** CSS-pixel sizes: reflow cards rather than reducing their font size. */
export function branchMetrics(availableWidth, childCount) {
  const width = Math.max(1, availableWidth);
  const gap = 24;
  const stacked = childCount > 1 && width < childCount * 220 + (childCount - 1) * gap + 32;
  const inset = stacked ? 40 : 16;
  return {
    stacked,
    inset,
    gap,
    rootWidth: Math.max(1, Math.min(600, width - inset - 16)),
    childWidth: Math.max(1, stacked
      ? width - inset - 16
      : Math.min(340, (width - 32 - Math.max(0, childCount - 1) * gap) / Math.max(1, childCount))),
  };
}

export function branchPositions(availableWidth, rootId, sizes) {
  const root = sizes.find(node => node.id === rootId);
  if (!root) throw new TypeError('Missing parent dimensions.');
  const children = sizes.filter(node => node.id !== rootId);
  const metrics = branchMetrics(availableWidth, children.length);
  const positions = new Map();
  const top = 16;
  if (metrics.stacked) {
    const x = metrics.inset + root.width / 2;
    positions.set(rootId, { x, y: top + root.height / 2 });
    let y = top + root.height + 36;
    for (const child of children) {
      positions.set(child.id, { x: metrics.inset + child.width / 2, y: y + child.height / 2 });
      y += child.height + 36;
    }
    return { positions, height: y - 20, stacked: true };
  }
  positions.set(rootId, { x: availableWidth / 2, y: top + root.height / 2 });
  const rowTop = top + root.height + (children.length ? 72 : 0);
  const rowWidth = children.reduce((sum, child) => sum + child.width, 0)
    + Math.max(0, children.length - 1) * metrics.gap;
  let x = (availableWidth - rowWidth) / 2;
  for (const child of children) {
    positions.set(child.id, { x: x + child.width / 2, y: rowTop + child.height / 2 });
    x += child.width + metrics.gap;
  }
  return {
    positions,
    height: rowTop + Math.max(0, ...children.map(child => child.height)) + 16,
    stacked: false,
  };
}

/** Reserve room for readable node cards and HTML edge labels before measuring. */
export function pathMetrics(availableWidth, nodeCount, labelCount = Math.max(0, nodeCount - 1)) {
  const width = Math.max(1, availableWidth);
  const inset = Math.min(16, width / 4);
  const gap = 48;
  const edgeCount = Math.max(0, nodeCount - 1);
  const minimum = nodeCount * 180 + labelCount * 160 + edgeCount * gap + inset * 2;
  const horizontal = nodeCount === 1 || width >= minimum;
  if (!horizontal) {
    return {
      orientation: 'vertical', inset, gap,
      nodeWidth: Math.max(1, Math.min(220, width - inset * 2)),
      labelWidth: Math.max(1, Math.min(240, width - inset * 2)),
    };
  }
  const available = width - inset * 2 - edgeCount * gap;
  const nodeWidth = Math.max(1, Math.min(220, (available - labelCount * 160) / nodeCount));
  return {
    orientation: 'horizontal', inset, gap, nodeWidth,
    labelWidth: labelCount ? Math.max(1, Math.min(240, (available - nodeCount * nodeWidth) / labelCount)) : 0,
  };
}

/** Place an ordered path using actual text dimensions, with no text scaling. */
export function pathPositions(availableWidth, nodeSizes, labelSizes, edges) {
  const metrics = pathMetrics(availableWidth, nodeSizes.length, labelSizes.length);
  const indexes = new Map(nodeSizes.map((node, index) => [node.id, index]));
  const labels = new Map(labelSizes.map(label => [label.id, label]));
  const between = new Map(edges.map(edge => [Math.min(indexes.get(edge.source), indexes.get(edge.target)), edge]));
  const gaps = nodeSizes.slice(0, -1).map((_, index) => {
    const edge = between.get(index);
    if (!edge) throw new TypeError('Missing path edge dimensions.');
    return { edge, label: labels.get(edge.id) };
  });
  const rowWidth = nodeSizes.reduce((sum, node) => sum + node.width, 0)
    + gaps.reduce((sum, gap) => sum + metrics.gap + (gap.label?.width ?? 0), 0);
  const horizontal = metrics.orientation === 'horizontal' && rowWidth <= availableWidth - metrics.inset * 2 + .01;
  const positions = new Map();
  const labelPositions = new Map();
  if (horizontal) {
    const height = Math.max(0, ...nodeSizes.map(node => node.height), ...labelSizes.map(label => label.height)) + metrics.inset * 2;
    const y = height / 2;
    let x = (availableWidth - rowWidth) / 2;
    for (const [index, node] of nodeSizes.entries()) {
      positions.set(node.id, { x: x + node.width / 2, y });
      x += node.width;
      const gap = gaps[index];
      if (gap) {
        const gapWidth = metrics.gap + (gap.label?.width ?? 0);
        if (gap.label) labelPositions.set(gap.edge.id, { x: x + gapWidth / 2, y });
        x += gapWidth;
      }
    }
    return { positions, labelPositions, height, orientation: 'horizontal' };
  }
  const x = availableWidth / 2;
  let y = metrics.inset;
  for (const [index, node] of nodeSizes.entries()) {
    positions.set(node.id, { x, y: y + node.height / 2 });
    y += node.height;
    const gap = gaps[index];
    if (gap) {
      const gapHeight = metrics.gap + (gap.label?.height ?? 0);
      if (gap.label) labelPositions.set(gap.edge.id, { x, y: y + gapHeight / 2 });
      y += gapHeight;
    }
  }
  return { positions, labelPositions, height: y + metrics.inset, orientation: 'vertical' };
}

export function relationshipText(edge, titles) {
  return `${titles.get(edge.source)} ${edge.directed ? '→' : '—'} ${titles.get(edge.target)}${edge.label ? `：${edge.label}` : ''}`;
}
