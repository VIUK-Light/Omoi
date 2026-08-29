#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const questionFiles = ["level1.json", "level2.json", "level3.json", "level4.json"];
const argumentsSet = new Set(process.argv.slice(2));
const reportOnly = argumentsSet.has("--report-only");
const outputJson = argumentsSet.has("--json");
const summaryOnly = argumentsSet.has("--summary");
const strictDetails = argumentsSet.has("--strict-details");
const enforceQualityTargets = argumentsSet.has("--enforce-quality-targets");

if (argumentsSet.has("--help")) {
    console.log(`Usage: node tools/verify-question-dataset.mjs [options]

Options:
  --report-only     Report findings without a failing exit status.
  --strict-details  Require detail.text for Level 3 and Level 4 cards (legacy alias; this is now the default).
  --enforce-quality-targets  Fail unless Level 2 has 80+ cards and each primary Level 4 perspective is 20%+.
  --json            Print the full report as JSON.
  --summary         Print only aggregate counts and finding-code totals.
  --help            Show this help.`);
    process.exit(0);
}

const acceptedSafetyKinds = new Set([
    "self_harm",
    "abuse",
    "sexual_violence",
    "youth_pregnancy",
    "medical",
    "legal",
    "other_high_risk"
]);

const acceptedUrgencies = new Set(["normal", "high"]);
const acceptedAudiences = new Set(["general", "adult", "minor_with_support"]);
const acceptedCategories = new Set([
    "self_and_values",
    "relationships_and_communication",
    "family_and_care",
    "school_and_youth",
    "work_and_economy",
    "gender_sexuality_and_identity",
    "health_and_disability",
    "technology_media_and_privacy",
    "justice_safety_and_crime",
    "society_public_policy_and_environment",
    "culture_religion_and_history",
    "ethics_and_decision_making"
]);
const acceptedPerspectives = new Set(["affected", "actor", "decision_maker", "observer"]);
const acceptedContentWarnings = new Set([
    "sexual_violence",
    "pregnancy_and_reproduction",
    "infidelity",
    "family_conflict",
    "abuse_and_coercion",
    "self_harm",
    "medical_and_end_of_life",
    "crime_and_punishment",
    "discrimination_and_hate",
    "privacy_and_surveillance"
]);

const findings = [];
const records = [];

function compactRecord(record) {
    return {
        id: record.id,
        file: record.file,
        index: record.index,
        level: record.level,
        expectedLevel: record.expectedLevel,
        category: record.category,
        sensitivity: record.sensitivity,
        question: record.question
    };
}

function addFinding(severity, code, message, context = {}) {
    const isCardRecord = Object.hasOwn(context, "file") && Object.hasOwn(context, "index");
    findings.push({
        severity,
        code,
        message,
        ...(isCardRecord ? compactRecord(context) : context)
    });
}

function normalizeQuestion(question) {
    return question
        .normalize("NFKC")
        .replace(/[\s　]+/g, "")
        .replace(/[？?]/g, "?")
        .toLowerCase();
}

function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
}

function validateDetail(record) {
    if (record.detail === undefined) {
        if (record.level >= 3) {
            addFinding("error", "missing_detail", "Level 3/4 card has no detail object.", record);
        }
        return;
    }

    if (!record.detail || typeof record.detail !== "object" || Array.isArray(record.detail)) {
        addFinding("error", "invalid_detail", "detail must be an object when present.", record);
        return;
    }

    const text = record.detail.text;
    if (text !== undefined && !isNonEmptyString(text)) {
        addFinding("error", "invalid_detail_text", "detail.text must be a non-empty string when present.", record);
    }

    if (record.level >= 3 && !isNonEmptyString(text)) {
        addFinding("error", "missing_detail_text", "Level 3/4 card is missing detail.text.", record);
    }

    if (record.detail.sources !== undefined) {
        if (!Array.isArray(record.detail.sources)) {
            addFinding("error", "invalid_sources", "detail.sources must be an array when present.", record);
        } else {
            record.detail.sources.forEach((source, sourceIndex) => {
                const sourceContext = { ...record, sourceIndex };

                if (!source || typeof source !== "object" || Array.isArray(source)) {
                    addFinding("error", "invalid_source", "Each source must be an object.", sourceContext);
                    return;
                }

                if (!isNonEmptyString(source.title)) {
                    addFinding("error", "invalid_source_title", "Each source needs a non-empty title.", sourceContext);
                }

                if (!isNonEmptyString(source.url)) {
                    addFinding("error", "invalid_source_url", "Each source needs a non-empty URL.", sourceContext);
                    return;
                }

                try {
                    const url = new URL(source.url);
                    if (url.protocol !== "https:" && url.protocol !== "http:") {
                        addFinding("error", "unsupported_source_protocol", "Source URLs must use http or https.", sourceContext);
                    }
                } catch {
                    addFinding("error", "invalid_source_url", "Source URL is not a valid URL.", sourceContext);
                }
            });
        }
    }

    if (isNonEmptyString(text) && (!Array.isArray(record.detail.sources) || record.detail.sources.length === 0)) {
        addFinding("warning", "detail_without_sources", "detail.text exists but has no linked sources.", record);
    }
}

