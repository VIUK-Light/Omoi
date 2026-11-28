(function () {
    "use strict";
    const input = document.getElementById("joinCode");
    const button = document.getElementById("joinButton");
    const error = document.getElementById("joinError");

    const VALID = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

    function go() {
        const code = (input.value || "").trim().toUpperCase();
        error.hidden = true;
        if (!VALID.test(code)) {
            error.textContent = "コードは6文字の英数字です（0・O・1・I は使いません）。";
            error.hidden = false;
            return;
        }
        window.location.href = "/r/" + code;
    }

    button.addEventListener("click", go);
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") go();
    });
    input.addEventListener("input", function () {
        input.value = input.value.toUpperCase();
    });
})();
