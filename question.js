const params = new URLSearchParams(window.location.search);
const level = Number(params.get("level"));
const allowedLevels = new Set(["2", "3", "4"]);

const questionText = document.getElementById("questionText");
const scenarioBlock = document.getElementById("scenarioBlock");
const scenarioText = document.getElementById("scenarioText");
const furiganaSettings = document.querySelector(".furigana-settings");
const furiganaSettingsSummary = document.getElementById("furiganaSettingsSummary");
const questionScreen = document.querySelector(".question-screen");
const classroomModeToggle = document.getElementById("classroomModeToggle");
const questionSummaryToggle = document.getElementById("questionSummaryToggle");
const furiganaToggle = document.getElementById("furiganaToggle");
const questionSummary = document.getElementById("questionSummary");
const questionSummaryText = document.getElementById("questionSummaryText");
let currentSummary = null;
const questionContent =
    document.querySelector(".question-content");
const sourceSection =
    document.getElementById("sourceSection");

const sourceList =
    document.getElementById("sourceList");
const hintButton = document.getElementById("hintButton");
const hintsPanel = document.getElementById("hintsPanel");
const hintsList = document.getElementById("hintsList");
const termsSection = document.getElementById("termsSection");
const termsList = document.getElementById("termsList");
const nextQuestionButton =
    document.getElementById("nextQuestionButton");

const finishButton =
    document.getElementById("finishButton");

const finishConfirmDialog =
    document.getElementById("finishConfirmDialog");

const cancelFinishButton =
    document.getElementById("cancelFinishButton");

const confirmFinishButton =
    document.getElementById("confirmFinishButton");

const previousQuestionButton =
    document.getElementById("previousQuestionButton");

const detailButton =
    document.getElementById("detailButton");

const detailButtonLabel =
    document.getElementById("detailButtonLabel");

const detailPanel =
    document.getElementById("detailPanel");

const detailText =
    document.getElementById("detailText");


let sessionQuestions = [];
let currentQuestionIndex = 0;
let readingsByQuestionId = {};
let currentFurigana = {};
let currentTextFields = new Map();
let furiganaEnabled = false;
let classroomModeEnabled = false;

const retryLoadButton = document.getElementById("retryLoadButton");
let state = "idle";

function setState(nextState) {
    state = nextState;
    nextQuestionButton.disabled = state !== "ready";
    finishButton.disabled = state !== "ready";
    previousQuestionButton.disabled =
        state !== "ready" || currentQuestionIndex === 0;
    questionContent.setAttribute("aria-busy", String(state === "loading"));
    retryLoadButton.hidden = state !== "error";
}

function showMessage(message) {
    questionText.textContent = message;
    scenarioText.textContent = "";
    questionText.removeAttribute("data-furigana-path");
    scenarioText.removeAttribute("data-furigana-path");
    currentTextFields.clear();
    currentFurigana = {};
    furiganaSettings.hidden = true;
    classroomModeToggle.hidden = true;
    furiganaToggle.hidden = true;
    scenarioBlock.setAttribute("aria-hidden", "true");
    updateQuestionLayout({ question: message });
    currentSummary = null;
    questionSummaryToggle.hidden = true;
    setQuestionSummaryOpen(false);
    hintButton.hidden = true;
    setHintsPanelOpen(false);
    detailButton.hidden = true;
    setDetailPanelOpen(false);
}

function validateQuestions(questions) {
    if (!Array.isArray(questions)) {
        throw new Error("Question data must be an array.");
    }
    for (const question of questions) {
        if (!question || question.level !== level ||
            typeof question.question !== "string" || !question.question.trim()) {
            throw new Error("Invalid question or mismatched level in question data.");
        }
        if (question.scenario !== undefined && typeof question.scenario !== "string") {
            throw new Error("Invalid question scenario.");
        }
        validateSummary(question.summary);
        if (question.hints !== undefined &&
            (!Array.isArray(question.hints) || question.hints.length === 0 ||
                question.hints.some(hint => typeof hint !== "string" || !hint.trim()))) {
            throw new Error("Invalid question hints.");
        }
        if (question.terms !== undefined &&
            (!Array.isArray(question.terms) || question.terms.length === 0 ||
                question.terms.some(term => !term ||
                    typeof term.term !== "string" || !term.term.trim() ||
                    typeof term.definition !== "string" || !term.definition.trim()))) {
            throw new Error("Invalid question terms.");
        }
        if (question.detail !== undefined) {
            const detail = question.detail;
            if (!detail || typeof detail !== "object" || Array.isArray(detail) ||
                typeof detail.text !== "string" || !detail.text.trim() ||
                !Array.isArray(detail.sources) || detail.sources.length === 0) {
                throw new Error("Invalid question detail.");
            }
            for (const source of detail.sources ?? []) {
                if (!source || typeof source.title !== "string" || !source.title.trim() ||
                    typeof source.url !== "string" || !/^https?:$/.test(new URL(source.url).protocol)) {
                    throw new Error("Invalid question source.");
                }
            }
        }
    }
}

