import { readPreviewState, previewHref } from "./preview-state.mjs";

const previewState = readPreviewState(window.location.search);
const levelInputs =
    document.querySelectorAll('input[name="level"]');

const nextButton =
    document.getElementById("nextButton");

const allowedLevels = new Set(["2", "3", "4"]);
let selectedLevel = null;

levelInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        selectedLevel = allowedLevels.has(input.value) ? input.value : null;
        updateNextButton();
    });
});

function updateNextButton() {
    nextButton.disabled = !allowedLevels.has(selectedLevel);
}

nextButton.addEventListener("click", function () {
    if (!allowedLevels.has(selectedLevel)) {
        return;
    }

    if (selectedLevel === "4") {
        window.location.href = previewHref("warning.html", previewState, { baseUrl: window.location.href });

        return;
    }

    if (selectedLevel === "3") {
        window.location.href = previewHref("warning3.html", previewState, { baseUrl: window.location.href });

        return;
    }

    window.location.href = previewHref("question.html", previewState, { baseUrl: window.location.href, level: selectedLevel });
});
