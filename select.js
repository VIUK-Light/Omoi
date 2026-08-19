const categoryButtons = document.querySelectorAll(".category-list button");
const nextButton = document.getElementById("nextButton");

let selectedCategory = null;

categoryButtons.forEach(function (button) {
    button.addEventListener("click", function () {

        categoryButtons.forEach(function (item) {
            item.classList.remove("selected");
        });

        button.classList.add("selected");

        selectedCategory = button.dataset.category;

        nextButton.disabled = false;
    });
});