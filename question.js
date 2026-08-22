const params = new URLSearchParams(window.location.search);
const level = Number(params.get("level"));
const count = Number(params.get("count"));

const levelDisplay = document.getElementById("levelDisplay");
const questionText = document.getElementById("questionText");
const sourceSection =
    document.getElementById("sourceSection");

const sourceList =
    document.getElementById("sourceList");
const nextQuestionButton =
    document.getElementById("nextQuestionButton");

const skipQuestionButton =
    document.getElementById("skipQuestionButton");

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


levelDisplay.textContent = "Level " + level;


fetch("level" + level + ".json")
    .then(function (response) {
        return response.json();
    })
    .then(function (questions) {

        filteredQuestions = questions;

        shuffle(filteredQuestions);
        filteredQuestions =
        filteredQuestions.slice(0, count);

        if (filteredQuestions.length === 0) {
            questionText.textContent =
                "このLevelの質問はまだありません。";

            nextQuestionButton.disabled = true;
            skipQuestionButton.disabled = true;

            return;
        }

        showQuestion();
    });


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

    // 前の質問の状態をリセット
    detailButton.hidden = true;
    detailPanel.hidden = true;
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


function goToNextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex >= filteredQuestions.length) {
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
});


closeDetailButton.addEventListener("click", function () {
    detailPanel.hidden = true;
});
