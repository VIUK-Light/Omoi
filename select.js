const levelInputs =
    document.querySelectorAll('input[name="level"]');

const nextButton =
    document.getElementById("nextButton");

let selectedLevel = null;


levelInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        selectedLevel = input.value;
        updateNextButton();
    });
});


function updateNextButton() {
    nextButton.disabled = selectedLevel === null;
}


nextButton.addEventListener("click", function () {
    if (
        selectedLevel === null
    ) {
        return;
    }

    if (selectedLevel === "4") {
        const warningUrl = new URL("warning.html", window.location.href);
        window.location.href = warningUrl.toString();

        return;
    }

    if (selectedLevel === "3") {
        const warning3Url = new URL("warning3.html", window.location.href);
        window.location.href = warning3Url.toString();

        return;
    }

    const questionUrl = new URL("question.html", window.location.href);
    questionUrl.searchParams.set("level", selectedLevel);
    window.location.href = questionUrl.toString();
});
