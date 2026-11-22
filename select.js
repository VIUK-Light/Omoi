const modeInputs = document.querySelectorAll('input[name="mode"]');
const nextButton = document.getElementById("nextButton");

let selectedMode = null;

function redirect(url) {
    window.location.href = url.toString();
}

function updateNextButton() {
    nextButton.disabled = selectedMode === null;
}

modeInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        selectedMode = input.value;
        updateNextButton();
    });
});

nextButton.addEventListener("click", function () {
    if (nextButton.disabled) return;

    if (selectedMode === "student") {
        redirect(new URL("student-select.html", window.location.href));
        return;
    }

    if (selectedMode === "all") {
        redirect(new URL("level-select.html", window.location.href));
        return;
    }

    if (selectedMode === "custom") {
        redirect(new URL("custom-select.html", window.location.href));
    }
});

updateNextButton();
