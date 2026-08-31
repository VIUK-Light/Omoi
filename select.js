const levelInputs =
    document.querySelectorAll('input[name="level"]');

const countInputs =
    document.querySelectorAll('input[name="count"]');

const nextButton =
    document.getElementById("nextButton");

let selectedLevel = null;
let selectedCount = null;


levelInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        selectedLevel = input.value;
        updateNextButton();
    });
});


countInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        selectedCount = input.value;
        updateNextButton();
    });
});


function updateNextButton() {
    nextButton.disabled =
        selectedLevel === null ||
        selectedCount === null;
}


nextButton.addEventListener("click", function () {
    if (
        selectedLevel === null ||
        selectedCount === null
    ) {
        return;
    }

    if (selectedLevel === "4") {
        const warningUrl = new URL("warning.html", window.location.href);
        warningUrl.searchParams.set("count", selectedCount);
        window.location.href = warningUrl.toString();

        return;
    }

    const questionUrl = new URL("question.html", window.location.href);
    questionUrl.searchParams.set("level", selectedLevel);
    questionUrl.searchParams.set("count", selectedCount);
    window.location.href = questionUrl.toString();
});
