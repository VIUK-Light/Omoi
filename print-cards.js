const printSheets = document.getElementById("printSheets");
const printStatus = document.getElementById("printStatus");
const printOverflowWarning = document.getElementById("printOverflowWarning");
const printButton = document.getElementById("printButton");
const cardSizeSelect = document.getElementById("cardSize");
const printPageOrientation = document.getElementById("printPageOrientation");
const fullOrientationSelect = document.getElementById("fullOrientation");
const fullOrientationOption = document.getElementById("fullOrientationOption");
const halfOrientationSelect = document.getElementById("halfOrientation");
const halfOrientationOption = document.getElementById("halfOrientationOption");
const largeModeOption = document.getElementById("largeModeOption");
const optLarge = document.getElementById("optLarge");
const STORAGE_KEY = "omoi-print-selection";

const optQuestion = document.getElementById("optQuestion");
const optScenario = document.getElementById("optScenario");
const optDetail = document.getElementById("optDetail");
const optHints = document.getElementById("optHints");
const optTerms = document.getElementById("optTerms");
const optId = document.getElementById("optId");

const levelNames = { 2: "低", 3: "中", 4: "高" };
const layouts = {
    compact: { cardsPerPage: 4, orientation: "portrait", width: 210, height: 297 },
    half: { cardsPerPage: 2, orientation: "landscape", width: 297, height: 210 },
    full: { cardsPerPage: 1, orientation: "portrait", width: 210, height: 297 }
};

let questions = [];
let selectedIds = [];
let questionDetails = null;
let questionDetailsPromise = null;

async function loadData() {
    const indexDoc = await fetch("questions-index.json").then(r => r.json());
    questions = indexDoc.questions ?? [];
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (Array.isArray(saved)) selectedIds = saved;
    } catch (e) { selectedIds = []; }
    render();
}

function loadQuestionDetails() {
    if (questionDetails) return Promise.resolve();
    if (!questionDetailsPromise) {
        questionDetailsPromise = fetch("question-details-index.json")
            .then(response => {
                if (!response.ok) throw new Error(`Question detail request failed (${response.status}).`);
                return response.json();
            })
            .then(detailIndex => {
                if (!Array.isArray(detailIndex.questions)) {
                    throw new Error("Question detail index data is invalid.");
                }
                questionDetails = new Map(detailIndex.questions.map(question => [question.id, question]));
            })
            .catch(error => {
                questionDetailsPromise = null;
                throw error;
            });
    }
    return questionDetailsPromise;
}

function appendLabel(parent, text) {
    const label = document.createElement("p");
    label.className = "print-card-label";
    label.textContent = text;
    parent.append(label);
}

function termParts(term) {
    if (typeof term === "string") {
        const separator = term.indexOf(":");
        return separator > 0
            ? { term: term.slice(0, separator).trim(), definition: term.slice(separator + 1).trim() }
            : { term: "", definition: term.trim() };
    }
    if (!term || typeof term !== "object") return null;
    const name = typeof term.term === "string" ? term.term.trim() : "";
    const definition = typeof term.definition === "string" ? term.definition.trim() : "";
    return name || definition ? { term: name, definition } : null;
}

function getActiveLayout() {
    const layout = layouts[cardSizeSelect.value];
    if (cardSizeSelect.value !== "full" && cardSizeSelect.value !== "half") return layout;

    const orientation = cardSizeSelect.value === "full"
        ? fullOrientationSelect.value
        : halfOrientationSelect.value;
    return {
        ...layout,
        orientation,
        width: orientation === "landscape" ? 297 : 210,
        height: orientation === "landscape" ? 210 : 297
    };
}

