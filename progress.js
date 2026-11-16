// 途中までの質問の進み具合を端末に保存し、ホームで「前回の続き」を案内する。
(() => {
    const storageKey = "omoi-progress";
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const tokenPattern = /^[A-Za-z0-9_-]{6,64}$/;
    const levelLabels = {
        2: "意見が分かれる身近な話",
        3: "社会や価値観について",
        4: "人生に関わる難しい選択"
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

    function isValid(data) {
        if (!data || data.version !== 1 || !tokenPattern.test(data.token)) return false;
        if (!Number.isInteger(data.level) || !levelLabels[data.level]) return false;
        if (!Array.isArray(data.ids) || data.ids.length === 0) return false;
        if (!data.ids.every(id => typeof id === "string" && id.trim() !== "")) return false;
        if (!Number.isInteger(data.index) || data.index < 0 || data.index >= data.ids.length) return false;
        if (typeof data.updatedAt !== "number") return false;
        return Date.now() - data.updatedAt <= maxAge;
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

    function buildQuestionUrl(data) {
        const url = new URL("question.html", window.location.href);
        url.search = "";
        url.searchParams.set("level", String(data.level));
        url.searchParams.set("id", data.ids[data.index]);
        url.searchParams.set("session", data.token);
        return url.href;
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
            detail.textContent =
                `Level ${data.level}｜${levelLabels[data.level]}・${data.index + 1}問目から`;
        }
        const link = document.getElementById("resumeNoticeLink");
        if (link) {
            link.href = buildQuestionUrl(data);
        }
        const close = document.getElementById("resumeNoticeClose");
        if (close) {
            close.addEventListener("click", function () {
                notice.hidden = true;
                const firstLevel = document.querySelector('input[name="level"]');
                if (firstLevel && typeof firstLevel.focus === "function") {
                    firstLevel.focus();
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
        buildQuestionUrl
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hydrateResumeNotice, { once: true });
    } else {
        hydrateResumeNotice();
    }
})();
