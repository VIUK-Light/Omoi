const params = new URLSearchParams(window.location.search);
const level = Number(params.get("level"));

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


fetch("questions.json")
    .then(function (response) {
        return response.json();
    })
    .then(function (questions) {

        filteredQuestions = questions.filter(function (question) {
            return question.level === level;
        });

        shuffle(filteredQuestions);

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

    detailPanel.hidden = true;

   if (currentQuestion.detail) {
    detailButton.hidden = false;

    detailText.textContent =
        currentQuestion.detail.text;

    sourceList.innerHTML = "";

    if (
        currentQuestion.detail.sources &&
        currentQuestion.detail.sources.length > 0
    ) {
        sourceSection.hidden = false;

        currentQuestion.detail.sources.forEach(function (source) {
            const listItem =
                document.createElement("li");

            const link =
                document.createElement("a");

            link.textContent = source.title;
            link.href = source.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            listItem.appendChild(link);
            sourceList.appendChild(listItem);
        });

    } else {
        sourceSection.hidden = true;
    }

} else {
    detailButton.hidden = true;
}
}


function goToNextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex >= filteredQuestions.length) {
        window.location.href =
            "finish.html?level=" + level;

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
