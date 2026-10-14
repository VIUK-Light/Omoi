const params = new URLSearchParams(window.location.search);
const level = Number(params.get("level"));

const questionText = document.getElementById("questionText");
const questionContent =
    document.querySelector(".question-content");
const sourceSection =
    document.getElementById("sourceSection");

const sourceList =
    document.getElementById("sourceList");
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
    updateQuestionLayout({ question: message });
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

    updateQuestionLayout(currentQuestion);

    // 前の質問の状態をリセット
    detailButton.hidden = true;
    setDetailPanelOpen(false);
    sourceSection.hidden = true;
    previousQuestionButton.disabled = currentQuestionIndex === 0;

    detailText.textContent = "";
    sourceList.innerHTML = "";

    // 詳細文がある場合だけボタンを表示
    if (
        currentQuestion.detail &&
        currentQuestion.detail.text &&
        currentQuestion.detail.text.trim() !== ""
    ) {
        detailButton.hidden = false;

        detailText.textContent =
            currentQuestion.detail.text;

        // 出典がある場合だけ表示
        const sources =
            currentQuestion.detail.sources;

        if (
            sources &&
            sources.length > 0
        ) {
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

    const isLongQuestion =
        [...questionValue].length >= 60;

    questionContent.classList.toggle(
        "long-question",
        isLongQuestion
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

function setDetailPanelOpen(isOpen) {
    detailPanel.hidden = !isOpen;
    detailButton.setAttribute("aria-expanded", String(isOpen));
    detailButtonLabel.textContent =
        isOpen ? "背景を閉じる" : "問いの背景";
}

function closeDetailPanel() {
    setDetailPanelOpen(false);
    detailButton.focus();
}


document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !detailPanel.hidden) {
        closeDetailPanel();
    }
});