function getVisibleTextFields(question) {
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

function validateFurigana(questions, readings) {
    if (!readings || typeof readings !== "object" || Array.isArray(readings)) {
        throw new Error("Invalid furigana data.");
    }

    const questionIds = new Set(questions.map(question => question.id));
    for (const [questionId, fields] of Object.entries(readings)) {
        if (!questionIds.has(questionId) || !fields ||
            typeof fields !== "object" || Array.isArray(fields)) {
            throw new Error("Invalid furigana question entry.");
        }
    }

    const containsKanji = value => /\p{Script=Han}/u.test(value);
    for (const question of questions) {
        const fields = getVisibleTextFields(question);
        const readingsForQuestion = readings[question.id];
        if (!readingsForQuestion || !Array.isArray(readingsForQuestion.question)) {
            throw new Error(`Missing question furigana: ${question.id}`);
        }
        for (const [fieldPath, segments] of Object.entries(readingsForQuestion)) {
            const source = fields[fieldPath];
            if (typeof source !== "string" || !Array.isArray(segments) || segments.length === 0) {
                throw new Error(`Invalid furigana field: ${question.id}.${fieldPath}`);
            }

            let reconstructed = "";
            for (const segment of segments) {
                if (!segment || typeof segment !== "object" || Array.isArray(segment)) {
                    throw new Error(`Invalid furigana segment: ${question.id}.${fieldPath}`);
                }
                if (typeof segment.text === "string" &&
                    Object.keys(segment).length === 1) {
                    if (containsKanji(segment.text)) {
                        throw new Error(`Unannotated kanji: ${question.id}.${fieldPath}`);
                    }
                    reconstructed += segment.text;
                } else if (typeof segment.ruby === "string" &&
                    typeof segment.reading === "string" &&
                    Object.keys(segment).length === 2 &&
                    containsKanji(segment.ruby) &&
                    /^[\u3041-\u3096\u309D-\u309F\u30FC・]+$/u.test(segment.reading)) {
                    reconstructed += segment.ruby;
                } else {
                    throw new Error(`Invalid ruby segment: ${question.id}.${fieldPath}`);
                }
            }
            if (reconstructed !== source) {
                throw new Error(`Furigana text does not match source: ${question.id}.${fieldPath}`);
            }
        }

        for (const [fieldPath, source] of Object.entries(fields)) {
            if (containsKanji(source) &&
                !Object.hasOwn(readingsForQuestion, fieldPath)) {
                throw new Error(`Missing furigana: ${question.id}.${fieldPath}`);
            }
        }
    }
}

function validateSummary(summary) {
    if (summary === undefined) return;
    if (!Array.isArray(summary) || summary.length === 0) {
        throw new Error("Invalid question summary.");
    }
    const nonEmpty = value => typeof value === "string" && value.trim() !== "";
    for (const block of summary) {
        if (!block || typeof block !== "object" || Array.isArray(block)) {
            throw new Error("Invalid question summary block.");
        }
        if (block.type === "text") {
            if (!nonEmpty(block.text)) throw new Error("Invalid summary text.");
        } else if (block.type === "bullets") {
            if (!Array.isArray(block.items) || block.items.length === 0 ||
                block.items.some(item => !item || !nonEmpty(item.text) ||
                    (item.label !== undefined && !nonEmpty(item.label)))) {
                throw new Error("Invalid summary bullets.");
            }
        } else {
            throw new Error("Unsupported question summary format.");
        }
    }
}

function drawFuriganaText(element, text, fieldPath, suffix = "") {
    const segments = currentFurigana[fieldPath];
    if (!furiganaEnabled || !segments) {
        element.textContent = text + suffix;
        return;
    }

    element.replaceChildren();
    for (const segment of segments) {
        if (typeof segment.text === "string") {
            element.appendChild(document.createTextNode(segment.text));
        } else {
            const ruby = document.createElement("ruby");
            ruby.appendChild(document.createTextNode(segment.ruby));
            const reading = document.createElement("rt");
            reading.textContent = segment.reading;
            ruby.appendChild(reading);
            element.appendChild(ruby);
        }
    }
    if (suffix) element.appendChild(document.createTextNode(suffix));
}

function renderFuriganaText(element, text, fieldPath, suffix = "") {
    element.dataset.furiganaPath = fieldPath;
    element.dataset.furiganaSuffix = suffix;
    currentTextFields.set(fieldPath, text);
    drawFuriganaText(element, text, fieldPath, suffix);
}

function refreshFuriganaText() {
    document.querySelectorAll("[data-furigana-path]").forEach(element => {
        const fieldPath = element.dataset.furiganaPath;
        const text = currentTextFields.get(fieldPath);
        if (text !== undefined) {
            drawFuriganaText(element, text, fieldPath, element.dataset.furiganaSuffix);
        }
    });
}

function setQuestionSummaryOpen(isOpen) {
    isOpen = Boolean(isOpen && state === "ready" && currentSummary);
    if (isOpen) {
        setHintsPanelOpen(false);
        setDetailPanelOpen(false);
    }
    questionSummaryText.innerHTML = "";
    if (isOpen) {
        for (const [blockIndex, block] of currentSummary.entries()) {
            if (block.type === "text") {
                const paragraph = document.createElement("p");
                renderFuriganaText(
                    paragraph,
                    block.text,
                    `summary.${blockIndex}.text`
                );
                questionSummaryText.appendChild(paragraph);
            } else {
                const list = document.createElement("ul");
                list.className = "summary-bullets";
                for (const [itemIndex, item] of block.items.entries()) {
                    const entry = document.createElement("li");
                    if (item.label !== undefined) {
                        const label = document.createElement("strong");
                        renderFuriganaText(
                            label,
                            item.label,
                            `summary.${blockIndex}.items.${itemIndex}.label`,
                            "："
                        );
                        const text = document.createElement("span");
                        renderFuriganaText(
                            text,
                            item.text,
                            `summary.${blockIndex}.items.${itemIndex}.text`
                        );
                        entry.appendChild(label);
                        entry.appendChild(text);
                    } else {
                        renderFuriganaText(
                            entry,
                            item.text,
                            `summary.${blockIndex}.items.${itemIndex}.text`
                        );
                    }
                    list.appendChild(entry);
                }
                questionSummaryText.appendChild(list);
            }
        }
    }
    questionSummary.hidden = !isOpen;
    questionSummaryToggle.setAttribute("aria-expanded", String(isOpen));
    questionSummaryToggle.textContent = isOpen ? "要点を閉じる" : "問いの要点を見る";
}

async function loadQuestions() {
    if (state === "loading" || !allowedLevels.has(params.get("level")) ||
        params.getAll("level").length !== 1) return;
    setState("loading");
    showMessage("読み込み中...");
    sessionQuestions = [];
    currentQuestionIndex = 0;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const [response, furiganaResponse] = await Promise.all([
            fetch("level" + level + ".json", { signal: controller.signal }),
            fetch("level" + level + "-furigana.json", { signal: controller.signal })
        ]);
        if (!response.ok || !furiganaResponse.ok) {
            throw new Error("Question or furigana request failed.");
        }
        const [questions, furigana] = await Promise.all([
            response.json(),
            furiganaResponse.json()
        ]);
        validateQuestions(questions);
        validateFurigana(questions, furigana);
        shuffle(questions);
        sessionQuestions = questions;
        readingsByQuestionId = furigana;
        if (sessionQuestions.length === 0) {
            showMessage("このLevelの質問はまだありません。レベルを選び直してください。");
            setState("empty");
            return;
        }
        showQuestion();
        setState("ready");
    } catch (error) {
        const timedOut = controller.signal.aborted;
        console.error("Omoi: 質問の読み込みに失敗しました。", error);
        if (!timedOut) controller.abort();
        showMessage(timedOut
            ? "読み込みに時間がかかっています。接続を確認して再試行してください。"
            : "質問を読み込めませんでした。接続を確認して再試行してください。");
        setState("error");
    } finally {
        clearTimeout(timeout);
    }
}

