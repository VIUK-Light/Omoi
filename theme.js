(() => {
    const storageKey = "omoi-theme";
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const modes = {
        auto: "自動",
        light: "ライト",
        dark: "ダーク"
    };
    let mode = localStorage.getItem(storageKey);

    if (!Object.hasOwn(modes, mode)) {
        mode = "auto";
    }

    function applyTheme() {
        const theme = mode === "auto"
            ? (mediaQuery.matches ? "dark" : "light")
            : mode;
        document.documentElement.dataset.theme = theme;
    }

    function updateControl(control) {
        control.querySelectorAll("[data-theme-mode]").forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.themeMode === mode));
        });
        const summary = control.querySelector("summary");
        summary.setAttribute("aria-label", `テーマ: ${modes[mode]}`);
        summary.title = `テーマ: ${modes[mode]}`;
    }

    function addControl() {
        const control = document.createElement("details");
        control.className = "theme-control";
        control.innerHTML = `
            <summary aria-label="テーマ: 自動" title="テーマ: 自動">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>
                </svg>
            </summary>
            <div class="theme-menu" role="group" aria-label="テーマを選択">
                <button type="button" data-theme-mode="auto">自動</button>
                <button type="button" data-theme-mode="light">ライト</button>
                <button type="button" data-theme-mode="dark">ダーク</button>
            </div>
        `;

        control.addEventListener("click", (event) => {
            const button = event.target.closest("[data-theme-mode]");
            if (!button) {
                return;
            }

            mode = button.dataset.themeMode;
            if (mode === "auto") {
                localStorage.removeItem(storageKey);
            } else {
                localStorage.setItem(storageKey, mode);
            }
            applyTheme();
            updateControl(control);
            control.open = false;
            control.querySelector("summary").focus();
        });
        control.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && control.open) {
                control.open = false;
                control.querySelector("summary").focus();
            }
        });
        document.addEventListener("click", (event) => {
            if (!control.contains(event.target)) {
                control.open = false;
            }
        });

        document.body.append(control);
        updateControl(control);
    }

    applyTheme();
    mediaQuery.addEventListener("change", () => {
        if (mode === "auto") {
            applyTheme();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addControl, { once: true });
    } else {
        addControl();
    }
})();
