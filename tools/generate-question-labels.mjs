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
const repositoryRoot = path.resolve(scriptDirectory, "..");
const activeLevels = [2, 3, 4];
const levelFiles = activeLevels.map(level => `level${level}.json`);
const labelsFile = "labels.json";
const indexFile = "questions-index.json";
const argumentsSet = new Set(process.argv.slice(2));
const write = argumentsSet.has("--write");
const rewriteLabels = argumentsSet.has("--rewrite-labels");
const jsonOutput = argumentsSet.has("--json");

if (argumentsSet.has("--help")) {
    console.log(`Usage: node tools/generate-question-labels.mjs [options]

Options:
  --write            Add missing labels, then write labels.json and questions-index.json.
  --rewrite-labels   Re-apply rules to every card instead of preserving existing labels.
  --check            Validate labels and generated files without writing (default).
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

    const questions = [];
    for (const fileName of levelFiles) {
        for (const record of levels.get(fileName)?.records ?? []) {
            questions.push({
                id: record.id,
                level: record.level,
                category: record.category,
                labels: record.labels,
                question: record.question
            });
        }
    }
    const indexDocument = { version: 1, questions };
    fs.writeFileSync(
        path.join(repositoryRoot, indexFile),
        `${JSON.stringify(indexDocument, null, 2)}\n`
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

    const indexPath = path.join(repositoryRoot, indexFile);
    if (!fs.existsSync(indexPath)) {
        addFinding("missing_index_file", `${indexFile} is missing; run with --write.`);
    } else {
        let actualIndex;
        try {
            actualIndex = JSON.parse(fs.readFileSync(indexPath, "utf8"));
        } catch (error) {
            addFinding("invalid_index_json", `Could not parse ${indexFile}: ${error.message}`);
        }
        if (actualIndex) {
            const expectedQuestions = [];
            for (const fileName of levelFiles) {
                for (const record of levels.get(fileName)?.records ?? []) {
                    expectedQuestions.push({
                        id: record.id,
                        level: record.level,
                        category: record.category,
                        labels: record.labels,
                        question: record.question
                    });
                }
            }
            if (JSON.stringify(actualIndex.questions) !== JSON.stringify(expectedQuestions)) {
                addFinding("stale_index_file", `${indexFile} differs from the level data; run with --write.`);
            }
        }
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
