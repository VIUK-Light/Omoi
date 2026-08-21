const levelButtons = document.querySelectorAll(".level-list button");
const nextButton = document.getElementById("nextButton");

let selectedLevel = null;

levelButtons.forEach(function (button) {
    button.addEventListener("click", function () {

        // いったん全ボタンの選択状態を解除
        levelButtons.forEach(function (item) {
            item.classList.remove("selected");
        });

        // 押したボタンだけ選択状態にする
        button.classList.add("selected");

        // data-level の数字を保存
        selectedLevel = button.dataset.level;

        // 「次へ」を押せるようにする
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