const params = new URLSearchParams(window.location.search);
const level = Number(params.get("level"));
const count = Number(params.get("count"));

const levelDisplay = document.getElementById("levelDisplay");
const questionText = document.getElementById("questionText");
const questionContent =
    document.querySelector(".question-content");
const sourceSection =
    document.getElementById("sourceSection");

const sourceList =
    document.getElementById("sourceList");
const nextQuestionButton =
    document.getElementById("nextQuestionButton");

const skipQuestionButton =
    document.getElementById("skipQuestionButton");

const reportQuestionLink =
    document.getElementById("reportQuestionLink");

const detailButton =
    document.getElementById("detailButton");

const detailPanel =
    document.getElementById("detailPanel");

const detailText =
    document.getElementById("detailText");

const closeDetailButton =
    document.getElementById("closeDetailButton");


let filteredQuestions = [];
let currentQuestionIndex = 0;

const reportIssueURL =
    "https://github.com/VIUK-Light/Omoi/issues/new";


const retryLoadButton = document.getElementById("retryLoadButton");
let state = "idle";

function setState(nextState) {
    state = nextState;
    nextQuestionButton.disabled = state !== "ready";
    skipQuestionButton.disabled = state !== "ready";
    questionContent.setAttribute("aria-busy", String(state === "loading"));
    retryLoadButton.hidden = state !== "error";
}

function showMessage(message) {
    questionText.textContent = message;
    updateQuestionLayout({ question: message });
    hideReportQuestionLink();
    detailButton.hidden = true;
    detailPanel.hidden = true;
    detailButton.setAttribute("aria-expanded", "false");
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
    filteredQuestions = [];
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
        filteredQuestions = questions.slice(0, count);
        if (filteredQuestions.length === 0) {
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
    !["5", "10", "30", "60"].includes(params.get("count")) ||
    params.getAll("level").length !== 1 || params.getAll("count").length !== 1) {
    setState("invalid");
    showMessage("質問の条件が正しくありません。「レベルを変える」から選び直してください。");
} else {
    levelDisplay.textContent = "Level " + level;
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
        filteredQuestions[currentQuestionIndex];

    questionText.textContent =
        currentQuestion.question;

    updateQuestionLayout(currentQuestion);

    updateReportQuestionLink(currentQuestion);

    // 前の質問の状態をリセット
    detailButton.hidden = true;
    detailPanel.hidden = true;
    detailButton.setAttribute("aria-expanded", "false");
    sourceSection.hidden = true;

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


function updateReportQuestionLink(question) {
    const rawQuestionID =
        question.id === null ||
        question.id === undefined
            ? ""
            : String(question.id).trim();

    const questionID =
        rawQuestionID !== ""
            ? rawQuestionID
            : "未設定";

    const reportURL =
        new URL(reportIssueURL);

    reportURL.searchParams.set(
        "template",
        "question-report.yml"
    );

    reportURL.searchParams.set(
        "title",
        "[質問報告] " + questionID
    );

    reportURL.searchParams.set(
        "question_id",
        questionID
    );

    reportURL.searchParams.set(
        "level",
        "Level " + level
    );

    reportURL.searchParams.set(
        "question_text",
        question.question
    );

    reportURL.searchParams.set(
        "source_file",
        "level" + level + ".json"
    );

    reportURL.searchParams.set(
        "source_url",
        window.location.href
    );

    reportQuestionLink.href =
        reportURL.toString();

    reportQuestionLink.hidden = false;
}


function hideReportQuestionLink() {
    reportQuestionLink.hidden = true;
    reportQuestionLink.removeAttribute("href");
}


function goToNextQuestion() {
    if (state !== "ready") return;
    currentQuestionIndex++;

    if (currentQuestionIndex >= filteredQuestions.length) {
        setState("finished");
        window.location.href =
    "finish.html?level=" +
    level +
    "&count=" +
    count;
        return;
    }

    showQuestion();
}


nextQuestionButton.addEventListener("click", function () {
    goToNextQuestion();
});


skipQuestionButton.addEventListener("click", function () {
    goToNextQuestion();
});


detailButton.addEventListener("click", function () {
    detailPanel.hidden = false;
    detailButton.setAttribute("aria-expanded", "true");
});


closeDetailButton.addEventListener("click", function () {
    detailPanel.hidden = true;
    detailButton.setAttribute("aria-expanded", "false");
    detailButton.focus();
});
