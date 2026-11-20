// 途中までの質問の進み具合を端末に保存し、ホームで「前回の続き」を案内する。
(() => {
    const storageKey = "omoi-progress";
    const selectionKey = "omoi-selection";
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const selectionMaxAge = 60 * 60 * 1000;
    const tokenPattern = /^[A-Za-z0-9_-]{6,64}$/;
    const modes = new Set(["student", "all", "custom"]);
    const levelNames = {
        2: "低",
        3: "中",
        4: "高"
    };
    const levelLabels = {
        2: "意見が分かれる身近な話",
        3: "社会や価値観について",
        4: "人生に関わる難しい選択"
    };
    const modeLabels = {
        student: "学校・若者向け",
        all: "すべてから選ぶ",
        custom: "自分で選ぶ"
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
            // 保存できない環境でも、質問はそのまま続けられる。
        }
    }

    function removeStorage(key) {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
            // 保存できない環境では何もしない。
        }
    }

    function createToken() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID().replace(/-/g, "");
        }
        const bytes = new Uint8Array(16);
        if (window.crypto && typeof window.crypto.getRandomValues === "function") {
            window.crypto.getRandomValues(bytes);
        } else {
            for (let index = 0; index < bytes.length; index++) {
                bytes[index] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    }

    function isStringArray(value) {
        return Array.isArray(value) &&
            value.every(item => typeof item === "string" && item.trim() !== "");
    }

    function isMode(value) {
        return modes.has(value);
    }

    function isValid(data) {
        if (!data || ![1, 2].includes(data.version) || !tokenPattern.test(data.token)) return false;
        if (!Array.isArray(data.ids) || data.ids.length === 0) return false;
        if (!data.ids.every(id => typeof id === "string" && id.trim() !== "")) return false;
        if (!Number.isInteger(data.index) || data.index < 0 || data.index >= data.ids.length) return false;
        if (typeof data.updatedAt !== "number") return false;
        if (data.version === 1) {
            if (!Number.isInteger(data.level) || !levelLabels[data.level]) return false;
        } else {
            if (!isMode(data.mode)) return false;
            if (data.mode === "all" && (!Number.isInteger(data.level) || !levelLabels[data.level])) return false;
            if (data.mode === "custom" && (!isStringArray(data.labels) || !isStringArray(data.selectedIds))) return false;
        }
        return Date.now() - data.updatedAt <= maxAge;
    }

    function isValidSelection(data) {
        return Boolean(data) &&
            data.version === 1 &&
            tokenPattern.test(data.token) &&
            (data.mode === "student" || data.mode === "custom") &&
            isStringArray(data.labels) &&
            isStringArray(data.ids) &&
            typeof data.createdAt === "number" &&
            Date.now() - data.createdAt <= selectionMaxAge;
    }

    function read() {
        const raw = readStorage(storageKey);
        if (!raw) return null;
        let data;
        try {
            data = JSON.parse(raw);
        } catch (error) {
            removeStorage(storageKey);
            return null;
        }
        if (!isValid(data)) {
            removeStorage(storageKey);
            return null;
        }
        return data;
    }

    function write(data) {
        writeStorage(storageKey, JSON.stringify(data));
    }

    function clear() {
        removeStorage(storageKey);
    }

    function writeSelection(data) {
        if (!isValidSelection(data)) return false;
        const text = JSON.stringify(data);
        writeStorage(selectionKey, text);
        return readStorage(selectionKey) === text;
    }

    function readSelection(token) {
        const raw = readStorage(selectionKey);
        if (!raw) return null;
        let data;
        try {
            data = JSON.parse(raw);
        } catch (error) {
            removeStorage(selectionKey);
            return null;
        }
        if (!isValidSelection(data) || data.token !== token) {
            removeStorage(selectionKey);
            return null;
        }
        return data;
    }

    function clearSelection() {
        removeStorage(selectionKey);
    }

    function buildQuestionUrl(data) {
        const url = new URL("question.html", window.location.href);
        url.search = "";
        const mode = data.version === 1 ? "all" : data.mode;
        url.searchParams.set("mode", mode);
        if (mode === "all") {
            url.searchParams.set("level", String(data.level));
            url.searchParams.set("id", data.ids[data.index]);
        }
        url.searchParams.set("session", data.token);
        return url.href;
    }

    function resumeDetail(data) {
        const position = `${data.index + 1}問目から`;
        if (data.version === 1) {
            return `level:${levelNames[data.level]}｜${levelLabels[data.level]}・${position}`;
        }
        if (data.mode === "all") {
            return `level:${levelNames[data.level]}｜${levelLabels[data.level]}・${position}`;
        }
        if (data.mode === "student") {
            return `${modeLabels.student}・${position}`;
        }
        const labels = typeof data.labels?.length === "number" ? data.labels.length : 0;
        const selected = typeof data.selectedIds?.length === "number" ? data.selectedIds.length : 0;
        const summary = labels > 0
            ? `${labels}カテゴリー${selected > 0 ? `＋${selected}問` : ""}`
            : `${selected}問`;
        return `${modeLabels.custom}｜${summary}・${position}`;
    }

    function hydrateResumeNotice() {
        const notice = document.getElementById("resumeNotice");
        if (!notice) return;
        const data = read();
        if (!data) {
            notice.hidden = true;
            return;
        }
        const detail = document.getElementById("resumeNoticeDetail");
        if (detail) {
            detail.textContent = resumeDetail(data);
        }
        const link = document.getElementById("resumeNoticeLink");
        if (link) {
            link.href = buildQuestionUrl(data);
        }
        const close = document.getElementById("resumeNoticeClose");
        if (close) {
            close.addEventListener("click", function () {
                notice.hidden = true;
                const firstMode = document.querySelector('input[name="mode"]');
                const firstLevel = document.querySelector('input[name="level"]');
                const target = firstMode ?? firstLevel;
                if (target && typeof target.focus === "function") {
                    target.focus();
                }
            });
        }
        notice.hidden = false;
    }

    window.OmoiProgress = {
        createToken,
        read,
        write,
        clear,
        writeSelection,
        readSelection,
        clearSelection,
        buildQuestionUrl
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hydrateResumeNotice, { once: true });
    } else {
        hydrateResumeNotice();
    }
})();