function validateSafety(record) {
    if (record.safety === undefined) {
        return;
    }

    if (!record.safety || typeof record.safety !== "object" || Array.isArray(record.safety)) {
        addFinding("error", "invalid_safety", "safety must be an object when present.", record);
        return;
    }

    const { kind, urgency, audience, resource_set: resourceSet } = record.safety;

    if (!acceptedSafetyKinds.has(kind)) {
        addFinding("error", "invalid_safety_kind", "safety.kind is not an accepted value.", record);
    }

    if (!acceptedUrgencies.has(urgency)) {
        addFinding("error", "invalid_safety_urgency", "safety.urgency is not an accepted value.", record);
    }

    if (!acceptedAudiences.has(audience)) {
        addFinding("error", "invalid_safety_audience", "safety.audience is not an accepted value.", record);
    }

    if (!isNonEmptyString(resourceSet)) {
        addFinding("error", "invalid_resource_set", "safety.resource_set must be a non-empty string.", record);
    }
}

function validateContentWarnings(record) {
    if (record.content_warning === undefined) {
        return;
    }

    if (!Array.isArray(record.content_warning) || record.content_warning.length === 0) {
        addFinding("error", "invalid_content_warning", "content_warning must be a non-empty array when present.", record);
        return;
    }

    const seenWarnings = new Set();
    for (const warning of record.content_warning) {
        if (!acceptedContentWarnings.has(warning)) {
            addFinding("error", "invalid_content_warning", "content_warning includes an unsupported value.", record);
        }
        if (seenWarnings.has(warning)) {
            addFinding("error", "duplicate_content_warning", "content_warning must not contain duplicate values.", record);
        }
        seenWarnings.add(warning);
    }
}

for (const fileName of questionFiles) {
    const filePath = path.join(repositoryRoot, fileName);
    const expectedLevel = Number(fileName.match(/\d+/)?.[0]);
    let fileRecords;

    try {
        fileRecords = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        addFinding("error", "invalid_json", `Could not parse ${fileName}: ${error.message}`, { file: fileName });
        continue;
    }

    if (!Array.isArray(fileRecords)) {
        addFinding("error", "invalid_root", `${fileName} must contain a JSON array.`, { file: fileName });
        continue;
    }

    fileRecords.forEach((entry, index) => {
        const record = { ...entry, file: fileName, index, expectedLevel };
        records.push(record);

        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            addFinding("error", "invalid_record", "Each card must be an object.", record);
            return;
        }

        if (!isNonEmptyString(entry.id)) {
            addFinding("error", "invalid_id", "id must be a non-empty string.", record);
        }

        if (!isNonEmptyString(entry.category)) {
            addFinding("error", "invalid_category", "category must be a non-empty string.", record);
        } else if (!acceptedCategories.has(entry.category)) {
            addFinding("error", "invalid_category", "category must be one of the 12 approved top-level categories.", record);
        }

        if (!isNonEmptyString(entry.question)) {
            addFinding("error", "invalid_question", "question must be a non-empty string.", record);
        }

        if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > 4) {
            addFinding("error", "invalid_level", "level must be an integer from 1 to 4.", record);
        } else if (entry.level !== expectedLevel) {
            addFinding("error", "level_file_mismatch", "Card level does not match its level*.json file.", record);
        }

        if (!Number.isInteger(entry.sensitivity) || entry.sensitivity < 1 || entry.sensitivity > 4) {
            addFinding("error", "invalid_sensitivity", "sensitivity must be an integer from 1 to 4.", record);
        }

        if (!isNonEmptyString(entry.topic)) {
            addFinding("error", "missing_topic", "Every card must have a non-empty topic.", record);
        } else if (entry.topic !== undefined && !isNonEmptyString(entry.topic)) {
            addFinding("error", "invalid_topic", "topic must be a non-empty string when present.", record);
        }

        if (entry.level >= 3 && !acceptedPerspectives.has(entry.perspective)) {
            addFinding("error", "invalid_perspective", "Level 3/4 perspective must be affected, actor, decision_maker, or observer.", record);
        }

        if (entry.role !== undefined && !isNonEmptyString(entry.role)) {
            addFinding("error", "invalid_role", "role must be a non-empty string when present.", record);
        }

        validateDetail(record);
        validateSafety(record);
        validateContentWarnings(record);
    });
}

