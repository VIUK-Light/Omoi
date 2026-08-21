const levelInputs = document.querySelectorAll('input[name="level"]');
const nextButton = document.getElementById("nextButton");

let selectedLevel = null;

levelInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        selectedLevel = input.value;
        nextButton.disabled = false;
    });
});

nextButton.addEventListener("click", function () {
    if (selectedLevel === null) {
        return;
    }

    window.location.href =
        "question.html?level=" + selectedLevel;
});