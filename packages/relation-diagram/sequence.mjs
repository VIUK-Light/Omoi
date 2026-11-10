import { createRelationDiagram } from './index.mjs';
import { normalizeData, normalizeOptions } from './model.mjs';

const mounted = new WeakMap();
const KINDS = new Set(['timeline', 'comparison']);
let sequenceCount = 0;

/** Validate every frame before showing any of it, and own the supplied data. */
export function normalizeSequence(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('sequence must be an object.');
  }
  const kind = input.kind ?? 'timeline';
  if (!KINDS.has(kind)) throw new TypeError('sequence.kind must be timeline or comparison.');
  if (!Array.isArray(input.frames) || input.frames.length === 0) {
    throw new TypeError('sequence.frames must be a non-empty array.');
  }
  const frames = input.frames.map((frame, index) => {
    if (!frame || typeof frame !== 'object' || Array.isArray(frame)) {
      throw new TypeError(`frames[${index}] must be an object.`);
    }
    if (typeof frame.label !== 'string' || !frame.label.trim()) {
      throw new TypeError(`frames[${index}].label must be a non-empty string.`);
    }
    const options = normalizeOptions(frame.options);
    return { label: frame.label, data: normalizeData(frame.data, options), options };
  });
  return { kind, frames };
}

/** A manually stepped sequence; every frame uses the existing graph API. */
export function createRelationSequence(host, input) {
  if (!host || host.nodeType !== 1 || !host.ownerDocument) throw new TypeError('host must be an Element.');
  if (mounted.has(host)) throw new TypeError('This host already contains a relation sequence.');
  let sequence = normalizeSequence(input);
  const document = host.ownerDocument;
  if (!document.defaultView) throw new TypeError('A browser document is required.');
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = element('section', 'rd-sequence');
  const navigation = element('nav', 'rd-sequence-navigation');
  const previous = element('button', 'rd-scene-previous', '〈');
  const next = element('button', 'rd-scene-next', '〉');
  previous.type = next.type = 'button';
  const position = element('span', 'rd-scene-position');
  position.setAttribute('aria-live', 'polite');
  position.setAttribute('aria-atomic', 'true');
  const caption = element('p', 'rd-scene-label');
  caption.id = `rd-sequence-${++sequenceCount}-label`;
  const graphHost = element('div', 'rd-sequence-diagram');
  graphHost.setAttribute('role', 'group');
  graphHost.setAttribute('aria-labelledby', caption.id);
  navigation.append(previous, position, next);
  root.append(navigation, caption, graphHost);
  host.append(root);

  let currentIndex = 0;
  let diagram = null;
  let destroyed = false;

  function render(nextSequence, nextIndex) {
    const frame = nextSequence.frames[nextIndex];
    // The outer controls change only after the graph accepts its next data.
    if (diagram) diagram.update(frame.data, frame.options);
    else diagram = createRelationDiagram(graphHost, frame.data, frame.options);
    sequence = nextSequence;
    currentIndex = nextIndex;
    const comparison = sequence.kind === 'comparison';
    const unit = comparison ? 'ケース' : '場面';
    root.dataset.sceneIndex = String(currentIndex);
    root.dataset.sceneCount = String(sequence.frames.length);
    root.dataset.sequenceKind = sequence.kind;
    root.setAttribute('aria-label', comparison ? 'ケースごとの関係図' : '場面ごとの関係図');
    navigation.setAttribute('aria-label', `図の${unit}を切り替え`);
    previous.setAttribute('aria-label', `前の${unit}`);
    next.setAttribute('aria-label', `次の${unit}`);
    previous.title = `前の${unit}`;
    next.title = `次の${unit}`;
    previous.disabled = currentIndex === 0;
    next.disabled = currentIndex === sequence.frames.length - 1;
    position.textContent = `${unit} ${currentIndex + 1} / ${sequence.frames.length}`;
    caption.textContent = frame.label;
  }

  function move(delta) {
    if (destroyed) return;
    const nextIndex = currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= sequence.frames.length) return;
    render(sequence, nextIndex);
  }

  const goPrevious = () => move(-1);
  const goNext = () => move(1);
  previous.addEventListener('click', goPrevious);
  next.addEventListener('click', goNext);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    previous.removeEventListener('click', goPrevious);
    next.removeEventListener('click', goNext);
    diagram?.destroy();
    diagram = null;
    root.remove();
    mounted.delete(host);
  }

  try {
    render(sequence, 0);
    const api = {
      update(nextInput) {
        if (destroyed) throw new Error('Cannot update a destroyed relation sequence.');
        const normalized = normalizeSequence(nextInput);
        render(normalized, 0);
      },
      destroy,
    };
    mounted.set(host, api);
    return api;
  } catch (error) {
    destroy();
    throw error;
  }
}
