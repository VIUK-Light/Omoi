#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export const REVIEW_BASE_COMMIT = "3eeff5a9618ba1503d2716c6fe89d47d30bd710d";
export const ACTIVE_LEVELS = Object.freeze([2, 3, 4]);
const helperFields = new Set(["summary", "hints", "detail", "terms"]);
const nonEmpty = value => typeof value === "string" && value.trim() !== "";
const core = record => Object.fromEntries(Object.entries(record).filter(([key]) => !helperFields.has(key)));
export const fingerprintQuestion = record => createHash("sha256").update(JSON.stringify(record)).digest("hex");

export function validateV3Review({ review, currentByLevel, baseByLevel, currentRaw, baseRaw }) {
    const errors = [];
    const add = (code, message, id) => errors.push({ code, message, ...(id ? { id } : {}) });
    if (!review || review.version !== 1 || review.baseCommit !== REVIEW_BASE_COMMIT || !isDeepStrictEqual(review.activeLevels, ACTIVE_LEVELS) || !Array.isArray(review.records)) {
        add("invalid_review_manifest", "Review version 1 must identify the fixed pre-v3 base, active Levels 2/3/4, and a records array.");
        return errors;
    }

    if (Object.hasOwn(currentByLevel, 1) || Object.hasOwn(currentRaw, 1)) {
        add("retired_level_present", "Level 1 is retired; level1.json and Level 1 records must not be present.");
    }

    const current = new Map();
    const eligible = new Map();
    let total = 0;
    for (const level of ACTIVE_LEVELS) {
        const before = baseByLevel[level];
        const after = currentByLevel[level];
        if (!Array.isArray(before) || !Array.isArray(after)) {
            add("invalid_dataset", `Level ${level} must contain an array in both versions.`);
            continue;
        }
        total += after.length;
        if (before.length !== after.length) add("changed_card_count", `Level ${level} card count changed.`);
        if (level === 2 && (typeof currentRaw[level] !== "string" || currentRaw[level] !== baseRaw[level])) {
            add("changed_lower_level_file", `Level ${level} must remain byte-for-byte unchanged.`);
        }
        const originals = new Map(before.map(record => [record.id, record]));
        if (!isDeepStrictEqual(before.map(record => record.id), after.map(record => record.id))) {
            add("changed_card_order_or_ids", `Level ${level} IDs and order must be preserved.`);
        }
        for (const record of after) {
            if (current.has(record.id)) add("duplicate_card_id", "Card ID appears more than once.", record.id);
            current.set(record.id, record);
            const original = originals.get(record.id);
            if (!original || !isDeepStrictEqual(core(original), core(record))) {
                add("changed_core_content", "Only summary, hints, detail and terms may change; question, scenario and metadata must match the base.", record.id);
            }
            if (level >= 3) eligible.set(record.id, record);
        }
    }
    if (total !== 743) add("wrong_total_count", "The v3 preview must retain all 743 active Level 2/3/4 cards.");
    if (eligible.size !== 663) add("wrong_review_scope", "The review must cover all 663 Level 3/4 cards.");

    const reviewed = new Set();
    for (const entry of review.records) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry) || !nonEmpty(entry.id)) {
            add("invalid_review_entry", "Each review needs a non-empty card ID.");
            continue;
        }
        if (reviewed.has(entry.id)) add("duplicate_review", "Card has more than one review record.", entry.id);
        reviewed.add(entry.id);
        const record = eligible.get(entry.id);
        if (!record || entry.level !== record.level) {
            add("unknown_review_card", "Review must identify a Level 3/4 card with the matching level.", entry.id);
            continue;
        }
        if (!/^[a-f0-9]{64}$/.test(entry.fingerprint ?? "") || entry.fingerprint !== fingerprintQuestion(record)) {
            add("stale_review", "The current card or helper text differs from the reviewed content.", entry.id);
        }
        if (!entry.decisions || ["summary", "hints", "background", "terms"].some(field => !nonEmpty(entry.decisions[field]))) {
            add("missing_editorial_decision", "Record a retain/omit rationale for each helper, including omitted helpers.", entry.id);
        }
        if (!nonEmpty(entry.reviewer) || !nonEmpty(entry.independentReviewer) || entry.reviewer === entry.independentReviewer) {
            add("missing_independent_review", "The authoring review and independent reading must identify different reviewers.", entry.id);
        }
    }
    for (const id of eligible.keys()) {
        if (!reviewed.has(id)) add("missing_review", "Card has not completed the v3 helper review.", id);
    }
    if (review.records.length !== 663) add("wrong_review_count", "Exactly one review per eligible card is required.");
    return errors;
}

export function verifyRepository(repositoryRoot) {
    const review = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "docs/v3-content-review.json"), "utf8"));
    const currentRaw = {}, baseRaw = {}, currentByLevel = {}, baseByLevel = {};
    for (const level of [1, 2, 3, 4]) {
        baseRaw[level] = execFileSync("git", ["show", `${REVIEW_BASE_COMMIT}:level${level}.json`], {
            cwd: repositoryRoot, encoding: "utf8", maxBuffer: 10 * 1024 * 1024
        });
        baseByLevel[level] = JSON.parse(baseRaw[level]);
    }
    for (const level of ACTIVE_LEVELS) {
        currentRaw[level] = fs.readFileSync(path.join(repositoryRoot, `level${level}.json`), "utf8");
        currentByLevel[level] = JSON.parse(currentRaw[level]);
    }
    if (fs.existsSync(path.join(repositoryRoot, "level1.json"))) {
        currentRaw[1] = fs.readFileSync(path.join(repositoryRoot, "level1.json"), "utf8");
    }
    return {
        baseCommit: REVIEW_BASE_COMMIT,
        activeLevels: [...ACTIVE_LEVELS],
        totalCards: Object.values(currentByLevel).reduce((sum, rows) => sum + rows.length, 0),
        reviewedCards: review.records?.length ?? 0,
        findings: validateV3Review({ review, currentByLevel, baseByLevel, currentRaw, baseRaw })
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (process.argv.includes("--help")) {
        console.log("Usage: node tools/verify-v3-review.mjs [--summary]\nChecks complete independent review, Level 1 retirement, and preservation of the 743 active questions.");
    } else {
        try {
            const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
            const report = verifyRepository(repositoryRoot);
            console.log(JSON.stringify(process.argv.includes("--summary") ? {
                baseCommit: report.baseCommit, activeLevels: report.activeLevels, totalCards: report.totalCards,
                reviewedCards: report.reviewedCards, errors: report.findings.length
            } : report, null, 2));
            if (report.findings.length) process.exitCode = 1;
        } catch (error) {
            console.error(`V3 review verification failed: ${error.message}`);
            process.exitCode = 1;
        }
    }
}
