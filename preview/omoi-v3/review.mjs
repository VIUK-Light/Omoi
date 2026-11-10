import { getSample } from "./adapter.mjs";
import { BASELINE_COMMIT, readPreviewState, sampleEntryHref } from "./preview-state.mjs";
import { getQuestionSummary } from "./question-summary.mjs";

let state;
try {
    state = readPreviewState(window.location.search);
} catch {
    state = { diagram: true, sampleId: null };
}

const review = document.createElement("aside");
review.className = "preview-review";
review.setAttribute("aria-label", "プレビューの確認と比較");
review.innerHTML = `
    <p><strong>Omoi v3 プレビュー</strong> — 現行UIのコピーで、問いの要点や関係図を試せます。</p>
    <p id="previewCurrentQuestion">基準UI: ${BASELINE_COMMIT}。問い・場面文は元の質問データを読み込みます。</p>
    <div class="preview-review__comparison" id="previewComparison" hidden>
        <span>同じ問いで比較:</span>
        <a id="previewDiagramOff">元の表示（関係図なし）</a>
        <a id="previewDiagramOn">関係図の表示ボタン付き</a>
        <a id="previewReadingChunks" hidden>区切った文章（図なし）</a>
        <a id="previewSummaryOn" hidden>問いの要点付き</a>
    </div>
    <nav class="preview-review__links" aria-label="プレビュー関連ページ">
        <a href="preview.html">4つのサンプルへ</a>
        <a href="../../packages/relation-diagram/demo/index.html">共通の図コンポーネント</a>
        <a href="terms.html">利用規約</a>
        <a href="LICENSE">LICENSE</a>
        <a href="NOTICE">NOTICE</a>
    </nav>
    <div class="preview-review__credit">
        <img src="../../viuk-light.jpg" alt="">
        <span>原版 <a href="https://viuk-light.org/omoi.html">Omoi / VIUK-Light</a> をもとにしたv3試作</span>
    </div>
`;
document.body.appendChild(review);

// Keep only preview-local links in the chosen comparison mode. Production/help
// links retain their original destination, and explicit on/off links win.
const previewDirectory = new URL("./", import.meta.url);
for (const link of document.querySelectorAll("a[href]")) {
    const raw = link.getAttribute("href");
    if (!raw || raw.startsWith("#")) continue;
    const url = new URL(raw, window.location.href);
    if (url.origin === previewDirectory.origin &&
        url.pathname.startsWith(previewDirectory.pathname) &&
        !url.searchParams.has("diagram")) {
        url.searchParams.set("diagram", state.diagram ? "1" : "0");
        link.href = url.href;
    }
}

export function showReviewQuestion(question, { diagramShown = false, summaryShown = false } = {}) {
    const comparison = document.getElementById("previewComparison");
    const current = document.getElementById("previewCurrentQuestion");
    const sample = getSample(question?.id);
    comparison.hidden = !sample;
    const hasDiagram = Boolean(sample && sample.diagram !== false);
    document.getElementById("previewDiagramOn").hidden = !hasDiagram;
    const summaryLink = document.getElementById("previewSummaryOn");
    const summary = getQuestionSummary(question);
    summaryLink.hidden = !summary;
    if (summary) {
        summaryLink.href = sampleEntryHref(question.id, state, { baseUrl: window.location.href, diagram: false, reading: null, summary: true });
        summaryLink.setAttribute("aria-current", String(Boolean(state.summary)));
    }
    const readingLink = document.getElementById("previewReadingChunks");
    readingLink.hidden = question?.id !== "l4-relationship-002";
    if (!readingLink.hidden) {
        readingLink.href = sampleEntryHref(question.id, state, { baseUrl: window.location.href, diagram: false, reading: "chunks", summary: null });
    }
    if (!question) {
        current.textContent = `基準UI: ${BASELINE_COMMIT}。問い・場面文は元の質問データを読み込みます。`;
        return;
    }
    const display = state.summary && summary ? summaryShown ? "問いの要点を表示中" : "問いの要点は閉じています" : !sample ? "この問いの図は未作成" : diagramShown ? "関係図を表示中" : state.reading ? "文章の区切りを比較" : state.diagram && hasDiagram ? "関係図は閉じています" : "元の表示（関係図なし）";
    current.textContent = `表示中: ${question.id} / ${display}`;
    if (!sample) return;
    for (const [id, enabled] of [["previewDiagramOff", false], ["previewDiagramOn", true]]) {
        const link = document.getElementById(id);
        link.href = sampleEntryHref(question.id, state, {
            baseUrl: window.location.href,
            diagram: enabled,
            reading: null,
            summary: null
        });
        link.setAttribute("aria-current", String(!state.reading && !state.summary && state.diagram === enabled));
    }
}
