const dbList = document.getElementById("dbList");
const dbCount = document.getElementById("dbCount");
const dbSearch = document.getElementById("dbSearch");
const dbLevel = document.getElementById("dbLevel");
const dbCategory = document.getElementById("dbCategory");
const dbTheme = document.getElementById("dbTheme");
const selectAllVisibleButton = document.getElementById("selectAllVisible");
const clearSelectionButton = document.getElementById("clearSelection");
const selectedCountEl = document.getElementById("selectedCount");
const printSelectedButton = document.getElementById("printSelected");

const STORAGE_KEY = "omoi-print-selection";

let questions = [];
let labelsById = new Map();
let selectedIds = new Set();
let kuromojiTokenizer = null;

const levelNames = { 2: "低", 3: "中", 4: "高" };

function normalizeSearch(value) {
    return String(value ?? "").normalize("NFKC").toLowerCase();
}

async function loadData() {
    const [labelsDoc, indexDoc] = await Promise.all([
        fetch("labels.json").then(r => r.json()),
        fetch("questions-index.json").then(r => r.json())
    ]);
    for (const label of labelsDoc.labels ?? []) labelsById.set(label.id, label);
    questions = (indexDoc.questions ?? []).map(q => ({
        id: q.id,
        level: q.level,
        category: q.category,
        labels: q.labels ?? [],
        question: q.question,
        scenario: q.scenario ?? "",
        summary: q.summary ?? "",
        hints: q.hints ?? [],
        terms: q.terms ?? [],
        reading: q.reading ?? "",
        search: q.search ?? ""
    }));

    // category/theme options
    const categories = [...new Set(questions.map(q => q.category))].sort();
    for (const c of categories) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        dbCategory.append(opt);
    }
    const themes = (labelsDoc.labels ?? []).filter(l => l.kind === "topic").sort((a, b) => a.order - b.order);
    for (const t of themes) {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name;
        dbTheme.append(opt);
    }

    // restore selection
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (Array.isArray(saved)) saved.forEach(id => selectedIds.add(id));
    } catch (e) {}

    // kuromoji
    if (typeof kuromoji !== "undefined") {
        kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, tokenizer) => {
            if (!err) kuromojiTokenizer = tokenizer;
        });
    }

    render();
}

function textToReading(value) {
    if (!kuromojiTokenizer) return "";
    try { return kuromojiTokenizer.tokenize(value).map(t => t.reading || t.surface_form).join(""); } catch (e) { return ""; }
}

function filteredQuestions() {
    const term = normalizeSearch(dbSearch.value);
    const readingTerm = textToReading(dbSearch.value);
    const level = dbLevel.value;
    const category = dbCategory.value;
    const theme = dbTheme.value;
    return questions.filter(q => {
        if (level !== "all" && String(q.level) !== level) return false;
        if (category !== "all" && q.category !== category) return false;
        if (theme !== "all" && !q.labels.includes(theme)) return false;
        if (!term) return true;
        const haystack = [q.question, q.category, q.search, ...q.labels.map(l => labelsById.get(l)?.name ?? l)].join(" ").normalize("NFKC").toLowerCase();
        if (haystack.includes(term)) return true;
        if (readingTerm && q.reading) return normalizeSearch(q.reading).includes(normalizeSearch(readingTerm));
        return false;
    }).sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}

function labelName(id) { return labelsById.get(id)?.name ?? id; }

function hasDetail(q) {
    return Boolean(q.scenario) || (q.summary && q.summary !== q.question) ||
        (Array.isArray(q.hints) && q.hints.length > 0) ||
        (Array.isArray(q.terms) && q.terms.length > 0) ||
        (q.detail && q.detail.text);
}

