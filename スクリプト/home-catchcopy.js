(() => {
    const word = document.querySelector(".catchcopy__word");
    const currentWord = word?.querySelector("[data-catchcopy-word]");
    const nextWord = word?.querySelector(".catchcopy__word-next");
    if (!word || !currentWord || !nextWord) {
        return;
    }

    window.addEventListener("load", () => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }
        const words = ["重い", "思い", "想い", "Omoi"];
        const transitionDuration = 450;
        let index = 0;
        const interval = window.setInterval(() => {
            const next = words[index];
            nextWord.textContent = next;
            word.classList.add("is-scrolling");
            window.setTimeout(() => {
                currentWord.textContent = next;
                nextWord.textContent = "";
                word.classList.remove("is-scrolling");
            }, transitionDuration);

            index += 1;
            if (index === words.length) {
                window.clearInterval(interval);
            }
        }, 1000);
    }, { once: true });
})();
