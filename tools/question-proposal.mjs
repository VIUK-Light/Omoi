import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

// Build a review dataset in memory. This module never writes to levelN.json.
export function loadQuestionProposal(proposalPath, repositoryRoot, approvedCategories) {
    const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));
    const fail = (message) => { throw new Error(`Question proposal: ${message}`); };
    if (proposal.version !== 1 || proposal.status !== "pending_approval") {
        fail("expected version 1 and pending_approval status.");
    }
    for (const key of ["new_categories", "revisions", "category_moves", "additions"]) {
        if (!Array.isArray(proposal[key])) fail(`${key} must be an array.`);
    }

    const categories = new Set(approvedCategories);
    for (const category of proposal.new_categories) {
        if (!category || typeof category.id !== "string" ||
            !/^[a-z]+(?:_[a-z]+)*$/.test(category.id) ||
            typeof category.label !== "string" || !category.label.trim() ||
            typeof category.scope !== "string" || !category.scope.trim() ||
            categories.has(category.id)) {
            fail("new category must have a unique id, label and scope.");
        }
        categories.add(category.id);
    }

    const recordsByFile = new Map();
    const recordsById = new Map();
    for (const level of [1, 2, 3, 4]) {
        const fileName = `level${level}.json`;
        const bytes = fs.readFileSync(path.join(repositoryRoot, fileName));
        const hash = createHash("sha256").update(bytes).digest("hex");
        if (proposal.baseline_sha256?.[fileName] !== hash) {
            fail(`${fileName} changed since the proposal was prepared. Review its baseline first.`);
        }
        const cards = JSON.parse(bytes.toString("utf8"));
        if (!Array.isArray(cards)) fail(`${fileName} must contain an array.`);
        recordsByFile.set(fileName, cards);
        for (const card of cards) {
            if (recordsById.has(card.id)) fail(`baseline has duplicate id ${card.id}.`);
            recordsById.set(card.id, card);
        }
    }

    const revisedIds = new Set();
    for (const revision of proposal.revisions) {
        const card = recordsById.get(revision?.id);
        if (!card || revisedIds.has(revision.id)) fail("unknown or duplicate revision id.");
        if (typeof revision.reason !== "string" || !revision.reason.trim()) {
            fail(`${revision.id} needs a review reason.`);
        }
        const before = revision.before;
        const after = revision.after;
        if (!before || !after || Array.isArray(before) || Array.isArray(after) ||
            !isDeepStrictEqual(Object.keys(before).sort(), Object.keys(after).sort()) ||
            Object.keys(after).length === 0) {
            fail(`${revision.id} needs matching before/after fields.`);
        }
        for (const key of Object.keys(after)) {
            if (!["question", "detail_text"].includes(key) ||
                typeof before[key] !== "string" || typeof after[key] !== "string" ||
                !after[key].trim() || before[key] === after[key]) {
                fail(`${revision.id}: invalid or unchanged revision field ${key}.`);
            }
            const currentValue = key === "question" ? card.question : card.detail?.text;
            if (currentValue !== before[key]) fail(`${revision.id}: ${key} baseline mismatch.`);
            if (key === "question") card.question = after[key];
            else card.detail.text = after[key];
        }
        revisedIds.add(revision.id);
    }

    const movedIds = new Set();
    for (const move of proposal.category_moves) {
        const card = recordsById.get(move?.id);
        if (!card || movedIds.has(move.id) || card.category !== move.from ||
            !categories.has(move.to) || move.from === move.to ||
            typeof move.reason !== "string" || !move.reason.trim()) {
            fail("invalid category move or baseline mismatch.");
        }
        card.category = move.to;
        movedIds.add(move.id);
    }

    for (const addition of proposal.additions) {
        const card = addition?.card;
        if (!card || ![1, 2, 3, 4].includes(card.level) ||
            typeof card.id !== "string" || !card.id.trim() ||
            recordsById.has(card.id) || !categories.has(card.category) ||
            typeof addition.reason !== "string" || !addition.reason.trim()) {
            fail("invalid new card, duplicate id, or missing review reason.");
        }
        recordsByFile.get(`level${card.level}.json`).push(card);
        recordsById.set(card.id, card);
    }

    return {
        recordsByFile,
        categories,
        summary: {
            status: proposal.status,
            revisions: proposal.revisions.length,
            categoryMoves: proposal.category_moves.length,
            newCategories: proposal.new_categories.length,
            additions: proposal.additions.length,
            productionFilesWritten: 0
        }
    };
}