retryLoadButton.addEventListener("click", loadQuestions);
if (!allowedLevels.has(params.get("level")) ||
    params.getAll("level").length !== 1) {
    setState("invalid");
    showMessage("質問の条件が正しくありません。「レベルを変える」から選び直してください。");
} else {
    loadQuestions();
}


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {

        const j =
            Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] =
            [array[j], array[i]];
    }
}

function showQuestion() {
    const currentQuestion =
        sessionQuestions[currentQuestionIndex];

    currentFurigana = readingsByQuestionId[currentQuestion.id];
    currentTextFields = new Map();
    furiganaToggle.hidden = Object.keys(currentFurigana).length === 0;
    classroomModeToggle.hidden = false;
    furiganaSettings.hidden = false;
    classroomModeToggle.setAttribute("aria-pressed", String(classroomModeEnabled));
    classroomModeToggle.textContent = classroomModeEnabled ? "授業モードを終了" : "授業モード";
    furiganaToggle.setAttribute("aria-pressed", String(furiganaEnabled));
    furiganaToggle.textContent = furiganaEnabled ? "ふりがなを隠す" : "ふりがなを表示";
    renderFuriganaText(questionText, currentQuestion.question, "question");

    const scenario = currentQuestion.scenario?.trim() ?? "";
    renderFuriganaText(scenarioText, scenario, "scenario");
    scenarioBlock.setAttribute("aria-hidden", String(scenario === ""));

    updateQuestionLayout(currentQuestion);

    // 前の質問の状態をリセット
    setQuestionSummaryOpen(false);
    const supportsHelpers = currentQuestion.level === 3 || currentQuestion.level === 4;
    currentSummary = supportsHelpers ? currentQuestion.summary ?? null : null;
    questionSummaryToggle.hidden = !currentSummary;
    hintButton.hidden = true;
    setHintsPanelOpen(false);
    hintsList.innerHTML = "";
    detailButton.hidden = true;
    setDetailPanelOpen(false);
    sourceSection.hidden = true;
    termsSection.hidden = true;
    previousQuestionButton.disabled = currentQuestionIndex === 0;

    detailText.textContent = "";
    sourceList.innerHTML = "";
    termsList.innerHTML = "";

    const hints = supportsHelpers ? currentQuestion.hints ?? [] : [];
    if (hints.length > 0) {
        hintButton.hidden = false;
        hints.forEach(function (hint, index) {
            const listItem = document.createElement("li");
            renderFuriganaText(listItem, hint, `hints.${index}`);
            hintsList.appendChild(listItem);
        });
    }

    const detail = supportsHelpers ? currentQuestion.detail : undefined;
    const detailValue = detail?.text?.trim() ?? "";
    const sources = detail?.sources ?? [];
    const terms = supportsHelpers ? currentQuestion.terms ?? [] : [];
    if (detailValue !== "" || sources.length > 0 || terms.length > 0) {
        detailButton.hidden = false;
        if (detailValue) {
            renderFuriganaText(detailText, detailValue, "detail.text");
        }

        termsSection.hidden = terms.length === 0;
        terms.forEach(function (term, index) {
            const name = document.createElement("dt");
            renderFuriganaText(name, term.term, `terms.${index}.term`);
            const definition = document.createElement("dd");
            renderFuriganaText(definition, term.definition, `terms.${index}.definition`);
            termsList.appendChild(name);
            termsList.appendChild(definition);
        });

        // 出典がある場合だけ表示
        if (sources.length > 0) {
            sourceSection.hidden = false;

            sources.forEach(function (source, index) {
                const listItem =
                    document.createElement("li");

                const link =
                    document.createElement("a");

                renderFuriganaText(link, source.title, `detail.sources.${index}.title`);

                link.href =
                    source.url;

                link.target =
                    "_blank";

                link.rel =
                    "noopener noreferrer";

                listItem.appendChild(link);
                sourceList.appendChild(listItem);
            });
        }
    }
}


