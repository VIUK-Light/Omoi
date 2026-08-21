const params = new URLSearchParams(window.location.search);
const level = Number(params.get("level"));

const levelDisplay = document.getElementById("levelDisplay");
const questionText = document.getElementById("questionText");
const nextQuestionButton = document.getElementById("nextQuestionButton");
const detailButton = document.getElementById("detailButton");
const detailPanel = document.getElementById("detailPanel");
const detailText = document.getElementById("detailText");
const closeDetailButton = document.getElementById("closeDetailButton");
let filteredQuestions = [];
let currentQuestionIndex = 0;

levelDisplay.textContent = "Level " + level;

fetch("questions.json")
    .then(function (response) {
        return response.json();
    })
    .then(function (questions) {
        filteredQuestions = questions.filter(function (question) {
            return question.level === level;
        });

        if (filteredQuestions.length === 0) {
            questionText.textContent = "このLevelの質問はまだありません。";
            nextQuestionButton.disabled = true;
            return;
        }

        showQuestion();
    });

function showQuestion() {
    const currentQuestion =
        filteredQuestions[currentQuestionIndex];

    questionText.textContent = currentQuestion.question;

    detailPanel.hidden = true;

    if (currentQuestion.detail) {
        detailButton.hidden = false;
        detailText.textContent = currentQuestion.detail;
    } else {
        detailButton.hidden = true;
    }
}

nextQuestionButton.addEventListener("click", function () {
    currentQuestionIndex++;

    if (currentQuestionIndex >= filteredQuestions.length) {
        currentQuestionIndex = 0;
    }

    showQuestion();
});
detailButton.addEventListener("click", function () {
    detailPanel.hidden = false;
});

closeDetailButton.addEventListener("click", function () {
    detailPanel.hidden = true;
});