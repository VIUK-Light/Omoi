const nextButton = document.getElementById("nextButton");
const labelList = document.getElementById("labelList");
const labelSelectionSummary = document.getElementById("labelSelectionSummary");
const clearLabelsButton = document.getElementById("clearLabels");
const questionPickerDetails = document.getElementById("questionPickerDetails");
const questionPicker = document.getElementById("questionPicker");
const questionPickerStatus = document.getElementById("questionPickerStatus");
const questionPickerCount = document.getElementById("questionPickerCount");
const questionSearch = document.getElementById("questionSearch");
const showMoreQuestions = document.getElementById("showMoreQuestions");
const customTotal = document.getElementById("customTotal");
const customBreakdown = document.getElementById("customBreakdown");
const customError = document.getElementById("customError");
const customErrorText = document.getElementById("customErrorText");
const retryLoadButton = document.getElementById("retryLoadButton");

const allowedLevels = new Set(["2", "3", "4"]);
const levelNames = {
    2: "level:低",
    3: "level:中",
    4: "level:高"
};
const pageSize = 50;

let indexPromise = null;
let indexReady = false;
let indexError = "";
let labelsById = new Map();
let topicLabels = [];
let questions = [];
let selectedLabels = new Set();
let selectedQuestionIds = new Set();
let visibleQuestionCount = pageSize;

