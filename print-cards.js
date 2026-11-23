const printSheets = document.getElementById("printSheets");
const printStatus = document.getElementById("printStatus");
const printButton = document.getElementById("printButton");
const STORAGE_KEY = "omoi-print-selection";

const optQuestion = document.getElementById("optQuestion");
const optScenario = document.getElementById("optScenario");
const optDetail = document.getElementById("optDetail");
const optHints = document.getElementById("optHints");
const optTerms = document.getElementById("optTerms");
const optId = document.getElementById("optId");

const levelNames = { 2: "低", 3: "中", 4: "高" };
const levelDescriptions = {
    2: "日常の出来事や身近な選択を題材に、自分の考えを言葉にするための問いです。",
    3: "社会や制度、他者との関係を題材に、立場の違いや影響を考える問いです。",
    4: "価値観や倫理、人生の選択を題材に、自分の判断とその理由を深める問いです。"
};

let questions = [];
let selectedIds = [];

async function loadData() {
    const indexDoc = await fetch("questions-index.json").then(r => r.json());
    questions = indexDoc.questions ?? [];
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (Array.isArray(saved)) selectedIds = saved;
    } catch (e) { selectedIds = []; }
    if (selectedIds.length === 0) {
        printStatus.textContent = "印刷する問いが選択されていません。データベースに戻って選択してください。";
        printButton.disabled = true;
    } else {
        printStatus.textContent = `${selectedIds.length}問を印刷します`;
    }
    render();
}

function buildSheet(q) {
    const sheet = document.createElement("article");
    sheet.className = "print-sheet";

    // header
    const header = document.createElement("header");
    header.className = "print-sheet-header";
    const brand = document.createElement("p");
    brand.className = "print-sheet-brand";
    brand.textContent = "Omoi";
    header.append(brand);
    const meta = document.createElement("div");
    meta.className = "print-sheet-meta";
    const level = document.createElement("p");
    level.className = "print-sheet-level";
    level.textContent = q.level ? `level:${levelNames[q.level] ?? ""}` : "";
    meta.append(level);
    const note = document.createElement("p");
    note.className = "print-sheet-level-note";
    note.textContent = levelDescriptions[q.level] ?? "";
    meta.append(note);
    header.append(meta);
    sheet.append(header);

    // body
    const body = document.createElement("div");
    body.className = "print-sheet-body";

    if (optId.checked) {
        const idp = document.createElement("p");
        idp.className = "print-sheet-label";
        idp.textContent = `ID: ${q.id}`;
        body.append(idp);
    }

    if (optScenario.checked && q.scenario) {
        const scenarioBlock = document.createElement("div");
        scenarioBlock.className = "print-sheet-scenario";
        const label = document.createElement("p");
        label.className = "print-sheet-label";
        label.textContent = "こんな場面を想像してください";
        scenarioBlock.append(label);
        const text = document.createElement("p");
        text.className = "print-sheet-scenario-text";
        text.textContent = q.scenario;
        scenarioBlock.append(text);
        body.append(scenarioBlock);
    }

    if (optQuestion.checked) {
        const question = document.createElement("p");
        question.className = "print-sheet-question";
        question.textContent = q.question || "";
        if ((q.question || "").length > 80) question.classList.add("long");
        body.append(question);
    }

    if (optDetail.checked && q.detail && q.detail.text) {
        const detail = document.createElement("p");
        detail.className = "print-sheet-scenario-text";
        detail.textContent = q.detail.text;
        body.append(detail);
    }

    if (optHints.checked && Array.isArray(q.hints) && q.hints.length > 0) {
        const ul = document.createElement("ul");
        ul.className = "print-sheet-scenario-text";
        q.hints.forEach(h => { const li = document.createElement("li"); li.textContent = h; ul.append(li); });
        body.append(ul);
    }

    if (optTerms.checked && Array.isArray(q.terms) && q.terms.length > 0) {
        const dl = document.createElement("dl");
        dl.className = "print-sheet-scenario-text";
        q.terms.forEach(t => {
            const dt = document.createElement("dt"); dt.textContent = t.term; dt.style.fontWeight = "600";
            const dd = document.createElement("dd"); dd.textContent = t.definition; dd.style.margin = "0 0 4px";
            dl.append(dt, dd);
        });
        body.append(dl);
    }

    sheet.append(body);

    // footer
    const footer = document.createElement("footer");
    footer.className = "print-sheet-footer";
    const left = document.createElement("span");
    left.textContent = "omoi.viuk-light.org";
    const right = document.createElement("span");
    right.textContent = "重い話を話せる質問カード";
    footer.append(left, right);
    sheet.append(footer);

    return sheet;
}

function render() {
    const chosen = selectedIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
    printSheets.replaceChildren();
    chosen.forEach(q => printSheets.append(buildSheet(q)));
    if (chosen.length === 0) {
        printStatus.textContent = "印刷する問いが選択されていません。データベースに戻って選択してください。";
        printButton.disabled = true;
    } else {
        printStatus.textContent = `${chosen.length}問を印刷します`;
        printButton.disabled = false;
    }
}

[optQuestion, optScenario, optDetail, optHints, optTerms, optId].forEach(el => {
    if (el) el.addEventListener("change", render);
});
if (printButton) printButton.addEventListener("click", () => window.print());

loadData().catch(err => {
    printStatus.textContent = "読み込みに失敗しました。";
    console.error(err);
});
