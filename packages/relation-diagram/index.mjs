import cytoscape from './vendor/cytoscape.esm.min.mjs';
import { normalizeData, normalizeOptions, branchMetrics, branchPositions, rightBranchMetrics, rightBranchPositions, pathMetrics, pathPositions, pairMetrics, pairPositions, relationshipText } from './model.mjs';

const mounted = new WeakMap();
const stylesheets = new WeakMap();
let instanceCount = 0;

function ensureStyles(document) {
  if (stylesheets.has(document)) return stylesheets.get(document);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./styles.css', import.meta.url).href;
  link.dataset.relationDiagramStyles = '';
  const ready = new Promise(resolve => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
  (document.head || document.documentElement).append(link);
  stylesheets.set(document, ready);
  return ready;
}

/** A read-only graph: HTML content, Cytoscape model/layout/edge renderer. */
export function createRelationDiagram(host, input, inputOptions = {}) {
  if (!host || host.nodeType !== 1 || !host.ownerDocument) throw new TypeError('host must be an Element.');
  if (mounted.has(host)) throw new TypeError('This host already contains a relation diagram.');
  let options = normalizeOptions(inputOptions);
  let data = normalizeData(input, options);
  const document = host.ownerDocument;
  const window = document.defaultView;
  if (!window) throw new TypeError('A browser document is required.');
  const instanceId = `rd-${++instanceCount}`;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = element('section', 'rd-diagram');
  root.dataset.ready = 'false';
  root.dataset.rdReady = 'false';
  root.setAttribute('aria-label', data.heading || '関係図');
  const heading = element('h2', 'rd-heading');
  const note = element('p', 'rd-note');
  const surface = element('div', 'rd-surface');
  surface.style.position = 'relative';
  surface.style.height = '240px';
  const canvas = element('div', 'rd-canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.setAttribute('aria-hidden', 'true');
  const world = element('div', 'rd-world');
  const navigation = element('div', 'rd-navigation');
  navigation.setAttribute('aria-label', '関係図の表示を調整');
  const help = element('p', 'rd-help', '背景をドラッグして移動できます。文章の大きさを保って表示しています。');
  const relations = element('details', 'rd-relations');
  relations.append(element('summary', '', 'つながりを文章で読む'));
  const relationList = element('ul');
  relations.append(relationList);
  const credit = element('footer', 'rd-credit');
  const original = element('a', '', '原作：VIUK-Light');
  original.href = 'https://viuk-light.org/';
  const license = element('a', '', '利用条件');
  license.href = new URL('./LICENSE', import.meta.url).href;
  credit.append(original, license);
  surface.append(canvas, world);
  root.append(heading, note, surface, navigation, help, relations, credit);
  host.append(root);

  let destroyed = false;
  let layoutFrame = 0;
  let paintFrame = 0;
  let layoutSignature = '';
  let networkLayout = null;
  const cards = new Map();
  const edgeLabels = new Map();
  let edgeLabelPositions = new Map();
  const requestFrame = callback => window.requestAnimationFrame(callback);
  let cy;
  let resizeObserver;
  let colorScheme;

  // Canvas cannot inherit CSS colors. Read the same component palette as the
  // HTML nodes and refresh the stylesheet when the system scheme changes.
  function graphStyle() {
    const style = window.getComputedStyle(root);
    const color = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    const line = color('--rd-line', '#aaa194');
    return [
      { selector: 'node', style: {
        shape: 'round-rectangle', width: 'data(_width)', height: 'data(_height)',
        'background-opacity': 0, 'border-width': 0, label: '',
      } },
      { selector: 'edge', style: {
        width: 1.5, 'line-color': line, 'target-arrow-color': line,
        'line-style': edge => edge.data('lineStyle') || 'solid',
        'target-arrow-shape': edge => edge.data('directed') ? 'triangle' : 'none',
        'arrow-scale': .8, 'curve-style': 'bezier',
        label: 'data(label)', 'font-size': 16, 'font-family': 'sans-serif',
        'text-wrap': 'wrap', 'text-max-width': 140,
        color: color('--rd-edge-ink', '#625a50'),
        'text-background-color': color('--rd-paper', '#fff'),
        'text-background-opacity': 1,
        'text-background-padding': '3px', 'text-events': 'no',
      } },
    ];
  }

  function refreshColors() {
    if (destroyed || !cy) return;
    // Replacing the base stylesheet retains the per-layout edge bypasses.
    cy.style().fromJson(graphStyle()).update();
  }

  function queuePaint() {
    if (destroyed || paintFrame) return;
    paintFrame = requestFrame(() => {
      paintFrame = 0;
      if (destroyed) return;
      const pan = cy.pan();
      world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${cy.zoom()})`;
      for (const [id, card] of cards) {
        const position = cy.getElementById(id).position();
        card.style.left = `${position.x}px`;
        card.style.top = `${position.y}px`;
      }
      for (const [id, label] of edgeLabels) {
        const position = edgeLabelPositions.get(id);
        if (!position) continue;
        label.style.left = `${position.x}px`;
        label.style.top = `${position.y}px`;
      }
    });
  }

  function queueLayout() {
    if (destroyed || layoutFrame) return;
    layoutFrame = requestFrame(layout);
  }

  function layout() {
    layoutFrame = 0;
    if (destroyed) return;
    const width = surface.clientWidth;
    if (width < 1) return;
    const branches = options.layout === 'branches';
    const right = branches && options.direction === 'right';
    const path = options.layout === 'path';
    const pairs = options.layout === 'pairs';
    const metrics = pairs ? pairMetrics(width) : right ? rightBranchMetrics(width) : path
      ? pathMetrics(width, data.nodes.length, edgeLabels.size)
      : branchMetrics(width, data.nodes.length - 1);
    for (const node of data.nodes) {
      const nodeWidth = path || right || pairs ? metrics.nodeWidth : branches
        ? (node.id === data.rootId ? metrics.rootWidth : metrics.childWidth)
        : Math.max(140, Math.min(220, width - 48));
      cards.get(node.id).style.width = `${nodeWidth}px`;
    }
    for (const label of edgeLabels.values()) label.style.width = `${metrics.labelWidth}px`;
    const sizes = data.nodes.map(node => ({
      id: node.id,
      width: cards.get(node.id).offsetWidth,
      height: cards.get(node.id).offsetHeight,
    }));
    const labelSizes = [...edgeLabels].map(([id, label]) => ({ id, width: label.offsetWidth, height: label.offsetHeight }));
    const signature = JSON.stringify([width, options.layout, options.direction, sizes, labelSizes]);
    if (signature === layoutSignature) { queuePaint(); return; }
    layoutSignature = signature;
    networkLayout?.stop();
    cy.batch(() => {
      for (const size of sizes) cy.getElementById(size.id).data({ _width: size.width, _height: size.height });
    });
    if (path || right || pairs) {
      const plan = pairs ? pairPositions(width, sizes, labelSizes, data.edges) : right ? rightBranchPositions(width, data.rootId, sizes, labelSizes, data.edges)
        : pathPositions(width, sizes, labelSizes, data.edges);
      surface.style.height = `${Math.ceil(plan.height)}px`;
      if (path) root.dataset.orientation = plan.orientation;
      delete root.dataset.stacked;
      edgeLabelPositions = plan.labelPositions;
      cy.edges().removeStyle();
      cy.edges().style({
        'curve-style': 'straight',
        'source-endpoint': 'outside-to-node',
        'target-endpoint': 'outside-to-node',
        // An empty label bypass restores Cytoscape's data(label) mapping.
        // Hide canvas text explicitly when HTML owns the edge label.
        'text-opacity': 0,
        'text-background-opacity': 0,
      });
      cy.batch(() => {
        for (const [id, position] of plan.positions) cy.getElementById(id).position(position);
      });
      cy.resize();
      cy.viewport({ zoom: 1, pan: { x: 0, y: 0 } });
    } else if (branches) {
      const plan = branchPositions(width, data.rootId, sizes);
      surface.style.height = `${Math.ceil(plan.height)}px`;
      root.dataset.stacked = String(plan.stacked);
      cy.edges().removeStyle();
      cy.edges().style({
        'curve-style': plan.stacked ? 'segments' : 'taxi',
        'taxi-direction': plan.stacked ? 'leftward' : 'downward',
        'taxi-turn': plan.stacked ? '24px' : '28px',
        'taxi-turn-min-distance': '4px',
        'edge-distances': plan.stacked ? 'endpoints' : 'intersection',
        'source-endpoint': plan.stacked ? '-50% 0%' : 'outside-to-node',
        'target-endpoint': plan.stacked ? '-50% 0%' : 'outside-to-node',
        'segment-weights': [0, 1],
        'segment-distances': [24, 24],
      });
      cy.batch(() => {
        for (const [id, position] of plan.positions) cy.getElementById(id).position(position);
      });
      cy.resize();
      cy.viewport({ zoom: 1, pan: { x: 0, y: 0 } });
    } else {
      surface.style.height = `${Math.max(460, Math.min(680, width * .7 + 200))}px`;
      delete root.dataset.stacked;
      cy.edges().removeStyle();
      cy.resize();
      const height = surface.clientHeight;
      cy.batch(() => {
        cy.nodes().forEach((node, index) => {
          const angle = index / data.nodes.length * Math.PI * 2;
          node.position({ x: width / 2 + Math.cos(angle) * 240, y: height / 2 + Math.sin(angle) * 240 });
        });
      });
      networkLayout = cy.layout({
        name: 'cose', animate: false, fit: false, randomize: false,
        nodeDimensionsIncludeLabels: false, nodeRepulsion: 9000,
        idealEdgeLength: 100, componentSpacing: 100, numIter: 400,
      });
      networkLayout.run();
      cy.zoom(1);
      const bounds = cy.nodes().boundingBox({ includeLabels: false });
      surface.style.height = `${Math.max(460, Math.ceil(bounds.h + 48))}px`;
      cy.resize();
      cy.pan({ x: (width - bounds.w) / 2 - bounds.x1, y: 24 - bounds.y1 });
    }
    root.dataset.ready = 'true';
    root.dataset.rdReady = 'true';
    queuePaint();
  }

  function addButton(label, action, title = label) {
    const button = element('button', '', label);
    button.type = 'button';
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', action);
    navigation.append(button);
    return button;
  }

  function render() {
    networkLayout?.stop();
    layoutSignature = '';
    root.dataset.layout = options.layout;
    if (options.layout === 'branches') root.dataset.direction = options.direction;
    else delete root.dataset.direction;
    delete root.dataset.orientation;
    delete root.dataset.stacked;
    root.dataset.ready = 'false';
    root.dataset.rdReady = 'false';
    root.setAttribute('aria-label', data.heading || '関係図');
    heading.textContent = data.heading;
    heading.hidden = !data.heading;
    note.textContent = data.note;
    note.hidden = !data.note;
    for (const card of cards.values()) resizeObserver?.unobserve(card);
    for (const label of edgeLabels.values()) resizeObserver?.unobserve(label);
    cards.clear();
    edgeLabels.clear();
    edgeLabelPositions = new Map();
    world.replaceChildren();
    const ordered = options.layout === 'branches'
      ? [...data.nodes.filter(node => node.id === data.rootId), ...data.nodes.filter(node => node.id !== data.rootId)]
      : data.nodes;
    for (const [index, node] of ordered.entries()) {
      const card = element('article', `rd-node rd-node--${node.kind}`);
      if (options.layout === 'branches' && options.direction === 'right' && node.id === data.rootId) {
        card.classList.add('rd-node--root');
      }
      card.dataset.nodeId = node.id;
      card.dataset.rdNodeId = node.id;
      card.style.position = 'absolute';
      card.style.width = '220px';
      const title = element('h3', 'rd-node-title', node.title);
      title.id = `${instanceId}-node-${index}`;
      card.setAttribute('aria-labelledby', title.id);
      if (node.caption.trim()) card.append(element('p', 'rd-node-caption', node.caption));
      card.append(title);
      for (const paragraph of node.body) card.append(element('p', 'rd-node-body', paragraph));
      world.append(card);
      cards.set(node.id, card);
      resizeObserver?.observe(card);
    }
    if (options.layout === 'path' || options.layout === 'pairs' || (options.layout === 'branches' && options.direction === 'right')) {
      for (const edge of data.edges) {
        if (!edge.label.trim()) continue;
        const label = element('p', 'rd-edge-label', edge.label);
        label.dataset.edgeId = edge.id;
        label.dataset.source = edge.source;
        label.dataset.target = edge.target;
        label.style.position = 'absolute';
        world.append(label);
        edgeLabels.set(edge.id, label);
        resizeObserver?.observe(label);
      }
    }
    relationList.replaceChildren();
    const titles = new Map(data.nodes.map(node => [node.id, node.title]));
    for (const edge of data.edges) relationList.append(element('li', '', relationshipText(edge, titles)));
    relations.hidden = data.edges.length === 0;
    navigation.replaceChildren();
    navigation.hidden = !options.interactive;
    help.hidden = !options.interactive;
    if (options.interactive) {
      addButton('＋', () => cy.zoom({ level: Math.min(2.5, cy.zoom() * 1.2), renderedPosition: { x: surface.clientWidth / 2, y: surface.clientHeight / 2 } }), '関係図を拡大');
      addButton('−', () => cy.zoom({ level: Math.max(1, cy.zoom() / 1.2), renderedPosition: { x: surface.clientWidth / 2, y: surface.clientHeight / 2 } }), '関係図を縮小（元の文字サイズまで）');
      addButton('中央へ', () => { cy.zoom(1); cy.center(); });
      for (const [label, x, y, name] of [['←', 100, 0, '左側を見る'], ['→', -100, 0, '右側を見る'], ['↑', 0, 100, '上側を見る'], ['↓', 0, -100, '下側を見る']]) {
        addButton(label, () => cy.panBy({ x, y }), name);
      }
      const select = element('select');
      select.setAttribute('aria-label', '表示する項目へ移動');
      select.append(element('option', '', '項目を選んで移動'));
      select.firstElementChild.value = '';
      for (const node of data.nodes) {
        const option = element('option', '', node.title);
        option.value = node.id;
        select.append(option);
      }
      select.addEventListener('change', () => {
        if (select.value !== '') { cy.zoom(1); cy.center(cy.getElementById(select.value)); }
      });
      navigation.append(select);
    }
    cy.userPanningEnabled(options.interactive);
    cy.userZoomingEnabled(options.interactive);
    cy.batch(() => {
      cy.elements().remove();
      cy.add([
        ...data.nodes.map(node => ({ group: 'nodes', data: { id: node.id, _width: 220, _height: 100 } })),
        ...data.edges.map(edge => ({ group: 'edges', data: { ...edge } })),
      ]);
    });
    queueLayout();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (layoutFrame) window.cancelAnimationFrame(layoutFrame);
    if (paintFrame) window.cancelAnimationFrame(paintFrame);
    networkLayout?.stop();
    resizeObserver?.disconnect();
    window.removeEventListener('resize', queueLayout);
    if (colorScheme?.removeEventListener) colorScheme.removeEventListener('change', refreshColors);
    else colorScheme?.removeListener(refreshColors);
    cy?.destroy();
    cards.clear();
    edgeLabels.clear();
    edgeLabelPositions.clear();
    root.remove();
    mounted.delete(host);
  }

  try {
    cy = cytoscape({
      container: canvas,
      elements: [],
      layout: { name: 'preset', fit: false },
      minZoom: 1,
      maxZoom: 2.5,
      zoom: 1,
      autoungrabify: true,
      autounselectify: true,
      boxSelectionEnabled: false,
      style: graphStyle(),
    });
    cy.on('pan zoom position render', queuePaint);
    colorScheme = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (colorScheme?.addEventListener) colorScheme.addEventListener('change', refreshColors);
    else colorScheme?.addListener(refreshColors);
    if (window.ResizeObserver) {
      resizeObserver = new window.ResizeObserver(queueLayout);
      resizeObserver.observe(surface);
    } else {
      window.addEventListener('resize', queueLayout);
    }
    const api = {
      update(nextData, nextOptions = {}) {
        if (destroyed) throw new Error('Cannot update a destroyed relation diagram.');
        const normalizedOptions = normalizeOptions(nextOptions, options);
        const normalizedData = normalizeData(nextData, normalizedOptions);
        options = normalizedOptions;
        data = normalizedData;
        render();
      },
      destroy,
    };
    mounted.set(host, api);
    render();
    ensureStyles(document).then(() => { if (!destroyed) { refreshColors(); layoutSignature = ''; queueLayout(); } });
    document.fonts?.ready.then(() => { if (!destroyed) { layoutSignature = ''; queueLayout(); } });
    return api;
  } catch (error) {
    destroy();
    throw error;
  }
}
