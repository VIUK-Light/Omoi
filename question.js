const params = new URLSearchParams(window.location.search);
const level = Number(params.get("level"));

const questionText = document.getElementById("questionText");
const scenarioBlock = document.getElementById("scenarioBlock");
const scenarioText = document.getElementById("scenarioText");
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
    scenarioBlock.setAttribute("aria-hidden", "true");
    updateQuestionLayout({ question: message });
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
        if (question.hints !== undefined &&
            (!Array.isArray(question.hints) ||
                question.hints.some(hint => typeof hint !== "string" || !hint.trim()))) {
            throw new Error("Invalid question hints.");
        }
        if (question.terms !== undefined &&
            (!Array.isArray(question.terms) ||
                question.terms.some(term => !term ||
                    typeof term.term !== "string" || !term.term.trim() ||
                    typeof term.definition !== "string" || !term.definition.trim()))) {
            throw new Error("Invalid question terms.");
        }
        if (question.detail !== undefined) {
            const detail = question.detail;
            if (!detail || typeof detail !== "object" || Array.isArray(detail) ||
                (detail.text !== undefined && typeof detail.text !== "string") ||
                (detail.sources !== undefined && !Array.isArray(detail.sources))) {
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

async function loadQuestions() {
    if (state === "loading") return;
    setState("loading");
    showMessage("読み込み中...");
    sessionQuestions = [];
    currentQuestionIndex = 0;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch("level" + level + ".json", { signal: controller.signal });
        if (!response.ok) {
            throw new Error("Question request failed: HTTP " + response.status);
        }
        const questions = await response.json();
        validateQuestions(questions);
        shuffle(questions);
        sessionQuestions = questions;
        if (sessionQuestions.length === 0) {
            showMessage("このLevelの質問はまだありません。レベルを選び直してください。");
            setState("empty");
            return;
        }
        showQuestion();
        setState("ready");
    } catch (error) {
        console.error("Omoi: 質問の読み込みに失敗しました。", error);
        showMessage(controller.signal.aborted
            ? "読み込みに時間がかかっています。接続を確認して再試行してください。"
            : "質問を読み込めませんでした。接続を確認して再試行してください。");
        setState("error");
    } finally {
        clearTimeout(timeout);
    }
}

retryLoadButton.addEventListener("click", loadQuestions);
if (!["1", "2", "3", "4"].includes(params.get("level")) ||
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

    questionText.textContent =
        currentQuestion.question;

    const scenario = currentQuestion.scenario?.trim() ?? "";
    scenarioText.textContent = scenario;
    scenarioBlock.setAttribute("aria-hidden", String(scenario === ""));

    updateQuestionLayout(currentQuestion);

    // 前の質問の状態をリセット
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

    const hints = currentQuestion.hints ?? [];
    if (hints.length > 0) {
        hintButton.hidden = false;
        hints.forEach(function (hint) {
            const listItem = document.createElement("li");
            listItem.textContent = hint;
            hintsList.appendChild(listItem);
        });
    }

    const detail = currentQuestion.detail;
    const detailValue = detail?.text?.trim() ?? "";
    const sources = detail?.sources ?? [];
    const terms = currentQuestion.terms ?? [];
    if (detailValue !== "" || sources.length > 0 || terms.length > 0) {
        detailButton.hidden = false;
        detailText.textContent = detailValue;

        termsSection.hidden = terms.length === 0;
        terms.forEach(function (term) {
            const name = document.createElement("dt");
            name.textContent = term.term;
            const definition = document.createElement("dd");
            definition.textContent = term.definition;
            termsList.appendChild(name);
            termsList.appendChild(definition);
        });

        // 出典がある場合だけ表示
        if (sources.length > 0) {
            sourceSection.hidden = false;

            sources.forEach(function (source) {
                const listItem =
                    document.createElement("li");

                const link =
                    document.createElement("a");

                link.textContent =
                    source.title;

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

function setDetailPanelOpen(isOpen) {
    if (isOpen) setHintsPanelOpen(false);
    detailPanel.hidden = !isOpen;
    detailButton.setAttribute("aria-expanded", String(isOpen));
    detailButtonLabel.textContent =
        isOpen ? "背景を閉じる" : "問いの背景";
}

function setHintsPanelOpen(isOpen) {
    if (isOpen) setDetailPanelOpen(false);
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
        if (!hintsPanel.hidden) {
            closeHintsPanel();
        } else if (!detailPanel.hidden) {
            closeDetailPanel();
        }
    }
});