function createToken() {
    if (window.OmoiProgress?.createToken) {
        return window.OmoiProgress.createToken();
    }
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID().replace(/-/g, "");
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function redirect(url) {
    window.location.href = url.toString();
}

function selectedTopicLabels() {
    return topicLabels
        .filter(label => selectedLabels.has(label.id))
        .map(label => label.id);
}

function questionMatchesLabels(question) {
    if (selectedLabels.size === 0) return false;
    return question.labels.some(label => selectedLabels.has(label));
}

function categoryPool() {
    return questions.filter(questionMatchesLabels);
}

function unionPool() {
    const included = new Set(categoryPool().map(question => question.id));
    for (const id of selectedQuestionIds) included.add(id);
    return included;
}

function updateNextButton() {
    nextButton.disabled = !(indexReady && !indexError && unionPool().size > 0);
}

function labelName(labelId) {
    return labelsById.get(labelId)?.name ?? labelId;
}

function labelNamesFor(question) {
    return question.labels
        .filter(label => label !== "student")
        .map(labelName)
        .slice(0, 3)
        .join("・");
}

function normalizeSearch(value) {
    return String(value ?? "").normalize("NFKC").toLowerCase();
}

function filteredQuestions() {
    const term = normalizeSearch(questionSearch?.value ?? "");
    const list = questions.filter(question => {
        if (!term) return true;
        const haystack = [
            question.question,
            question.category,
            levelNames[question.level] ?? "",
            ...question.labels.map(labelName)
        ].join(" ").normalize("NFKC").toLowerCase();
        return haystack.includes(term);
    });
    return list.sort((left, right) => {
        if (left.level !== right.level) return left.level - right.level;
        return left.order - right.order;
    });
}

function updateLabelSection() {
    if (!labelSelectionSummary) return;

    if (!indexReady) {
        labelSelectionSummary.textContent = indexError ? "読み込めませんでした" : "読み込み中…";
        if (clearLabelsButton) clearLabelsButton.hidden = true;
        return;
    }

    const selectedCount = selectedLabels.size;
    labelSelectionSummary.textContent = selectedCount > 0
        ? `${selectedCount}件選択中`
        : `全${topicLabels.length}カテゴリー`;

    if (clearLabelsButton) clearLabelsButton.hidden = selectedCount === 0;
}

function updatePickerCount() {
    if (!questionPickerCount) return;

    const count = selectedQuestionIds.size;
    questionPickerCount.textContent = count > 0 ? `${count}問選択中` : "任意";
    questionPickerCount.dataset.active = count > 0 ? "true" : "false";
}

function updateCustomSummary() {
    if (!customTotal || !customBreakdown) return;

    if (!indexReady) {
        customTotal.textContent = "—";
        customBreakdown.textContent = indexError
            ? "問いを読み込めませんでした"
            : "問いを読み込んでいます…";
        return;
    }

    const categoryCount = categoryPool().length;
    const individualCount = selectedQuestionIds.size;
    const total = unionPool().size;

    customTotal.textContent = `${total}問`;

    if (total === 0) {
        customBreakdown.textContent = "カテゴリーか問いを選んでください";
        return;
    }

    const parts = [];
    if (selectedLabels.size > 0) {
        parts.push(`カテゴリー${selectedLabels.size}件（${categoryCount}問）`);
    }
    if (individualCount > 0) {
        parts.push(`個別${individualCount}問`);
    }
    customBreakdown.textContent = parts.join("・");
}

function updateCustomUi() {
    updateLabelSection();
    updatePickerCount();
    updateCustomSummary();
    updateNextButton();
}

function showError(message, canRetry) {
    if (!customError) return;

    customError.hidden = false;
    if (customErrorText) customErrorText.textContent = message;
    if (retryLoadButton) retryLoadButton.hidden = !canRetry;
}

function hideError() {
    if (customError) customError.hidden = true;
}

function renderLabelSkeletons() {
    if (!labelList) return;

    labelList.replaceChildren();
    for (let index = 0; index < 6; index++) {
        const skeleton = document.createElement("span");
        skeleton.className = "label-card label-card--skeleton";
        skeleton.setAttribute("aria-hidden", "true");
        labelList.append(skeleton);
    }
}

function setLoadingState() {
    indexReady = false;
    indexError = "";

    renderLabelSkeletons();
    if (labelSelectionSummary) labelSelectionSummary.textContent = "読み込み中…";
    if (clearLabelsButton) clearLabelsButton.hidden = true;

    if (questionPickerDetails) questionPickerDetails.hidden = true;
    if (questionPickerCount) {
        questionPickerCount.textContent = "—";
        questionPickerCount.dataset.active = "false";
    }

    if (questionPicker) questionPicker.replaceChildren();
    if (questionPickerStatus) questionPickerStatus.textContent = "読み込み中…";
    if (showMoreQuestions) showMoreQuestions.hidden = true;

    if (customTotal) customTotal.textContent = "—";
    if (customBreakdown) customBreakdown.textContent = "問いを読み込んでいます…";
    nextButton.disabled = true;

    hideError();
}

function renderQuestionPicker(options = {}) {
    if (!questionPicker) return;

    const previousScroll = options.preserveScroll ? questionPicker.scrollTop ?? 0 : 0;
    questionPicker.replaceChildren();

    if (!indexReady) {
        if (questionPickerStatus) {
            questionPickerStatus.textContent = indexError
                ? "問いを読み込めませんでした。"
                : "読み込み中…";
        }
        if (showMoreQuestions) showMoreQuestions.hidden = true;
        return;
    }

    const list = filteredQuestions();
    const shown = list.slice(0, visibleQuestionCount);

    if (questionPickerStatus) {
        questionPickerStatus.textContent = list.length === 0
            ? "該当する問いがありません。"
            : `${list.length}問中${shown.length}問を表示しています。`;
    }

    for (const question of shown) {
        const item = document.createElement("li");
        item.className = "question-pick";
        item.dataset.selected = selectedQuestionIds.has(question.id) ? "true" : "false";

        const label = document.createElement("label");
        label.className = "question-pick-label";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "question";
        checkbox.value = question.id;
        checkbox.checked = selectedQuestionIds.has(question.id);
        checkbox.dataset.questionId = question.id;
        checkbox.addEventListener("change", function () {
            if (checkbox.checked) selectedQuestionIds.add(question.id);
            else selectedQuestionIds.delete(question.id);

            item.dataset.selected = checkbox.checked ? "true" : "false";
            updatePickerCount();
            updateCustomSummary();
            updateNextButton();
        });

        const check = document.createElement("span");
        check.className = "question-pick-check";
        check.setAttribute("aria-hidden", "true");

        const text = document.createElement("span");
        text.className = "question-pick-text";

        const meta = document.createElement("span");
        meta.className = "question-pick-meta";

        const levelBadge = document.createElement("span");
        levelBadge.className = "level-badge";
        levelBadge.textContent = levelNames[question.level] ?? "";
        meta.append(levelBadge);

        const labels = document.createElement("span");
        labels.className = "question-pick-labels";
        labels.textContent = labelNamesFor(question);
        meta.append(labels);

        if (questionMatchesLabels(question)) {
            const included = document.createElement("span");
            included.className = "question-pick-included";
            included.textContent = "カテゴリーに含む";
            meta.append(included);
        }

        const questionText = document.createElement("span");
        questionText.className = "question-pick-question";
        questionText.textContent = question.question;

        text.append(meta, questionText);
        label.append(checkbox, check, text);
        item.append(label);
        questionPicker.append(item);
    }

    if (showMoreQuestions) showMoreQuestions.hidden = shown.length >= list.length;
    questionPicker.scrollTop = previousScroll;
}

function populateLabels() {
    if (!labelList) return;

    labelList.replaceChildren();

    for (const label of topicLabels) {
        const count = questions.filter(question => question.labels.includes(label.id)).length;
        if (count === 0) continue;

        const option = document.createElement("label");
        option.className = "label-card";
        option.dataset.labelId = label.id;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "label";
        checkbox.value = label.id;
        checkbox.checked = selectedLabels.has(label.id);
        checkbox.addEventListener("change", function () {
            if (checkbox.checked) selectedLabels.add(label.id);
            else selectedLabels.delete(label.id);

            visibleQuestionCount = pageSize;
            updateCustomUi();
            renderQuestionPicker({ preserveScroll: true });
        });

        const check = document.createElement("span");
        check.className = "label-check";
        check.setAttribute("aria-hidden", "true");

        const body = document.createElement("span");
        body.className = "label-card-body";

        const name = document.createElement("span");
        name.className = "label-card-name";
        name.textContent = label.name;

        const countElement = document.createElement("small");
        countElement.className = "label-card-count";
        countElement.textContent = `${count}問`;

        body.append(name, countElement);
        option.append(checkbox, check, body);
        labelList.append(option);
    }
}

function validateLabelsDocument(documentValue) {
    if (!documentValue || documentValue.version !== 1 ||
        !Array.isArray(documentValue.labels)) {
        throw new Error("Invalid labels document.");
    }
    const map = new Map();
    for (const label of documentValue.labels) {
        if (!label || typeof label.id !== "string" || typeof label.name !== "string" ||
            !["audience", "topic"].includes(label.kind)) {
            throw new Error("Invalid label definition.");
        }
        map.set(label.id, label);
    }
    return map;
}

function validateIndexDocument(documentValue, labelMap) {
    if (!documentValue || documentValue.version !== 1 ||
        !Array.isArray(documentValue.questions)) {
        throw new Error("Invalid questions index.");
    }
    return documentValue.questions.map((question, order) => {
        if (!question || typeof question.id !== "string" ||
            !Number.isInteger(question.level) || !allowedLevels.has(String(question.level)) ||
            typeof question.category !== "string" ||
            typeof question.question !== "string" ||
            !Array.isArray(question.labels) || question.labels.length === 0 ||
            question.labels.some(label => !labelMap.has(label))) {
            throw new Error("Invalid question index entry.");
        }
        return {
            id: question.id,
            level: question.level,
            category: question.category,
            labels: question.labels,
            question: question.question,
            order
        };
    });
}

async function loadIndex() {
    setLoadingState();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const [labelsResponse, indexResponse] = await Promise.all([
            fetch("labels.json", { signal: controller.signal }),
            fetch("questions-index.json", { signal: controller.signal })
        ]);
        if (!labelsResponse.ok || !indexResponse.ok) {
            throw new Error("Labels or index request failed.");
        }
        const [labelsDocument, indexDocument] = await Promise.all([
            labelsResponse.json(),
            indexResponse.json()
        ]);
        labelsById = validateLabelsDocument(labelsDocument);
        topicLabels = [...labelsById.values()]
            .filter(label => label.kind === "topic")
            .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
        questions = validateIndexDocument(indexDocument, labelsById);

        const validQuestionIds = new Set(questions.map(question => question.id));
        for (const id of [...selectedQuestionIds]) {
            if (!validQuestionIds.has(id)) selectedQuestionIds.delete(id);
        }
        const validLabelIds = new Set(topicLabels.map(label => label.id));
        for (const id of [...selectedLabels]) {
            if (!validLabelIds.has(id)) selectedLabels.delete(id);
        }

        indexReady = true;
        indexError = "";
        visibleQuestionCount = pageSize;

        hideError();
        if (questionPickerDetails) questionPickerDetails.hidden = false;
        populateLabels();
        updateCustomUi();
        renderQuestionPicker();
    } catch (error) {
        console.error("Omoi: 選択用の問い一覧を読み込めませんでした。", error);

        indexReady = false;
        indexError = controller.signal.aborted
            ? "読み込みに時間がかかっています。接続を確認してください。"
            : "問いを読み込めませんでした。接続を確認してください。";

        if (!controller.signal.aborted) controller.abort();
        if (labelList) labelList.replaceChildren();
        if (questionPickerDetails) questionPickerDetails.hidden = true;
        showError(indexError, true);
        updateLabelSection();
        updatePickerCount();
        updateCustomSummary();
        updateNextButton();
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function ensureIndex() {
    if (indexReady) return Promise.resolve();
    if (!indexPromise) {
        indexPromise = loadIndex().catch(() => {
            indexPromise = null;
        });
    }
    return indexPromise;
}

if (questionSearch) {
    questionSearch.addEventListener("input", function () {
        visibleQuestionCount = pageSize;
        renderQuestionPicker();
    });
}

if (showMoreQuestions) {
    showMoreQuestions.addEventListener("click", function () {
        visibleQuestionCount += pageSize;
        renderQuestionPicker({ preserveScroll: true });
    });
}

if (clearLabelsButton) {
    clearLabelsButton.addEventListener("click", function () {
        if (selectedLabels.size === 0) return;

        selectedLabels.clear();
        visibleQuestionCount = pageSize;
        populateLabels();
        updateCustomUi();
        renderQuestionPicker({ preserveScroll: true });

        const firstCheckbox = labelList?.children[0]?.children[0];
        if (firstCheckbox && typeof firstCheckbox.focus === "function") {
            firstCheckbox.focus();
        }
    });
}

if (retryLoadButton) {
    retryLoadButton.addEventListener("click", function () {
        if (indexPromise) return;
        ensureIndex();
    });
}

nextButton.addEventListener("click", function () {
    if (nextButton.disabled) return;
    if (!indexReady || unionPool().size === 0) return;

    const token = createToken();
    const selection = {
        version: 1,
        token,
        mode: "custom",
        labels: selectedTopicLabels(),
        ids: [...selectedQuestionIds],
        createdAt: Date.now()
    };
    if (!window.OmoiProgress?.writeSelection?.(selection)) {
        showError("この環境では選択を保存できません。ブラウザの設定を確認してください。", false);
        return;
    }
    const questionUrl = new URL("question.html", window.location.href);
    questionUrl.searchParams.set("mode", "custom");
    questionUrl.searchParams.set("session", token);
    redirect(questionUrl);
});

setLoadingState();
ensureIndex();