function buildCard(q) {
    const card = document.createElement("article");
    card.className = "print-card";

    const header = document.createElement("header");
    header.className = "print-card-header";
    const brand = document.createElement("span");
    brand.className = "print-card-brand";
    brand.textContent = "Omoi";
    header.append(brand);

    const meta = document.createElement("span");
    meta.className = "print-card-meta";
    meta.textContent = [
        q.level ? `level:${levelNames[q.level] ?? q.level}` : "",
        optId.checked ? q.id : ""
    ].filter(Boolean).join(" ・ ");
    header.append(meta);
    card.append(header);

    const content = document.createElement("div");
    content.className = "print-card-content";

    if (optScenario.checked && q.scenario) {
        const scenarioBlock = document.createElement("section");
        scenarioBlock.className = "print-card-scenario";
        appendLabel(scenarioBlock, "こんな場面を想像してください");
        const scenarioText = document.createElement("p");
        scenarioText.className = "print-card-copy";
        scenarioText.textContent = q.scenario;
        scenarioBlock.append(scenarioText);
        content.append(scenarioBlock);
    }

    if (optQuestion.checked) {
        const question = document.createElement("p");
        question.className = "print-card-question";
        question.textContent = q.question || "";
        content.append(question);
    }

    const questionDetail = questionDetails?.get(q.id)?.detail;
    if (optDetail.checked && questionDetail?.text) {
        const detail = document.createElement("section");
        detail.className = "print-card-extra print-card-detail";
        appendLabel(detail, "背景説明");
        const detailText = document.createElement("p");
        detailText.className = "print-card-copy";
        detailText.textContent = questionDetail.text;
        detail.append(detailText);
        content.append(detail);
    }

    if (optHints.checked && Array.isArray(q.hints) && q.hints.length > 0) {
        const hints = document.createElement("section");
        hints.className = "print-card-extra print-card-hints";
        appendLabel(hints, "会話のヒント");
        const list = document.createElement("ul");
        list.className = "print-card-copy";
        q.hints.forEach(hint => {
            const item = document.createElement("li");
            item.textContent = hint;
            list.append(item);
        });
        hints.append(list);
        content.append(hints);
    }

    if (optTerms.checked && Array.isArray(q.terms) && q.terms.length > 0) {
        const terms = document.createElement("section");
        terms.className = "print-card-extra";
        appendLabel(terms, "用語");
        const list = document.createElement("dl");
        list.className = "print-card-copy print-card-terms";
        q.terms.map(termParts).filter(Boolean).forEach(term => {
            if (term.term) {
                const name = document.createElement("dt");
                name.textContent = term.term;
                list.append(name);
            }
            const definition = document.createElement("dd");
            definition.textContent = term.definition;
            list.append(definition);
        });
        terms.append(list);
        content.append(terms);
    }

    card.append(content);

    const footer = document.createElement("footer");
    footer.className = "print-card-footer";
    footer.textContent = "omoi.viuk-light.org";
    card.append(footer);

    return card;
}

function updatePreviewScale() {
    const layout = getActiveLayout();
    const pageWidth = layout.width * (96 / 25.4);
    const scale = Math.min(1, printSheets.clientWidth / pageWidth);

    printSheets.style.setProperty("--print-page-width", `${layout.width}mm`);
    printSheets.querySelectorAll(".print-page-frame").forEach(frame => {
        frame.style.width = `${pageWidth * scale}px`;
        frame.style.height = `${layout.height * (96 / 25.4) * scale}px`;
        frame.style.setProperty("--preview-scale", scale);
    });
}

function render() {
    const chosen = selectedIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
    const cardSize = cardSizeSelect.value;
    const layout = getActiveLayout();
    const cardsPerPage = layout.cardsPerPage;
    updateOverflowWarning();
    fullOrientationOption.hidden = cardSize !== "full";
    halfOrientationOption.hidden = cardSize !== "half";
    largeModeOption.hidden = cardSize !== "full" && cardSize !== "half";
    printPageOrientation.textContent = `@page { size: A4 ${layout.orientation}; margin: 0; }`;
    const pageCount = Math.ceil(chosen.length / cardsPerPage);
    printSheets.replaceChildren();

    for (let offset = 0; offset < chosen.length; offset += cardsPerPage) {
        const frame = document.createElement("div");
        frame.className = "print-page-frame";
        frame.dataset.cardSize = cardSize;
        const page = document.createElement("section");
        page.className = "print-page";
        page.dataset.cardSize = cardSize;
        page.dataset.orientation = layout.orientation;
        page.classList.toggle("print-page-large", (cardSize === "full" || cardSize === "half") && optLarge.checked);
        page.setAttribute("aria-label", `印刷ページ ${Math.floor(offset / cardsPerPage) + 1}`);
        const grid = document.createElement("div");
        grid.className = "print-page-grid";
        chosen.slice(offset, offset + cardsPerPage).forEach(q => grid.append(buildCard(q)));
        page.append(grid);
        frame.append(page);
        printSheets.append(frame);
    }

    updatePreviewScale();
    printButton.disabled = chosen.length === 0;
    printStatus.textContent = chosen.length === 0
        ? "印刷する問いが選択されていません。データベースに戻って選択してください。"
        : `${chosen.length}問を${pageCount}ページ（1ページ${cardsPerPage}枚）に印刷します`;
}

function updateOverflowWarning() {
    if (printOverflowWarning) {
        printOverflowWarning.hidden = cardSizeSelect.value !== "compact" || !optDetail.checked;
    }
}

if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(updatePreviewScale).observe(printSheets);
} else {
    window.addEventListener("resize", updatePreviewScale);
}

[optQuestion, optScenario, optHints, optTerms, optId, optLarge, cardSizeSelect, fullOrientationSelect, halfOrientationSelect].forEach(el => {
    if (el) el.addEventListener("change", render);
});
if (optDetail) optDetail.addEventListener("change", async () => {
    if (!optDetail.checked) {
        render();
        return;
    }
    updateOverflowWarning();
    printStatus.textContent = "背景説明を読み込み中…";
    try {
        await loadQuestionDetails();
        render();
    } catch (error) {
        optDetail.checked = false;
        updateOverflowWarning();
        printStatus.textContent = "背景説明の読み込みに失敗しました。";
        console.error(error);
    }
});
if (printButton) printButton.addEventListener("click", () => window.print());

loadData().catch(err => {
    printStatus.textContent = "読み込みに失敗しました。";
    console.error(err);
});
