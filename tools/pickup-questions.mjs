export const pickupLevels = [2, 3, 4];
export const pickupQuestionsFile = "データ/ピックアップ/questions.json";
export const pickupQuestionsPerLevel = 10;
export const pickupQuestionsTotal = pickupQuestionsPerLevel * pickupLevels.length;

export function pickupLevelKey(level) {
    return String(level);
}

export function flattenPickupIds(document) {
    if (!document || typeof document !== "object" || !document.levels ||
        typeof document.levels !== "object" || Array.isArray(document.levels)) {
        return [];
    }
    return pickupLevels.flatMap(level => {
        const ids = document.levels[pickupLevelKey(level)];
        return Array.isArray(ids) ? ids : [];
    });
}

/**
 * @param {unknown} document
 * @param {Record<string, Set<string>> | Map<string, Set<string>>} questionIdsByLevel
 * @returns {{ code: string, message: string }[]}
 */
export function validatePickupDocument(document, questionIdsByLevel) {
    const findings = [];
    const add = (code, message) => findings.push({ code, message });

    if (!document || typeof document !== "object" || Array.isArray(document)) {
        add("invalid_root", `${pickupQuestionsFile} must contain an object.`);
        return findings;
    }

    if (document.version !== 1) {
        add("invalid_version", "version must be 1.");
    }

    if (typeof document.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(document.month)) {
        add("invalid_month", "month must use the YYYY-MM format.");
    }

    if (typeof document.title !== "string" || document.title.trim() === "") {
        add("invalid_title", "title must be a non-empty string.");
    }

    if (!document.levels || typeof document.levels !== "object" || Array.isArray(document.levels)) {
        add("invalid_levels", "levels must be an object keyed by 2, 3, and 4.");
        return findings;
    }

    const allowedKeys = new Set(pickupLevels.map(pickupLevelKey));
    for (const key of Object.keys(document.levels)) {
        if (!allowedKeys.has(key)) {
            add("unknown_level", `levels contains an unsupported level key: ${key}.`);
        }
    }

    const readQuestionIds = level => {
        const ids = questionIdsByLevel instanceof Map
            ? questionIdsByLevel.get(level)
            : questionIdsByLevel?.[pickupLevelKey(level)];
        return ids;
    };

    const seenIds = new Set();
    let total = 0;
    for (const level of pickupLevels) {
        const key = pickupLevelKey(level);
        const ids = document.levels[key];
        if (!Array.isArray(ids)) {
            add("missing_level", `levels.${key} must be an array.`);
            continue;
        }
        if (ids.length !== pickupQuestionsPerLevel) {
            add(
                "invalid_level_count",
                `levels.${key} must contain exactly ${pickupQuestionsPerLevel} question IDs.`
            );
        }
        const knownIds = readQuestionIds(level);
        if (!(knownIds instanceof Set)) {
            add("missing_question_data", `Question data for level ${level} is not available.`);
        }
        for (const [index, id] of ids.entries()) {
            total += 1;
            if (typeof id !== "string" || id.trim() === "") {
                add("invalid_id", `levels.${key}[${index}] must be a non-empty question ID.`);
                continue;
            }
            if (seenIds.has(id)) {
                add("duplicate_id", `Question ID is listed more than once: ${id}.`);
            }
            seenIds.add(id);
            if (knownIds instanceof Set && !knownIds.has(id)) {
                add(
                    "unknown_question",
                    `levels.${key}[${index}] is not a level ${level} question: ${id}.`
                );
            }
        }
    }

    if (total !== pickupQuestionsTotal) {
        add(
            "invalid_total",
            `The pickup list must contain exactly ${pickupQuestionsTotal} question IDs.`
        );
    }

    return findings;
}
