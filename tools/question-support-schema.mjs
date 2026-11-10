// Authoring validation for the optional v3 helpers. Editorial quality and source
// correspondence are checked in the independent content review, not by counts.
export function validateQuestionSupport(record) {
    const errors = [];
    const add = (code, message) => errors.push({ code, message });
    const text = value => typeof value === "string" && value.trim() !== "";
    const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
    const fields = ["summary", "hints", "detail", "terms"];

    if (![3, 4].includes(record.level) && fields.some(field => record[field] !== undefined)) {
        add("helper_level_not_supported", "summary, hints, detail and terms are only supported for Level 3/4.");
    }

    if (record.summary !== undefined) {
        if (!Array.isArray(record.summary) || record.summary.length === 0) {
            add("invalid_summary", "summary must be a non-empty block array when present.");
        } else {
            for (const [index, block] of record.summary.entries()) {
                const label = `summary[${index}]`;
                if (!object(block)) {
                    add("invalid_summary_block", `${label} must be a text or bullets block.`);
                } else if (block.type === "text") {
                    if (!text(block.text)) add("invalid_summary_text", `${label}.text must be non-empty.`);
                } else if (block.type === "bullets") {
                    if (!Array.isArray(block.items) || block.items.length === 0) {
                        add("invalid_summary_items", `${label}.items must be a non-empty array.`);
                    } else if (block.items.some(item => !object(item) || !text(item.text) ||
                        (item.label !== undefined && !text(item.label)))) {
                        add("invalid_summary_item", `${label} items need non-empty text and, when supplied, a non-empty label.`);
                    }
                } else {
                    add("unsupported_summary_type", `${label} supports text or bullets in the normal v3 screen.`);
                }
            }
        }
    }

    if (record.hints !== undefined && (!Array.isArray(record.hints) || record.hints.length === 0 ||
        record.hints.some(hint => !text(hint)))) {
        add("invalid_hints", "hints must be a non-empty array of non-empty strings when present.");
    }

    if (record.terms !== undefined && (!Array.isArray(record.terms) || record.terms.length === 0 ||
        record.terms.some(term => !object(term) || !text(term.term) || !text(term.definition)))) {
        add("invalid_terms", "terms must contain objects with non-empty term and definition strings.");
    }

    if (record.detail !== undefined) {
        if (!object(record.detail)) {
            add("invalid_detail", "detail must be an object when present.");
        } else {
            if (!text(record.detail.text)) add("invalid_detail_text", "detail.text must be non-empty when detail is present.");
            if (!Array.isArray(record.detail.sources) || record.detail.sources.length === 0) {
                add("detail_without_sources", "Published v3 background explanations require verified linked sources; omit unverified explanations.");
            } else {
                for (const source of record.detail.sources) {
                    if (!object(source) || !text(source.title) || !text(source.url)) {
                        add("invalid_source", "Each source needs a non-empty title and URL.");
                        continue;
                    }
                    try {
                        if (!["https:", "http:"].includes(new URL(source.url).protocol)) {
                            add("unsupported_source_protocol", "Source URLs must use http or https.");
                        }
                    } catch {
                        add("invalid_source_url", "Source URL is not a valid URL.");
                    }
                }
            }
        }
    }
    return errors;
}
