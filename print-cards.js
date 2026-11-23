const printArea = document.getElementById("printArea");
const printStatus = document.getElementById("printStatus");
const printButton = document.getElementById("printButton");
const layoutSelect = document.getElementById("layoutSelect");
const STORAGE_KEY = "omoi-print-selection";

const optQuestion = document.getElementById("optQuestion");
const optScenario = document.getElementById("optScenario");
const optDetail = document.getElementById("optDetail");
const optHints = document.getElementById("optHints");
const optTerms = document.getElementById("optTerms");
const optId = document.getElementById("optId");

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
        printStatus.textContent = `${selectedIds.length}問を選択中`;
    }
    render();
}

function render() {
    const chosen = selectedIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
    printArea.replaceChildren();
    const perPage = parseInt(layoutSelect.value, 10) || 4;
    const cols = perPage >= 4 ? 2 : 1;
    const rows = perPage >= 4 ? 2 : (perPage >= 2 ? 2 : 1);
    printArea.style.setProperty("--cols", cols);
    printArea.style.setProperty("--rows", rows);

    chosen.forEach(q => {
        const card = document.createElement("article");
        card.className = "print-card";

        if (optId.checked) {
            const idEl = document.createElement("p");
            idEl.className = "print-card-id";
            idEl.textContent = q.id;
            card.append(idEl);
        }
        if (optQuestion.checked) {
            const qEl = document.createElement("p");
            qEl.className = "print-card-question";
            qEl.textContent = q.question;
            card.append(qEl);
        }
        if (optScenario.checked && q.scenario) {
            const s = document.createElement("p");
            s.className = "print-card-scenario";
            s.textContent = q.scenario;
            card.append(s);
        }
        if (optDetail.checked && q.detail && q.detail.text) {
            const d = document.createElement("p");
            d.className = "print-card-detail";
            d.textContent = q.detail.text;
            card.append(d);
        }
        if (optHints.checked && Array.isArray(q.hints) && q.hints.length > 0) {
            const ul = document.createElement("ul");
            ul.className = "print-card-hints";
            q.hints.forEach(h => { const li = document.createElement("li"); li.textContent = h; ul.append(li); });
            card.append(ul);
        }
        if (optTerms.checked && Array.isArray(q.terms) && q.terms.length > 0) {
            const dl = document.createElement("dl");
            dl.className = "print-card-terms";
            q.terms.forEach(t => {
                const dt = document.createElement("dt"); dt.textContent = t.term;
                const dd = document.createElement("dd"); dd.textContent = t.definition;
                dl.append(dt, dd);
            });
            card.append(dl);
        }
        printArea.append(card);
    });
}

[layoutSelect, optQuestion, optScenario, optDetail, optHints, optTerms, optId].forEach(el => {
    if (el) el.addEventListener("change", render);
});
if (printButton) printButton.addEventListener("click", () => window.print());

loadData().catch(err => {
    printStatus.textContent = "読み込みに失敗しました。";
    console.error(err);
});
