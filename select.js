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
        window.location.href =
            "warning.html";
            "warning.html?count=" + encodeURIComponent(selectedCount);
        const warningUrl = new URL("warning.html", window.location.href);
        warningUrl.searchParams.set("count", selectedCount);
        window.location.href = warningUrl.toString();

        return;
    }

    if (selectedLevel === "3") {
        window.location.href =
            "warning3.html";
        const warning3Url = new URL("warning3.html", window.location.href);
        warning3Url.searchParams.set("count", selectedCount);
        window.location.href = warning3Url.toString();

        return;
    }

    window.location.href =
        "question.html?level=" +
        selectedLevel;
        encodeURIComponent(selectedLevel) +
        "&count=" +
        encodeURIComponent(selectedCount);
    const questionUrl = new URL("question.html", window.location.href);
    questionUrl.searchParams.set("level", selectedLevel);
    questionUrl.searchParams.set("count", selectedCount);
    window.location.href = questionUrl.toString();
});
