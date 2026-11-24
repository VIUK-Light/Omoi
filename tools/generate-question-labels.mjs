#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    assignQuestionLabels,
    isKnownLabel,
    labelDefinitions,
    topicLabelIds,
    validateLabelList
} from "./question-labels.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
function flattenSummary(summary) {
    if (!Array.isArray(summary)) return "";
    return summary.map(block => {
        if (!block || typeof block !== "object") return "";
        if (block.type === "text") return typeof block.text === "string" ? block.text : "";
        if (block.type === "bullets" && Array.isArray(block.items)) {
            return block.items.map(item => {
                if (!item || typeof item !== "object") return "";
                return [item.label, item.text].filter(value => typeof value === "string" && value).join(" ");
            }).filter(Boolean).join(" ");
        }
        return "";
    }).filter(Boolean).join(" ");
}

function buildQuestionHints(record) {
    if (!Array.isArray(record.hints)) return [];
    return record.hints.filter(value => typeof value === "string" && value);
}

function buildQuestionTerms(record) {
    if (!Array.isArray(record.terms)) return [];
    return record.terms.map(term => {
        if (!term || typeof term !== "object" || typeof term.term !== "string" || !term.term) return "";
        return term.definition ? term.term + ": " + term.definition : term.term;
    }).filter(Boolean);
}

function buildQuestionSearchText(record) {
    const parts = [];
    for (const value of [
        record.category,
        record.topic,
        record.perspective,
        record.role,
        ...(Array.isArray(record.content_warning) ? record.content_warning : [])
    ]) {
        if (typeof value === "string" && value) parts.push(value);
    }
    if (typeof record.scenario === "string" && record.scenario) parts.push(record.scenario);
    const summary = flattenSummary(record.summary);
    if (summary) parts.push(summary);
    if (Array.isArray(record.hints)) {
        const hints = record.hints.filter(value => typeof value === "string" && value).join(" ");
        if (hints) parts.push(hints);
    }
    if (Array.isArray(record.terms)) {
        const terms = record.terms.map(term => {
            if (!term || typeof term !== "object") return "";
            return [term.term, term.definition].filter(value => typeof value === "string" && value).join(" ");
        }).filter(Boolean).join(" ");
        if (terms) parts.push(terms);
    }
    return parts.join("\n");
}

