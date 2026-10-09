import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadQuestionProposal } from './question-proposal.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const files = [1, 2, 3, 4].map(level => `level${level}.json`);
const approvedCategories = new Set(['self_and_values']);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const newCategory = { id: 'validator_review_only', label: '確認用', scope: '検証に使う仮の分類。' };

function withFixture(change, check) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'omoi-proposal-test-'));
    try {
        for (const level of [1, 2, 3, 4]) {
            const card = {
                id: `fixture-${level}`, level, sensitivity: 1,
                category: 'self_and_values', topic: 'fixture', question: `元の質問${level}？`,
                detail: { text: '元の背景。', sources: [{ title: '出典', url: 'https://example.test/' }] }
            };
            if (level >= 3) card.perspective = 'observer';
            fs.writeFileSync(path.join(directory, `level${level}.json`), JSON.stringify([card]));
        }
        const proposal = {
            version: 1, status: 'pending_approval',
            baseline_sha256: Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(directory, file)))])),
            new_categories: [newCategory],
            revisions: [{ id: 'fixture-1', reason: '用語を説明する。',
                before: { question: '元の質問1？' }, after: { question: '意味を補った質問？' } }],
            category_moves: [{ id: 'fixture-2', from: 'self_and_values', to: newCategory.id, reason: '論点に合わせる。' }],
            additions: [{ reason: '仮の場面を加える。', card: {
                id: 'fixture-new', level: 3, sensitivity: 2, category: newCategory.id,
                topic: 'new_topic', question: '追加の質問？', perspective: 'observer', detail: { text: '仮の場面。' }
            } }]
        };
        change(proposal);
        const proposalPath = path.join(directory, 'proposal.json');
        fs.writeFileSync(proposalPath, JSON.stringify(proposal));
        check(() => loadQuestionProposal(proposalPath, directory, approvedCategories), directory);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

// Fixtures keep CI independent of an old proposal's hashes after live content changes.
test('a review retains existing cards and metadata without writing live files', () => {
    withFixture(() => {}, (load, directory) => {
        const before = files.map(file => fs.readFileSync(path.join(directory, file), 'utf8'));
        const review = load();
        assert.equal(review.categories.size, 2);
        assert.deepEqual([...review.recordsByFile.values()].map(cards => cards.length), [1, 1, 2, 1]);
        assert.equal(review.summary.productionFilesWritten, 0);
        assert.equal(review.recordsByFile.get('level1.json')[0].question, '意味を補った質問？');
        assert.equal(review.recordsByFile.get('level2.json')[0].category, newCategory.id);
        for (const [index, file] of files.entries()) {
            const original = JSON.parse(before[index])[0];
            const proposed = review.recordsByFile.get(file).find(card => card.id === original.id);
            assert.ok(proposed);
            for (const key of ['id', 'level', 'sensitivity', 'topic', 'perspective', 'content_warning']) {
                assert.deepEqual(proposed[key], original[key]);
            }
            assert.deepEqual(proposed.detail.sources, original.detail.sources);
            assert.equal(fs.readFileSync(path.join(directory, file), 'utf8'), before[index]);
        }
    });
});

test('the quality CLI validates a pending dataset separately from live content', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'omoi-proposal-cli-'));
    try {
        const before = files.map(file => fs.readFileSync(path.join(repositoryRoot, file), 'utf8'));
        const liveCards = before.flatMap(text => JSON.parse(text));
        const first = JSON.parse(before[0])[0];
        const fixtureId = randomUUID();
        const proposal = {
            version: 1, status: 'pending_approval',
            baseline_sha256: Object.fromEntries(files.map((file, index) => [file, hash(before[index])])),
            new_categories: [newCategory], revisions: [], category_moves: [],
            additions: [{ reason: 'CLIの検証用。', card: {
                ...first, id: fixtureId, category: newCategory.id, question: `検証用の質問 ${fixtureId}？`
            } }]
        };
        const proposalPath = path.join(directory, 'proposal.json');
        fs.writeFileSync(proposalPath, JSON.stringify(proposal));
        const verify = (...args) => JSON.parse(execFileSync(process.execPath,
            ['tools/verify-question-dataset.mjs', '--enforce-quality-targets', '--summary', ...args],
            { cwd: repositoryRoot, encoding: 'utf8' }));
        const proposed = verify('--proposal', proposalPath);
        const live = verify();
        assert.equal(proposed.errors, 0);
        assert.equal(proposed.totalRecords, liveCards.length + 1);
        assert.equal(proposed.proposal.status, 'pending_approval');
        assert.equal(proposed.proposal.productionFilesWritten, 0);
        assert.equal(live.totalRecords, liveCards.length);
        assert.equal(live.proposal, undefined);
        for (const [index, file] of files.entries()) {
            assert.equal(fs.readFileSync(path.join(repositoryRoot, file), 'utf8'), before[index]);
        }
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

test('a proposal prepared from different live data is rejected', () => {
    withFixture(proposal => { proposal.baseline_sha256['level2.json'] = 'stale'; },
        load => assert.throws(load, /changed since the proposal/));
});

test('incorrect before text cannot silently replace a question', () => {
    withFixture(proposal => { proposal.revisions[0].before.question = 'incorrect original'; },
        load => assert.throws(load, /baseline mismatch/));
});

test('revision fields cannot change levels or remove sources', () => {
    withFixture(proposal => {
        proposal.revisions[0].before.level = 1;
        proposal.revisions[0].after.level = 4;
    }, load => assert.throws(load, /invalid or unchanged revision field level/));
});

test('duplicate edits and mismatched category moves are rejected', () => {
    withFixture(proposal => { proposal.revisions.push(proposal.revisions[0]); },
        load => assert.throws(load, /duplicate revision id/));
    withFixture(proposal => { proposal.category_moves[0].from = 'incorrect'; },
        load => assert.throws(load, /category move or baseline mismatch/));
});

test('new cards cannot reuse an id or introduce an undeclared category', () => {
    withFixture(proposal => { proposal.additions[0].card.id = proposal.revisions[0].id; },
        load => assert.throws(load, /duplicate id/));
    withFixture(proposal => { proposal.additions[0].card.category = 'undeclared'; },
        load => assert.throws(load, /invalid new card/));
});

test('duplicate category definitions are rejected', () => {
    withFixture(proposal => { proposal.new_categories.push(proposal.new_categories[0]); },
        load => assert.throws(load, /unique id, label and scope/));
});