function updateQuestionLayout(question) {
    const questionValue =
        typeof question.question === "string"
            ? question.question
            : "";
    const scenarioValue =
        typeof question.scenario === "string"
            ? question.scenario
            : "";

    const isLongQuestion =
        [...questionValue, ...scenarioValue].length >= 60;
    const hasLongQuestionText =
        [...questionValue].length >= 60;

    questionContent.classList.toggle(
        "long-question",
        isLongQuestion
    );
    questionContent.classList.toggle(
        "long-question-text",
        hasLongQuestionText
    );

    questionContent.scrollTop = 0;
    requestAnimationFrame(updateQuestionScrollState);
}


function updateQuestionScrollState() {
    const hasOverflow =
        questionContent.scrollHeight >
        questionContent.clientHeight + 1;

    const isAtBottom =
        questionContent.scrollTop +
        questionContent.clientHeight >=
        questionContent.scrollHeight - 1;

    questionContent.classList.toggle(
        "has-more-question-text",
        hasOverflow && !isAtBottom
    );
}


questionContent.addEventListener(
    "scroll",
    updateQuestionScrollState,
    { passive: true }
);

window.addEventListener(
    "resize",
    updateQuestionScrollState
);


function goToNextQuestion() {
    if (state !== "ready") return;
    currentQuestionIndex++;

    if (currentQuestionIndex >= sessionQuestions.length) {
        finishSession();
        return;
    }

    showQuestion();
}

