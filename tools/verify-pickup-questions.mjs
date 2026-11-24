#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    pickupLevels,
    pickupQuestionsFile,
    pickupQuestionsPerLevel,
    pickupQuestionsTotal,
    validatePickupDocument
} from "./pickup-questions.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const argumentsSet = new Set(process.argv.slice(2));
const outputJson = argumentsSet.has("--json");
const summaryOnly = argumentsSet.has("--summary");

if (argumentsSet.has("--help")) {
    console.log(`Usage: node tools/verify-pickup-questions.mjs [options]

Options:
  --json      Print the result as JSON.
  --summary   Print only the aggregate result.
  --help      Show this help.

${pickupQuestionsFile} is edited by hand. It must list ${pickupQuestionsPerLevel} Level 2,
${pickupQuestionsPerLevel} Level 3, and ${pickupQuestionsPerLevel} Level 4 questions in that order
(${pickupQuestionsTotal} questions total).`);
    process.exit(0);
}

const questionIdsByLevel = new Map();
const findings = [];

for (const level of pickupLevels) {
    const fileName = `データ/質問/level${level}.json`;
    try {
        const records = JSON.parse(fs.readFileSync(path.join(repositoryRoot, fileName), "utf8"));
        questionIdsByLevel.set(level, new Set(records.map(record => record.id)));
    } catch (error) {
        findings.push({
            code: "question_data_error",
            message: `Could not read ${fileName}: ${error.message}`
        });
    }
}

let document;
try {
    document = JSON.parse(fs.readFileSync(path.join(repositoryRoot, pickupQuestionsFile), "utf8"));
} catch (error) {
    findings.push({
        code: "pickup_data_error",
        message: `Could not read ${pickupQuestionsFile}: ${error.message}`
    });
}

if (document !== undefined) {
    findings.push(...validatePickupDocument(document, questionIdsByLevel));
}

const result = {
    file: pickupQuestionsFile,
    total: pickupQuestionsTotal,
    perLevel: pickupQuestionsPerLevel,
    findings
};

if (outputJson) {
    console.log(JSON.stringify(result, null, 2));
} else if (findings.length === 0) {
    console.log(
        `OK: ${pickupQuestionsFile} has ${pickupQuestionsTotal} questions ` +
        `(${pickupLevels.map(level => `level ${level}: ${pickupQuestionsPerLevel}`).join(", ")}).`
    );
} else if (summaryOnly) {
    console.log(`FAIL: ${pickupQuestionsFile} has ${findings.length} finding(s).`);
    for (const finding of findings) {
        console.log(`- ${finding.code}: ${finding.message}`);
    }
} else {
    for (const finding of findings) {
        console.error(`${finding.code}: ${finding.message}`);
    }
    console.error(`\n${findings.length} finding(s).`);
}

process.exit(findings.length > 0 ? 1 : 0);
