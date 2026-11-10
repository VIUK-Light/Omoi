import { getSample } from "./adapter.mjs";

export const BASELINE_COMMIT = "3eeff5a";

export function readPreviewState(search = "") {
    const params = new URLSearchParams(search);
    if (params.getAll("summary").length > 1 ||
        (params.has("summary") && !["0", "1"].includes(params.get("summary")))) {
        throw new Error("要点の表示条件が正しくありません。プレビュー入口から選び直してください。");
    }
    if (params.getAll("reading").length > 1 ||
        (params.has("reading") && !["original", "chunks"].includes(params.get("reading")))) {
        throw new Error("文章の表示条件が正しくありません。プレビュー入口から選び直してください。");
    }
    if (params.getAll("diagram").length > 1 ||
        (params.has("diagram") && !["0", "1"].includes(params.get("diagram")))) {
        throw new Error("関係図の表示条件が正しくありません。プレビュー入口から選び直してください。");
    }
    if (params.getAll("sample").length > 1 ||
        (params.has("sample") && !getSample(params.get("sample")))) {
        throw new Error("指定されたサンプルが見つかりません。プレビュー入口から選び直してください。");
    }
    return {
        diagram: params.get("diagram") !== "0",
        sampleId: params.get("sample") || null,
        ...(params.has("reading") ? { reading: params.get("reading") } : {}),
        ...(params.has("summary") ? { summary: params.get("summary") === "1" } : {})
    };
}

export function assertSampleLevel(state, level) {
    const sample = getSample(state.sampleId);
    if (sample && sample.level !== level) {
        throw new Error(`指定されたサンプルはLevel ${sample.level}です。プレビュー入口から選び直してください。`);
    }
}

export function previewHref(path, state, { baseUrl, level, sampleId = null, diagram = state.diagram, reading = state.reading, summary = state.summary } = {}) {
    const url = new URL(path, baseUrl);
    url.searchParams.set("diagram", diagram ? "1" : "0");
    if (level !== undefined) url.searchParams.set("level", String(level));
    if (sampleId) url.searchParams.set("sample", sampleId);
    else url.searchParams.delete("sample");
    if (reading) url.searchParams.set("reading", reading);
    else url.searchParams.delete("reading");
    if (summary === undefined || summary === null) url.searchParams.delete("summary");
    else url.searchParams.set("summary", summary ? "1" : "0");
    return url.href;
}

export function sampleEntryHref(sampleId, state, options = {}) {
    const sample = getSample(sampleId);
    if (!sample) throw new Error("指定されたサンプルが見つかりません。");
    const page = sample.level === 3 ? "warning3.html" : "warning.html";
    return previewHref(page, state, { ...options, sampleId });
}

export function putSampleFirst(questions, sampleId, level) {
    if (!sampleId) return questions;
    assertSampleLevel({ sampleId }, level);
    const question = questions.find(item => item.id === sampleId);
    if (!question) {
        throw new Error("指定されたサンプルが質問データにありません。プレビュー入口から選び直してください。");
    }
    return [question, ...questions.filter(item => item.id !== sampleId)];
}
