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

const levelNames = { 2: "低", 3: "中", 4: "高" };

function normalizeSearch(value) {
    return String(value ?? "").normalize("NFKC").toLowerCase();
}

async function loadData() {
    const [labelsDoc, indexDoc, detailIndexDoc] = await Promise.all([
        fetch("../../データ/索引/labels.json").then(r => r.json()),
        fetch("../../データ/索引/questions-index.json").then(r => r.json()),
        fetch("../../データ/索引/question-details-index.json").then(r => r.json())
    ]);
    if (!Array.isArray(indexDoc.questions) || !Array.isArray(detailIndexDoc.questions)) {
        throw new Error("Question index data is invalid.");
    }
    for (const label of labelsDoc.labels ?? []) labelsById.set(label.id, label);
    const detailsById = new Map(detailIndexDoc.questions.map(question => [question.id, question]));
    questions = (indexDoc.questions ?? []).map(q => ({
        ...q,
        ...detailsById.get(q.id),
        labels: Array.isArray(q.labels) ? q.labels : [],
        scenario: q.scenario ?? "",
        summary: q.summary ?? "",
        summaryBlocks: Array.isArray(q.summaryBlocks) ? q.summaryBlocks : [],
        hints: Array.isArray(q.hints) ? q.hints : [],
        terms: Array.isArray(q.terms) ? q.terms : [],
        content_warning: Array.isArray(q.content_warning) ? q.content_warning : [],
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

    render();
}

function filteredQuestions() {
    const term = normalizeSearch(dbSearch.value);
    const level = dbLevel.value;
    const category = dbCategory.value;
    const theme = dbTheme.value;
    return questions.filter(q => {
        if (level !== "all" && String(q.level) !== level) return false;
        if (category !== "all" && q.category !== category) return false;
        if (theme !== "all" && !q.labels.includes(theme)) return false;
        if (!term) return true;
        const detailSearch = [
            q.detail?.text,
            ...(Array.isArray(q.detail?.sources) ? q.detail.sources.map(source => source?.title) : [])
        ].filter(Boolean);
        const haystack = [q.question, q.category, q.search, q.reading, ...detailSearch, ...q.labels.map(l => labelsById.get(l)?.name ?? l)].join(" ").normalize("NFKC").toLowerCase();
        if (haystack.includes(term)) return true;
        return false;
    }).sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
}

function labelName(id) { return labelsById.get(id)?.name ?? id; }

function formatAddedDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
    return match ? `${match[1]}年${match[2]}月${match[3]}日` : "日付不明";
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

function hasDetail(q) {
    return Boolean(q.scenario) || (q.summary && q.summary !== q.question) ||
        (Array.isArray(q.hints) && q.hints.length > 0) ||
        (Array.isArray(q.terms) && q.terms.length > 0) ||
        (q.detail && (q.detail.text || q.detail.sources?.length)) ||
        q.addedDate || q.topic || q.perspective || q.role ||
        Number.isInteger(q.sensitivity) || q.content_warning.length > 0;
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
    checkbox.setAttribute("aria-label", `この問いを選択：${q.question}`);
    checkbox.checked = selectedIds.has(q.id);
    checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedIds.add(q.id); else selectedIds.delete(q.id);
        saveSelection();
        updateSelectedCount();
    });
    head.append(checkbox);

    const badge = document.createElement("span");
    badge.className = "db-level-badge";
    badge.textContent = `${levelNames[q.level] ?? q.level}`;
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
    meta.textContent = [
        ...q.labels.filter(label => label !== "student").map(labelName),
        q.category ? `カテゴリ: ${q.category}` : "",
        `追加日: ${formatAddedDate(q.addedDate)}`
    ].filter(Boolean).join(" ・ ");
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
        summary.textContent = "全情報を見る";
        details.append(summary);

        const metadata = [
            ["追加日", formatAddedDate(q.addedDate)],
            ["カテゴリ", q.category],
            ["テーマ", q.topic ? labelName(q.topic) : ""],
            ["視点", q.perspective],
            ["役割", q.role],
            ["センシティブ度", Number.isInteger(q.sensitivity) ? String(q.sensitivity) : ""],
            ["内容上の注意", q.content_warning.map(labelName).join("、")],
            ["ラベル", q.labels.map(labelName).join("、")]
        ].filter(([, value]) => Boolean(value));
        if (metadata.length > 0) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const heading = document.createElement("strong");
            heading.textContent = "基本情報";
            const list = document.createElement("dl");
            metadata.forEach(([label, value]) => {
                const term = document.createElement("dt");
                term.textContent = label;
                const description = document.createElement("dd");
                description.textContent = value;
                list.append(term, description);
            });
            block.append(heading, list);
            details.append(block);
        }

        if (q.scenario) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const h = document.createElement("strong"); h.textContent = "背景";
            const body = document.createElement("p"); body.textContent = q.scenario;
            block.append(h, body);
            details.append(block);
        }
        if (q.summaryBlocks.length > 0) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const h = document.createElement("strong"); h.textContent = "要点";
            block.append(h);
            q.summaryBlocks.forEach(summaryBlock => {
                if (summaryBlock?.type === "text" && typeof summaryBlock.text === "string") {
                    const body = document.createElement("p");
                    body.textContent = summaryBlock.text;
                    block.append(body);
                } else if (summaryBlock?.type === "bullets" && Array.isArray(summaryBlock.items)) {
                    const list = document.createElement("ul");
                    summaryBlock.items.forEach(item => {
                        if (!item || typeof item !== "object") return;
                        const entry = document.createElement("li");
                        if (typeof item.label === "string" && item.label) {
                            const label = document.createElement("strong");
                            label.textContent = `${item.label}：`;
                            entry.append(label);
                        }
                        if (typeof item.text === "string") entry.append(document.createTextNode(item.text));
                        list.append(entry);
                    });
                    block.append(list);
                }
            });
            details.append(block);
        } else if (q.summary && q.summary !== q.question) {
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
            q.terms.map(termParts).filter(Boolean).forEach(term => {
                const dt = document.createElement("dt"); dt.textContent = term.term;
                const dd = document.createElement("dd"); dd.textContent = term.definition;
                dl.append(dt, dd);
            });
            block.append(h, dl);
            details.append(block);
        }
        if (q.detail && (q.detail.text || q.detail.sources?.length)) {
            const block = document.createElement("div");
            block.className = "db-detail-block";
            const h = document.createElement("strong"); h.textContent = "背景説明";
            block.append(h);
            if (q.detail.text) {
                const body = document.createElement("p"); body.textContent = q.detail.text;
                block.append(body);
            }
            if (Array.isArray(q.detail.sources) && q.detail.sources.length > 0) {
                const ul = document.createElement("ul");
                ul.className = "db-sources";
                q.detail.sources.forEach(s => {
                    if (!s || typeof s !== "object") return;
                    const li = document.createElement("li");
                    const title = typeof s.title === "string" ? s.title : "";
                    const url = typeof s.url === "string" ? s.url : "";
                    if (/^https?:\/\//i.test(url)) {
                        const a = document.createElement("a");
                        a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
                        a.textContent = title || url;
                        li.append(a);
                    } else if (title) {
                        li.textContent = title;
                    }
                    if (url) {
                        const urlText = document.createElement("span");
                        urlText.className = "db-source-url";
                        urlText.textContent = url;
                        li.append(" ", urlText);
                    }
                    if (li.childNodes.length > 0) ul.append(li);
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
    window.location.href = "../印刷/print-cards.html";
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
