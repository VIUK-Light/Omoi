(() => {
    const displayStorageKey = "omoi-display";
    const legacyStorageKey = "omoi-theme";
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const themes = {
        auto: "自動",
        light: "ライト",
        dark: "ダーク",
        sepia: "セピア",
        night: "ナイト",
        viuk: "VIUK-Light",
        "viuk-dark": "VIUK-Light dark"
    };

    const backgrounds = {
        none: "なし",
        dawn: "朝焼け",
        ocean: "波",
        forest: "森",
        paper: "和紙",
        dusk: "夕暮れ",
        cloud: "雲",
        sakura: "桜",
        deep: "深海",
        star: "星空",
        ripple: "波紋",
        lattice: "格子"
    };

    const defaultDisplay = {
        theme: "auto",
        background: "star",
        scrim: 55
    };

    function readStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            window.localStorage.setItem(key, value);
        } catch (error) {
            // 保存できない環境でも、表示そのものは続けてよい。
        }
    }

    function removeStorage(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
            // 保存できない環境では何もしない。
        }
    }

    let display = { ...defaultDisplay };

    const stored = readStorage(displayStorageKey);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Object.hasOwn(themes, parsed.theme)) {
                display.theme = parsed.theme;
            }
            if (Object.hasOwn(backgrounds, parsed.background)) {
                display.background = parsed.background;
            }
            const scrim = Number(parsed.scrim);
            if (Number.isFinite(scrim)) {
                display.scrim = Math.min(100, Math.max(0, Math.round(scrim)));
            }
        } catch (error) {
            // 壊れた値は無かったことにする。
        }
    } else {
        // 以前はテーマだけを omoi-theme に保存していた。読み替えて新しい設定へ移す。
        const legacy = readStorage(legacyStorageKey);
        if (legacy && Object.hasOwn(themes, legacy)) {
            display.theme = legacy;
        }
    }

    function resolveTheme() {
        if (display.theme === "auto") {
            return mediaQuery.matches ? "dark" : "light";
        }
        return display.theme;
    }

    function applyTheme() {
        const root = document.documentElement;
        root.dataset.theme = resolveTheme();
        root.dataset.selectedTheme = display.theme;
        root.dataset.background = display.background;
        // 濃さは「背景の濃さ」なので、100%なら水幕を消して背景をそのまま見せる。
        root.style.setProperty("--omoi-scrim-opacity", String((100 - display.scrim) / 100));
    }

    function saveDisplay() {
        const isDefault = display.theme === defaultDisplay.theme
            && display.background === defaultDisplay.background
            && display.scrim === defaultDisplay.scrim;
        if (isDefault) {
            removeStorage(displayStorageKey);
        } else {
            writeStorage(displayStorageKey, JSON.stringify(display));
        }
        removeStorage(legacyStorageKey);
    }

    function updateControl(control) {
        control.querySelectorAll("[data-theme-mode]").forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.themeMode === display.theme));
        });

        control.querySelectorAll("[data-theme-background]").forEach((button) => {
            button.setAttribute("aria-pressed", String(display.background === button.dataset.themeBackground));
        });

        const summary = control.querySelector("summary");
        summary.setAttribute("aria-label", "表示設定");
        summary.title = "表示設定";

        const scrimControl = control.querySelector("#themeScrimControl");
        if (scrimControl) {
            scrimControl.hidden = display.background === "none";
        }

        const range = control.querySelector("#themeScrimRange");
        if (range) {
            range.value = String(display.scrim);
        }

        const output = control.querySelector("#themeScrimValue");
        if (output) {
            output.textContent = `${display.scrim}%`;
        }
    }

    function themeSwatch(mode, label) {
        return `
            <button type="button" class="theme-swatch" data-theme-mode="${mode}" aria-pressed="false">
                <span class="theme-swatch__preview theme-swatch__preview--${mode}" aria-hidden="true"></span>
                <span class="theme-swatch__label">${label}</span>
            </button>
        `;
    }

    function backgroundSwatch(id, label) {
        return `
            <button type="button" class="theme-swatch" data-theme-background="${id}" aria-pressed="false">
                <span class="theme-swatch__preview theme-swatch__preview--${id}" aria-hidden="true"></span>
                <span class="theme-swatch__label">${label}</span>
            </button>
        `;
    }

    function panelMarkup() {
        const themeSwatches = Object.entries(themes)
            .map(([mode, label]) => themeSwatch(mode, label))
            .join("");
        const backgroundSwatches = Object.entries(backgrounds)
            .map(([id, label]) => backgroundSwatch(id, label))
            .join("");

        return `
            <p class="theme-panel__title">表示設定</p>
            <fieldset class="theme-panel__group">
                <legend>テーマ</legend>
                <div class="theme-swatches">${themeSwatches}</div>
            </fieldset>
            <fieldset class="theme-panel__group">
                <legend>背景</legend>
                <div class="theme-swatches theme-swatches--backgrounds">${backgroundSwatches}</div>
                <div class="theme-panel__scrim" id="themeScrimControl">
                    <label for="themeScrimRange">背景の濃さ</label>
                    <input type="range" id="themeScrimRange" min="0" max="100" step="5" value="${display.scrim}">
                    <output id="themeScrimValue" for="themeScrimRange">${display.scrim}%</output>
                </div>
            </fieldset>
            <button type="button" class="theme-panel__reset" data-theme-reset>表示設定を初期化</button>
        `;
    }

    function panelIcon() {
        return `
            <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h8M16 17h4"></path>
                <circle cx="15" cy="7" r="2"></circle>
                <circle cx="9" cy="12" r="2"></circle>
                <circle cx="14" cy="17" r="2"></circle>
            </svg>
        `;
    }

    function ensureBackgroundLayer() {
        let layer = document.querySelector(".page-background");
        if (!layer) {
            layer = document.createElement("div");
            layer.className = "page-background";
            layer.setAttribute("aria-hidden", "true");
            document.body.prepend(layer);
        }
        if (!layer.querySelector(".page-background__stars")) {
            layer.insertAdjacentHTML("afterbegin", `
                <span class="page-background__stars page-background__stars--far"></span>
                <span class="page-background__stars page-background__stars--near"></span>
                <span class="page-background__shooting-star page-background__shooting-star--a"></span>
                <span class="page-background__shooting-star page-background__shooting-star--b"></span>
                <span class="page-background__shooting-star page-background__shooting-star--c"></span>
                <span class="page-background__shooting-star page-background__shooting-star--d"></span>
                <span class="page-background__shooting-star page-background__shooting-star--e"></span>
            `);
        }
        return layer;
    }

    function addControl() {
        const control = document.createElement("details");
        control.className = "theme-control";
        control.innerHTML = `
            <summary aria-label="表示設定" title="表示設定">${panelIcon()}</summary>
            <div class="theme-menu theme-panel" role="group" aria-label="表示設定">${panelMarkup()}</div>
        `;

        ensureBackgroundLayer();

        control.addEventListener("click", (event) => {
            const themeButton = event.target.closest("button[data-theme-mode]");
            if (themeButton) {
                display.theme = themeButton.dataset.themeMode;
                applyTheme();
                saveDisplay();
                updateControl(control);
                return;
            }

            const backgroundButton = event.target.closest("button[data-theme-background]");
            if (backgroundButton) {
                display.background = backgroundButton.dataset.themeBackground;
                applyTheme();
                saveDisplay();
                updateControl(control);
                return;
            }

            if (event.target.closest("button[data-theme-reset]")) {
                display = { ...defaultDisplay };
                applyTheme();
                saveDisplay();
                updateControl(control);
            }
        });

        control.addEventListener("input", (event) => {
            const range = event.target.closest("input#themeScrimRange");
            if (!range) {
                return;
            }
            display.scrim = Number(range.value);
            applyTheme();
            saveDisplay();
            updateControl(control);
        });

        control.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && control.open) {
                control.open = false;
                control.querySelector("summary").focus();
            }
        });

        control.addEventListener("toggle", () => {
            if (!control.open) {
                return;
            }
            document.querySelectorAll("details.furigana-settings[open]").forEach((panel) => {
                panel.open = false;
            });
        });

        document.addEventListener("click", (event) => {
            if (!control.contains(event.target)) {
                control.open = false;
            }
        });

        document.body.append(control);
        updateControl(control);

        document.querySelectorAll("details.furigana-settings").forEach((panel) => {
            panel.addEventListener("toggle", () => {
                if (panel.open) {
                    control.open = false;
                }
            });
        });
    }

    applyTheme();
    mediaQuery.addEventListener("change", () => {
        if (display.theme === "auto") {
            applyTheme();
        }
    });

    // 低スペ端末の救済: 背景アニメーション中のフレームレートが著しく低い場合、
    // 静止画に落としてページ全体の操作性を優先する。
    function degradeIfSlow() {
        if (display.background === "none") return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const start = performance.now();
        let frames = 0;
        const tick = () => {
            frames += 1;
            const elapsed = performance.now() - start;
            if (elapsed >= 2000) {
                if (frames / (elapsed / 1000) < 30) {
                    document.documentElement.dataset.lowPower = "true";
                }
                return;
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    if (document.readyState === "loading") {
        window.addEventListener("load", () => window.setTimeout(degradeIfSlow, 1000), { once: true });
    } else {
        window.setTimeout(degradeIfSlow, 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addControl, { once: true });
    } else {
        addControl();
    }
})();