function goToPreviousQuestion() {
    if (state !== "ready" || currentQuestionIndex === 0) return;
    currentQuestionIndex--;
    showQuestion();
}

function finishSession() {
    setQuestionSummaryOpen(false);
    setHintsPanelOpen(false);
    setDetailPanelOpen(false);
    setState("finished");
    window.location.href = "index.html";
}


nextQuestionButton.addEventListener("click", function () {
    goToNextQuestion();
});

previousQuestionButton.addEventListener("click", function () {
    goToPreviousQuestion();
});

finishButton.addEventListener("click", function () {
    if (state !== "ready") return;
    finishConfirmDialog.showModal();
    cancelFinishButton.focus();
});

cancelFinishButton.addEventListener("click", function () {
    finishConfirmDialog.close();
    finishButton.focus();
});

confirmFinishButton.addEventListener("click", function () {
    finishConfirmDialog.close();
    finishSession();
});

finishConfirmDialog.addEventListener("close", function () {
    if (state === "ready") finishButton.focus();
});


detailButton.addEventListener("click", function () {
    setDetailPanelOpen(detailPanel.hidden);
});

hintButton.addEventListener("click", function () {
    setHintsPanelOpen(hintsPanel.hidden);
});

questionSummaryToggle.addEventListener("click", function () {
    setQuestionSummaryOpen(questionSummary.hidden);
});

furiganaToggle.addEventListener("click", function () {
    if (state !== "ready") return;
    furiganaEnabled = !furiganaEnabled;
    furiganaToggle.setAttribute("aria-pressed", String(furiganaEnabled));
    furiganaToggle.textContent = furiganaEnabled ? "ふりがなを隠す" : "ふりがなを表示";
    refreshFuriganaText();
});

classroomModeToggle.addEventListener("click", function () {
    if (state !== "ready") return;
    classroomModeEnabled = !classroomModeEnabled;
    questionScreen.classList.toggle("classroom-mode", classroomModeEnabled);
    classroomModeToggle.setAttribute("aria-pressed", String(classroomModeEnabled));
    classroomModeToggle.textContent = classroomModeEnabled ? "授業モードを終了" : "授業モード";
});

document.addEventListener("click", function (event) {
    if (!furiganaSettings.contains(event.target)) {
        furiganaSettings.open = false;
    }
});

function setDetailPanelOpen(isOpen) {
    if (isOpen) {
        setHintsPanelOpen(false);
        setQuestionSummaryOpen(false);
    }
    detailPanel.hidden = !isOpen;
    detailButton.setAttribute("aria-expanded", String(isOpen));
    detailButtonLabel.textContent =
        isOpen ? "背景を閉じる" : "問いの背景";
}

function setHintsPanelOpen(isOpen) {
    if (isOpen) {
        setDetailPanelOpen(false);
        setQuestionSummaryOpen(false);
    }
    hintsPanel.hidden = !isOpen;
    hintButton.setAttribute("aria-expanded", String(isOpen));
}

function closeDetailPanel() {
    setDetailPanelOpen(false);
    detailButton.focus();
}

function closeHintsPanel() {
    setHintsPanelOpen(false);
    hintButton.focus();
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        if (finishConfirmDialog.open) return;
        if (furiganaSettings.open) {
            furiganaSettings.open = false;
            furiganaSettingsSummary.focus();
        } else if (!questionSummary.hidden) {
            setQuestionSummaryOpen(false);
            questionSummaryToggle.focus();
        } else if (!hintsPanel.hidden) {
            closeHintsPanel();
        } else if (!detailPanel.hidden) {
            closeDetailPanel();
        }
    }
});

window.addEventListener("pagehide", function () {
    setQuestionSummaryOpen(false);
});
