const levelInputs = document.querySelectorAll('input[name="level"]');
const nextButton = document.getElementById("nextButton");

const allowedLevels = new Set(["2", "3", "4"]);

let selectedLevel = null;

function redirect(url) {
    window.location.href = url.toString();
}

function updateNextButton() {
    nextButton.disabled = !allowedLevels.has(selectedLevel);
}

levelInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        selectedLevel = allowedLevels.has(input.value) ? input.value : null;
        updateNextButton();
    });
});

nextButton.addEventListener("click", function () {
    if (nextButton.disabled) return;

    if (selectedLevel === "4") {
        redirect(new URL("warning.html", window.location.href));
        return;
    }
    if (selectedLevel === "3") {
        redirect(new URL("warning3.html", window.location.href));
        return;
    }

    const questionUrl = new URL("question.html", window.location.href);
    questionUrl.searchParams.set("level", selectedLevel);
    redirect(questionUrl);
});

updateNextButton();
