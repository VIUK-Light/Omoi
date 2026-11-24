const containsKanji = value => /\p{Script=Han}/u.test(value);
const isHiraganaReading = value =>
    /^[\u3041-\u3096\u309D-\u309F\u30FC・]+$/u.test(value);

export function getVisibleTextFields(question) {
    const fields = { question: question.question };
    const scenario = question.scenario?.trim() ?? "";
    if (scenario) fields.scenario = scenario;

    if (question.level === 3 || question.level === 4) {
        for (const [blockIndex, block] of (question.summary ?? []).entries()) {
            if (block.type === "text") {
                fields[`summary.${blockIndex}.text`] = block.text;
            } else {
                for (const [itemIndex, item] of block.items.entries()) {
                    if (item.label !== undefined) {
                        fields[`summary.${blockIndex}.items.${itemIndex}.label`] = item.label;
                    }
                    fields[`summary.${blockIndex}.items.${itemIndex}.text`] = item.text;
                }
            }
        }

        for (const [index, hint] of (question.hints ?? []).entries()) {
            fields[`hints.${index}`] = hint;
        }
        const detailText = question.detail?.text?.trim() ?? "";
        if (detailText) fields["detail.text"] = detailText;
        for (const [index, term] of (question.terms ?? []).entries()) {
            fields[`terms.${index}.term`] = term.term;
            fields[`terms.${index}.definition`] = term.definition;
        }
        for (const [index, source] of (question.detail?.sources ?? []).entries()) {
            fields[`detail.sources.${index}.title`] = source.title;
        }
    }
    return fields;
}

export function validateFuriganaSidecar(questions, sidecar) {
    if (!Array.isArray(questions) || !sidecar ||
        typeof sidecar !== "object" || Array.isArray(sidecar)) {
        throw new Error("Furigana sidecar must be an object for a question array.");
    }

    const questionIds = new Set(questions.map(question => question.id));
    for (const [questionId, fields] of Object.entries(sidecar)) {
        if (!questionIds.has(questionId) || !fields ||
            typeof fields !== "object" || Array.isArray(fields)) {
            throw new Error(`Invalid furigana question entry: ${questionId}`);
        }
    }

    let annotatedFieldCount = 0;
    let kanjiFieldCount = 0;
    for (const question of questions) {
        const fields = getVisibleTextFields(question);
        const readings = sidecar[question.id];
        if (!readings || !Array.isArray(readings.question)) {
            throw new Error(`Missing question furigana: ${question.id}`);
        }

        for (const [fieldPath, segments] of Object.entries(readings)) {
            const source = fields[fieldPath];
            if (typeof source !== "string" || !Array.isArray(segments) || segments.length === 0) {
                throw new Error(`Invalid furigana field: ${question.id}.${fieldPath}`);
            }

            let reconstructed = "";
            for (const segment of segments) {
                if (!segment || typeof segment !== "object" || Array.isArray(segment)) {
                    throw new Error(`Invalid furigana segment: ${question.id}.${fieldPath}`);
                }
                if (typeof segment.text === "string" && Object.keys(segment).length === 1) {
                    if (containsKanji(segment.text)) {
                        throw new Error(`Unannotated kanji: ${question.id}.${fieldPath}`);
                    }
                    reconstructed += segment.text;
                } else if (typeof segment.ruby === "string" &&
                    typeof segment.reading === "string" &&
                    Object.keys(segment).length === 2 &&
                    containsKanji(segment.ruby) &&
                    isHiraganaReading(segment.reading)) {
                    reconstructed += segment.ruby;
                } else {
                    throw new Error(`Invalid ruby segment: ${question.id}.${fieldPath}`);
                }
            }
            if (reconstructed !== source) {
                throw new Error(`Furigana text does not match source: ${question.id}.${fieldPath}`);
            }
            annotatedFieldCount++;
        }

        for (const [fieldPath, source] of Object.entries(fields)) {
            if (containsKanji(source)) {
                kanjiFieldCount++;
                if (!Object.hasOwn(readings, fieldPath)) {
                    throw new Error(`Missing furigana: ${question.id}.${fieldPath}`);
                }
            }
        }
    }

    return { annotatedFieldCount, kanjiFieldCount };
}