const recordsById = new Map();
const recordsByQuestion = new Map();

for (const record of records) {
    if (isNonEmptyString(record.id)) {
        const matchingRecords = recordsById.get(record.id) ?? [];
        matchingRecords.push(record);
        recordsById.set(record.id, matchingRecords);
    }

    if (isNonEmptyString(record.question)) {
        const normalized = normalizeQuestion(record.question);
        const matchingRecords = recordsByQuestion.get(normalized) ?? [];
        matchingRecords.push(record);
        recordsByQuestion.set(normalized, matchingRecords);
    }
}

for (const [id, matchingRecords] of recordsById) {
    if (matchingRecords.length > 1) {
        addFinding("error", "duplicate_id", `id \"${id}\" appears ${matchingRecords.length} times.`, {
            id,
            records: matchingRecords.map(({ file, index, level }) => ({ file, index, level }))
        });
    }
}

for (const [normalizedQuestion, matchingRecords] of recordsByQuestion) {
    if (matchingRecords.length > 1) {
        addFinding("error", "duplicate_question", "Question text is duplicated after normalization.", {
            normalizedQuestion,
            records: matchingRecords.map(({ id, file, index, level, question }) => ({ id, file, index, level, question }))
        });
    }
}

const levelCounts = Object.fromEntries(questionFiles.map((fileName) => [
    fileName,
    records.filter((record) => record.file === fileName).length
]));

const internalLevelCounts = Object.fromEntries([1, 2, 3, 4].map((level) => [
    `level${level}`,
    records.filter((record) => record.level === level).length
]));

const level4PerspectiveCounts = Object.fromEntries([...acceptedPerspectives].map((perspective) => [
    perspective,
    records.filter((record) => record.level === 4 && record.perspective === perspective).length
]));

if (enforceQualityTargets) {
    if ((internalLevelCounts.level2 ?? 0) < 80) {
        addFinding("error", "level2_target_not_met", "Level 2 must contain at least 80 cards.", { level2Count: internalLevelCounts.level2 ?? 0 });
    }

    const level4Count = internalLevelCounts.level4 ?? 0;
    for (const perspective of ["affected", "actor", "decision_maker"]) {
        if (level4Count > 0 && (level4PerspectiveCounts[perspective] / level4Count) < 0.2) {
            addFinding("error", "level4_perspective_target_not_met", `Level 4 ${perspective} cards must be at least 20% of Level 4.`, {
                perspective,
                count: level4PerspectiveCounts[perspective],
                level4Count
            });
        }
    }
}

const categoryCounts = Object.entries(records.reduce((counts, record) => {
    if (isNonEmptyString(record.category)) {
        counts[record.category] = (counts[record.category] ?? 0) + 1;
    }
    return counts;
}, {})).sort(([left], [right]) => left.localeCompare(right));

const errors = findings.filter((finding) => finding.severity === "error");
const warnings = findings.filter((finding) => finding.severity === "warning");
const findingCodeCounts = Object.fromEntries([...new Set(findings.map((finding) => finding.code))]
    .sort()
    .map((code) => [code, findings.filter((finding) => finding.code === code).length]));
const report = {
    repositoryRoot,
    files: levelCounts,
    internalLevels: internalLevelCounts,
    level4Perspectives: level4PerspectiveCounts,
    totalRecords: records.length,
    errors,
    warnings,
    findingCodeCounts,
    categories: Object.fromEntries(categoryCounts)
};

if (summaryOnly) {
    console.log(JSON.stringify({
        files: report.files,
        internalLevels: report.internalLevels,
        totalRecords: report.totalRecords,
        errors: errors.length,
        warnings: warnings.length,
        findingCodeCounts: report.findingCodeCounts
    }, null, 2));
} else if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
} else {
    console.log("Omoi question data validation");
    console.log(`Records: ${report.totalRecords}`);
    console.log(`Files: ${Object.entries(levelCounts).map(([name, count]) => `${name}=${count}`).join(", ")}`);
    console.log(`Internal levels: ${Object.entries(internalLevelCounts).map(([name, count]) => `${name}=${count}`).join(", ")}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);

    for (const finding of findings) {
        const location = finding.file ? `${finding.file}#${finding.index + 1}` : "dataset";
        console.log(`[${finding.severity.toUpperCase()}] ${finding.code} at ${location}: ${finding.message}`);
    }
}

if (!reportOnly && errors.length > 0) {
    process.exitCode = 1;
}
