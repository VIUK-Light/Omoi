import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRelationSequence } from './adapter.mjs';
import { normalizeSequence } from '../../packages/relation-diagram/sequence.mjs';

const load = (level, id) => JSON.parse(readFileSync(new URL(`../../level${level}.json`, import.meta.url))).find(card => card.id === id);

test('all scene data validate without changing the source question or scenario', () => {
    for (const [level, id, count] of [[4, 'relationship-009', 2], [4, 'l4-relationship-002', 3], [3, 'gender-l3-009', 2]]) {
        const card = load(level, id);
        const before = structuredClone(card);
        const input = getRelationSequence(card);
        const sequence = normalizeSequence(input);
        assert.equal(sequence.frames.length, count);
        assert.deepEqual(card, before);
        input.frames[0].data.nodes[0].title = 'external edit';
        assert.notEqual(getRelationSequence(card).frames[0].data.nodes[0].title, 'external edit');
    }
    assert.equal(getRelationSequence({ id: 'ordinary', level: 4 }), null);
});

test('kinship separates the earlier belief, discovery, and prior concealment while retaining discovered facts', () => {
    const { frames } = getRelationSequence(load(4, 'l4-relationship-002'));
    const relation = frame => frame.data.edges.find(edge => edge.id === 'upbringing').label;
    assert.match(relation(frames[0]), /思っていた/);
    assert.doesNotMatch(relation(frames[0]), /血縁なし/);
    assert.equal(frames[0].data.nodes.find(node => node.id === 'child').body, undefined);
    assert.match(relation(frames[1]), /血縁なし/);
    const child = frame => frame.data.nodes.find(node => node.id === 'child').body;
    assert.match(child(frames[1]), /配偶者と\s*別の人の子/);
    assert.equal(child(frames[2]), child(frames[1]));
    assert.equal(frames[1].data.nodes.find(node => node.id === 'spouse').body, undefined);
    assert.match(frames[2].label, /前から/);
    assert.match(frames[2].data.nodes.find(node => node.id === 'spouse').body, /隠した/);
});

test('gender switches parallel cases with the same conditions, rather than a chronological transformation', () => {
    const sequence = getRelationSequence(load(3, 'gender-l3-009'));
    assert.equal(sequence.kind, 'comparison');
    assert.equal(sequence.frames[0].data.note, sequence.frames[1].data.note);
    assert.deepEqual(sequence.frames.map(frame => frame.data.nodes.map(node => node.title)), [['交際相手', '男性'], ['交際相手', '女性']]);
    assert.ok(sequence.frames.every(frame => frame.data.edges.length === 1));
});
