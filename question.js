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


fetch("questions/level" + level + ".json")
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

    // 毎回いったん隠す
    detailButton.hidden = true;
    detailPanel.hidden = true;

    // detail があり、text に中身がある場合だけ表示
    if (
        currentQuestion.detail &&
        currentQuestion.detail.text &&
        currentQuestion.detail.text.trim() !== ""
    ) {
        detailButton.hidden = false;

        detailText.textContent =
            currentQuestion.detail.text;
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