function katakanaToHiragana(value) {
    return String(value ?? "").replace(/[ァ-ン]/g, char =>
        String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
}

function buildQuestionReading(record) {
    const text = [
        record.question,
        typeof record.scenario === "string" ? record.scenario : "",
        flattenSummary(record.summary),
        Array.isArray(record.hints) ? record.hints.join(" ") : "",
        Array.isArray(record.terms)
            ? record.terms.map(term => (typeof term === "string" ? term : (term?.term ?? "") + " " + (term?.definition ?? ""))).join(" ")
            : ""
    ].filter(Boolean).join(" ");

    try {
        const tokens = kuromojiTokenizer.tokenize(text);
        const reading = tokens
            .map(token => (token.reading && token.reading !== "*" ? token.reading : token.surface_form))
            .join("");
        return katakanaToHiragana(reading);
    } catch (error) {
        return katakanaToHiragana(text);
    }
}

const kuromoji = await import("kuromoji");
const kuromojiTokenizer = await new Promise((resolve, reject) => {
    kuromoji.default.builder({ dicPath: path.join(path.resolve(scriptDirectory, ".."), "node_modules", "kuromoji", "dict") })
        .build((error, tokenizer) => {
            if (error) reject(error);
            else resolve(tokenizer);
        });
});

const repositoryRoot = path.resolve(scriptDirectory, "..");
const activeLevels = [2, 3, 4];
const questionDataDirectory = "データ/質問";
const indexDataDirectory = "データ/索引";
const levelFiles = activeLevels.map(level => `${questionDataDirectory}/level${level}.json`);
const labelsFile = `${indexDataDirectory}/labels.json`;
const indexFile = `${indexDataDirectory}/questions-index.json`;
const detailIndexFile = `${indexDataDirectory}/question-details-index.json`;
const addedDatesFile = `${indexDataDirectory}/question-added-dates.json`;
const filterIndexFile = `${indexDataDirectory}/question-filter-index.json`;
const argumentsSet = new Set(process.argv.slice(2));
const write = argumentsSet.has("--write");
const rewriteLabels = argumentsSet.has("--rewrite-labels");
const jsonOutput = argumentsSet.has("--json");

if (argumentsSet.has("--help")) {
    console.log(`Usage: node tools/generate-question-labels.mjs [options]

Options:
  --write            Add missing labels and write the generated question indexes.
  --rewrite-labels   Re-apply rules to every card instead of preserving existing labels.
  --check            Validate labels and generated files without writing (default).
                     Added dates are maintained in ${addedDatesFile}.
  --json             Print the report as JSON.
  --help             Show this help.`);
    process.exit(0);
}

const labelsDocument = {
    version: 1,
    labels: labelDefinitions.map(label => ({ ...label }))
};
const labelsDocumentText = `${JSON.stringify(labelsDocument, null, 2)}\n`;

const findings = [];
const addFinding = (code, message, context = {}) => findings.push({ code, message, ...context });
const levels = new Map();

for (const fileName of levelFiles) {
    try {
        const text = fs.readFileSync(path.join(repositoryRoot, fileName), "utf8");
        const records = JSON.parse(text);
        if (!Array.isArray(records)) {
            addFinding("invalid_root", `${fileName} must contain an array.`, { file: fileName });
            continue;
        }
        // 既存ファイルの字下げを保ち、ラベル追加以外の差分を出さない。
        const indent = /\n( +)\{/.exec(text)?.[1].length ?? 4;
        levels.set(fileName, { records, indent });
    } catch (error) {
        addFinding("invalid_json", `Could not parse ${fileName}: ${error.message}`, { file: fileName });
    }
}

function labelsFor(record, { rewrite = false } = {}) {
    const assigned = assignQuestionLabels(record);
    if (rewrite) return assigned;
    if (Array.isArray(record.labels) &&
        validateLabelList(record.labels).length === 0) {
        return record.labels;
    }
    return assigned;
}

let changed = false;
const labelCounts = Object.fromEntries(labelDefinitions.map(label => [label.id, 0]));
const studentByLevel = {};

for (const [fileName, entry] of levels) {
    const { records } = entry;
    for (const [index, record] of records.entries()) {
        const assigned = labelsFor(record, { rewrite: rewriteLabels });
        const existing = Array.isArray(record.labels) ? record.labels : null;

        if (!write) {
            for (const problem of validateLabelList(existing)) {
                addFinding("invalid_labels", problem, {
                    file: fileName,
                    index,
                    id: typeof record.id === "string" ? record.id : undefined
                });
            }
        }

        const labels = write ? assigned : existing;
        if (Array.isArray(labels)) {
            for (const label of labels) {
                if (isKnownLabel(label)) labelCounts[label] = (labelCounts[label] ?? 0) + 1;
            }
            if (labels.includes("student")) {
                studentByLevel[record.level] = (studentByLevel[record.level] ?? 0) + 1;
            }
        }

        if (write && (!Array.isArray(existing) ||
            JSON.stringify(existing) !== JSON.stringify(assigned))) {
            record.labels = assigned;
            changed = true;
        }
    }
}

function readJsonFile(fileName) {
    const fullPath = path.join(repositoryRoot, fileName);
    if (!fs.existsSync(fullPath)) return { exists: false, value: null, error: null };
    try {
        return { exists: true, value: JSON.parse(fs.readFileSync(fullPath, "utf8")), error: null };
    } catch (error) {
        return { exists: true, value: null, error };
    }
}

const addedDatesDocument = readJsonFile(addedDatesFile);
let addedDates = {};
if (!addedDatesDocument.exists) {
    addFinding("missing_added_dates_file", `${addedDatesFile} is missing.`);
} else if (addedDatesDocument.error) {
    addFinding("invalid_added_dates_json", `Could not parse ${addedDatesFile}: ${addedDatesDocument.error.message}`);
} else if (!addedDatesDocument.value?.dates ||
    typeof addedDatesDocument.value.dates !== "object" ||
    Array.isArray(addedDatesDocument.value.dates)) {
    addFinding("invalid_added_dates", `${addedDatesFile} must contain a dates object.`);
} else {
    addedDates = addedDatesDocument.value.dates;
}

function buildExpectedIndexes() {
    const existingIndex = readJsonFile(indexFile);
    const existingById = new Map();
    if (existingIndex.value && Array.isArray(existingIndex.value.questions)) {
        for (const question of existingIndex.value.questions) {
            if (question && typeof question.id === "string" && Number.isInteger(question.index)) {
                existingById.set(question.id, question.index);
            }
        }
    }

    const records = [];
    for (const fileName of levelFiles) {
        for (const record of levels.get(fileName)?.records ?? []) {
            records.push(record);
        }
    }

    let nextIndex = 0;
    for (const index of existingById.values()) {
        if (index >= nextIndex) nextIndex = index + 1;
    }

    const usedIndices = new Set();
    const entries = [];
    const detailEntries = [];
    for (const record of records) {
        let index = existingById.get(record.id);
        if (!Number.isInteger(index) || index < 0 || usedIndices.has(index)) {
            while (usedIndices.has(nextIndex)) nextIndex += 1;
            index = nextIndex;
            nextIndex += 1;
        }
        usedIndices.add(index);
        const addedDate = addedDates[record.id];
        if (typeof addedDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(addedDate)) {
            addFinding("missing_added_date", `${record.id} has no valid added date in ${addedDatesFile}.`, {
                id: typeof record.id === "string" ? record.id : undefined
            });
        }
        const reading = buildQuestionReading(record);
        const summaryBlocks = Array.isArray(record.summary) ? record.summary : [];
        const detail = record.detail && typeof record.detail === "object" ? record.detail : null;
        entries.push({
            index,
            id: record.id,
            level: record.level,
            category: record.category,
            topic: typeof record.topic === "string" ? record.topic : "",
            perspective: typeof record.perspective === "string" ? record.perspective : "",
            role: typeof record.role === "string" ? record.role : "",
            sensitivity: Number.isInteger(record.sensitivity) ? record.sensitivity : null,
            content_warning: Array.isArray(record.content_warning) ? record.content_warning : [],
            addedDate: typeof addedDate === "string" ? addedDate : "",
            labels: record.labels,
            question: record.question,
            search: buildQuestionSearchText(record),
            scenario: typeof record.scenario === "string" ? record.scenario : "",
            summary: flattenSummary(record.summary),
            hints: buildQuestionHints(record),
            terms: buildQuestionTerms(record),
            reading
        });
        if (summaryBlocks.length > 0 || detail) {
            detailEntries.push({ id: record.id, summaryBlocks, detail });
        }
    }

    entries.sort((left, right) => left.index - right.index);
    detailEntries.sort((left, right) => left.id.localeCompare(right.id));
    const questions = entries;
    const filterQuestions = entries.map(({ index, id, level, sensitivity, labels, question, reading }) => ({
        index, id, level, sensitivity, labels, question, reading
    }));
    return { questions, filterQuestions, details: detailEntries };
}

const { questions: expectedQuestions, filterQuestions: expectedFilterQuestions, details: expectedDetails } = buildExpectedIndexes();
const expectedIndexDocument = { version: 6, questions: expectedQuestions };
const expectedFilterIndexDocument = { version: 1, questions: expectedFilterQuestions };
const expectedDetailIndexDocument = { version: 1, questions: expectedDetails };

if (write) {
    for (const [fileName, { records, indent }] of levels) {
        const text = `${JSON.stringify(records, null, indent)}\n`;
        const target = path.join(repositoryRoot, fileName);
        const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
        if (text !== current) {
            fs.writeFileSync(target, text);
        }
    }
    fs.writeFileSync(path.join(repositoryRoot, labelsFile), labelsDocumentText);
    fs.writeFileSync(
        path.join(repositoryRoot, indexFile),
        `${JSON.stringify(expectedIndexDocument, null, 2)}\n`
    );
    fs.writeFileSync(
        path.join(repositoryRoot, detailIndexFile),
        `${JSON.stringify(expectedDetailIndexDocument, null, 2)}\n`
    );
    fs.writeFileSync(
        path.join(repositoryRoot, filterIndexFile),
        `${JSON.stringify(expectedFilterIndexDocument)}\n`
    );
} else {
    // labels.json と questions-index.json が現在の定義・カードと一致するか確認する。
    const labelsPath = path.join(repositoryRoot, labelsFile);
    if (!fs.existsSync(labelsPath)) {
        addFinding("missing_labels_file", `${labelsFile} is missing; run with --write.`);
    } else {
        const actual = fs.readFileSync(labelsPath, "utf8");
        if (actual !== labelsDocumentText) {
            addFinding("stale_labels_file", `${labelsFile} differs from the label definitions; run with --write.`);
        }
    }

    const actualIndex = readJsonFile(indexFile);
    if (!actualIndex.exists) {
        addFinding("missing_index_file", `${indexFile} is missing; run with --write.`);
    } else if (actualIndex.error) {
        addFinding("invalid_index_json", `Could not parse ${indexFile}: ${actualIndex.error.message}`);
    } else if (actualIndex.value?.version !== expectedIndexDocument.version ||
        JSON.stringify(actualIndex.value?.questions) !== JSON.stringify(expectedQuestions)) {
        addFinding("stale_index_file", `${indexFile} differs from the level data; run with --write.`);
    }

    const actualDetailIndex = readJsonFile(detailIndexFile);
    if (!actualDetailIndex.exists) {
        addFinding("missing_detail_index_file", `${detailIndexFile} is missing; run with --write.`);
    } else if (actualDetailIndex.error) {
        addFinding("invalid_detail_index_json", `Could not parse ${detailIndexFile}: ${actualDetailIndex.error.message}`);
    } else if (actualDetailIndex.value?.version !== expectedDetailIndexDocument.version ||
        JSON.stringify(actualDetailIndex.value?.questions) !== JSON.stringify(expectedDetails)) {
        addFinding("stale_detail_index_file", `${detailIndexFile} differs from the level data; run with --write.`);
    }

    const actualFilterIndex = readJsonFile(filterIndexFile);
    if (!actualFilterIndex.exists) {
        addFinding("missing_filter_index_file", `${filterIndexFile} is missing; run with --write.`);
    } else if (actualFilterIndex.error) {
        addFinding("invalid_filter_index_json", `Could not parse ${filterIndexFile}: ${actualFilterIndex.error.message}`);
    } else if (actualFilterIndex.value?.version !== expectedFilterIndexDocument.version ||
        JSON.stringify(actualFilterIndex.value?.questions) !== JSON.stringify(expectedFilterQuestions)) {
        addFinding("stale_filter_index_file", `${filterIndexFile} differs from the level data; run with --write.`);
    }
}

const report = {
    mode: write ? "write" : "check",
    changed,
    totalLabels: Object.values(labelCounts).reduce((sum, count) => sum + count, 0),
    labelCounts,
    studentByLevel,
    findings
};

if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
} else {
    console.log(`Omoi question labels (${report.mode})`);
    console.log(`Cards: ${report.totalLabels} label assignments`);
    console.log(`Student labels by level: ${Object.entries(studentByLevel).map(([level, count]) => `L${level}=${count}`).join(", ") || "none"}`);
    console.log(`Findings: ${findings.length}`);
    for (const finding of findings) {
        const location = finding.file ? `${finding.file}${finding.index === undefined ? "" : `#${finding.index + 1}`}` : "dataset";
        console.log(`[ERROR] ${finding.code} at ${location}: ${finding.message}`);
    }
}

if (!write && findings.length > 0) process.exitCode = 1;