function renderCard(q) {
    const card = document.createElement("article");
    card.className = "db-card";
    card.dataset.id = q.id;

    const head = document.createElement("div");
    head.className = "db-card-head";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "db-card-check";
    checkbox.checked = selectedIds.has(q.id);
    checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedIds.add(q.id); else selectedIds.delete(q.id);
        saveSelection();
        updateSelectedCount();
    });
    head.append(checkbox);

    const badge = document.createElement("span");
    badge.className = "db-level-badge";
    badge.textContent = `level:${levelNames[q.level] ?? q.level}`;
    head.append(badge);

    const idEl = document.createElement("span");
    idEl.className = "db-card-id";
    idEl.textContent = q.id;
    head.append(idEl);

    card.append(head);

    const questionText = document.createElement("p");
    questionText.className = "db-card-question";
    questionText.textContent = q.question;
    card.append(questionText);

    const meta = document.createElement("p");
    meta.className = "db-card-meta";
    meta.textContent = [labelName(q.labels.find(l => l !== "student") ?? ""), q.category].filter(Boolean).join(" ・ ");
    card.append(meta);

    if (q.scenario) {
        const scenario = document.createElement("p");
        scenario.className = "db-card-scenario";
        scenario.textContent = q.scenario;
        card.append(scenario);
    }

    if (hasDetail(q)) {
        const details = document.createElement("details");
        details.className = "db-card-details";
        const summary = document.createElement("summary");
        summary.textContent = "詳細を見る";
        details.append(summary);

        if (q.scenario) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const h = document.createElement("strong"); h.textContent = "背景";
            const body = document.createElement("p"); body.textContent = q.scenario;
            block.append(h, body);
            details.append(block);
        }
        if (q.summary && q.summary !== q.question) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const h = document.createElement("strong"); h.textContent = "要点";
            const body = document.createElement("p"); body.textContent = q.summary;
            block.append(h, body);
            details.append(block);
        }
        if (Array.isArray(q.hints) && q.hints.length > 0) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const h = document.createElement("strong"); h.textContent = "会話のヒント";
            const ul = document.createElement("ul");
            q.hints.forEach(hint => { const li = document.createElement("li"); li.textContent = hint; ul.append(li); });
            block.append(h, ul);
            details.append(block);
        }
        if (Array.isArray(q.terms) && q.terms.length > 0) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const h = document.createElement("strong"); h.textContent = "用語";
            const dl = document.createElement("dl");
            q.terms.forEach(t => {
                const dt = document.createElement("dt"); dt.textContent = t.term;
                const dd = document.createElement("dd"); dd.textContent = t.definition;
                dl.append(dt, dd);
            });
            block.append(h, dl);
            details.append(block);
        }
        if (q.detail && q.detail.text) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const h = document.createElement("strong"); h.textContent = "背景説明";
            const body = document.createElement("p"); body.textContent = q.detail.text;
            block.append(h, body);
            if (Array.isArray(q.detail.sources) && q.detail.sources.length > 0) {
                const ul = document.createElement("ul");
                ul.className = "db-sources";
                q.detail.sources.forEach(s => {
                    const li = document.createElement("li");
                    const a = document.createElement("a");
                    a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = s.title;
                    li.append(a); ul.append(li);
                });
                block.append(ul);
            }
            details.append(block);
        }
        card.append(details);
    }

    return card;
}

function render() {
    const list = filteredQuestions();
    dbList.replaceChildren();
    list.forEach(q => dbList.append(renderCard(q)));
    dbCount.textContent = `${list.length}問を表示（全${questions.length}問）`;
    updateSelectedCount();
}

function updateSelectedCount() {
    selectedCountEl.textContent = `${selectedIds.size}問を選択中`;
    printSelectedButton.disabled = selectedIds.size === 0;
}

function saveSelection() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedIds])); } catch (e) {}
}

function printSelected() {
    saveSelection();
    window.location.href = "print-cards.html";
}

if (selectAllVisibleButton) selectAllVisibleButton.addEventListener("click", () => {
    filteredQuestions().forEach(q => selectedIds.add(q.id));
    saveSelection();
    render();
});
if (clearSelectionButton) clearSelectionButton.addEventListener("click", () => {
    selectedIds.clear();
    saveSelection();
    render();
});
if (printSelectedButton) printSelectedButton.addEventListener("click", printSelected);
if (dbSearch) dbSearch.addEventListener("input", render);
if (dbLevel) dbLevel.addEventListener("change", render);
if (dbCategory) dbCategory.addEventListener("change", render);
if (dbTheme) dbTheme.addEventListener("change", render);

loadData().catch(err => {
    dbCount.textContent = "読み込みに失敗しました。";
    console.error(err);
});
