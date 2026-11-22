(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role") || "";

    const backLink = document.getElementById("backLink");
    const previewSummary = document.getElementById("previewSummary");
    const previewCount = document.getElementById("previewCount");
    const previewList = document.getElementById("previewList");
    const previewTotal = document.getElementById("previewTotal");
    const previewBreakdown = document.getElementById("previewBreakdown");
    const startButton = document.getElementById("startButton");
    const shareButton = document.getElementById("shareButton");
    const printButton = document.getElementById("printButton");
    const previewShareStatus = document.getElementById("previewShareStatus");
    const previewError = document.getElementById("previewError");
    const previewErrorText = document.getElementById("previewErrorText");
    const retryLoadButton = document.getElementById("retryLoadButton");

    const levelNames = { 2: "低", 3: "中", 4: "高" };

    let labelsById = new Map();
    let topicLabels = [];
    let questions = [];
    let deck = [];
    let scenarioById = new Map();
    let loadPromise = null;

    function parseThemeParameter(value) {
        if (typeof value !== "string" || value.trim() === "") return [];
        return [...new Set(
            value.split(",")
                .map(theme => theme.trim())
                .filter(theme => /^[a-z][a-z_]{0,30}$/.test(theme))
        )].slice(0, 24);
    }

    function parseLevelsParameter(value) {
        if (typeof value !== "string" || value.trim() === "") return [];
        return [...new Set(
            value.split(",")
                .map(v => Number(v.trim()))
                .filter(v => [2, 3, 4].includes(v))
        )].sort((a, b) => a - b);
    }

    function parseCountParameter(value) {
        if (value === "all") return "all";
        if (typeof value !== "string" || !/^[0-9]{1,3}$/.test(value)) return null;
        const count = Number(value);
        return count >= 1 && count <= 200 ? count : null;
    }

    function parseIdList(value) {
        if (typeof value !== "string" || value.trim() === "") return [];
        return [...new Set(
            value.split(",")
                .map(id => id.trim())
                .filter(id => /^[A-Za-z0-9_-]{1,80}$/.test(id))
        )].slice(0, 200);
    }

    const selectedThemes = parseThemeParameter(params.get("themes"));
    const selectedLevels = parseLevelsParameter(params.get("levels"));
    const countParam = parseCountParameter(params.get("count"));
    const heavy = params.get("heavy") === "1" || params.get("heavy") === "true";
    const classroom = params.get("classroom") === "1" || params.get("classroom") === "true";
    const selectionIds = parseIdList(params.get("ids"));
    const selectionIndices = !selectionIds.length && params.has("sel") && window.OmoiShare
        ? window.OmoiShare.decodeSharePayload(params.get("sel") ?? "")
        : [];

    function showError(message, canRetry = true) {
        if (previewError) previewError.hidden = false;
        if (previewErrorText) previewErrorText.textContent = message;
        if (retryLoadButton) retryLoadButton.hidden = !canRetry;
    }

    function hideError() {
        if (previewError) previewError.hidden = true;
    }

    function shuffle(list) {
        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }
        return list;
    }

    function questionById(id) {
        return questions.find(question => question.id === id) || null;
    }

    function resolveDeck() {
        if (selectionIds.length > 0) {
            return selectionIds.map(questionById).filter(Boolean);
        }
        if (selectionIndices.length > 0) {
            const seen = new Set();
            const selected = [];
            for (const index of selectionIndices) {
                const question = questions[index];
                if (!question || seen.has(question.id)) continue;
                seen.add(question.id);
                selected.push(question);
            }
            return selected;
        }

        const themeSet = new Set(selectedThemes);
        const levelSet = new Set(selectedLevels);
        const pool = questions.filter(question => {
            if (!Array.isArray(question.labels)) return false;
            if (themeSet.size > 0) {
                if (!question.labels.some(label => themeSet.has(label))) return false;
            } else if (!question.labels.includes("student")) {
                return false;
            }
            if (levelSet.size > 0 && !levelSet.has(question.level)) return false;
            if (heavy && question.sensitivity === 4) return false;
            return true;
        });
        shuffle(pool);
        if (countParam === "all" || countParam === null) return pool;
        return pool.slice(0, countParam);
    }

    function selectionParams(url) {
        if (selectedThemes.length > 0) url.searchParams.set("themes", selectedThemes.join(","));
        if (selectedLevels.length > 0) url.searchParams.set("levels", selectedLevels.join(","));
        if (countParam && countParam !== "all") url.searchParams.set("count", String(countParam));
        if (heavy) url.searchParams.set("heavy", "1");
        if (classroom) url.searchParams.set("classroom", "1");
    }

    function syncUrl() {
        const url = new URL(window.location.href);
        url.search = "";
        url.searchParams.set("mode", "student");
        if (role) url.searchParams.set("role", role);
        if (deck.length > 0) {
            url.searchParams.set("ids", deck.map(q => q.id).join(","));
        }
        selectionParams(url);
        history.replaceState(null, "", url.toString());
    }

    function buildQuestionUrl() {
        const url = new URL("question.html", window.location.href);
        url.search = "";
        url.searchParams.set("mode", "student");
        if (deck.length > 0) {
            url.searchParams.set("ids", deck.map(q => q.id).join(","));
        }
        selectionParams(url);
        return url.toString();
    }

    function backUrl() {
        const url = new URL("student-select.html", window.location.href);
        url.search = "";
        if (role) url.searchParams.set("role", role);
        // 元の選択条件を引き継いで設定画面に戻る
        const passthrough = ["themes", "levels", "count", "heavy", "classroom", "sel", "ids"];
        for (const key of passthrough) {
            const value = params.get(key);
            if (value) url.searchParams.set(key, value);
        }
        return url.toString();
    }

    function renderSummary() {
        const parts = [];
        if (selectionIds.length > 0 || selectionIndices.length > 0) {
            parts.push("選んだ問い");
        } else {
            if (selectedThemes.length > 0) parts.push(`${selectedThemes.length}カテゴリー`);
            else parts.push("学校・若者向け");
            if (selectedLevels.length > 0) {
                parts.push(`level:${selectedLevels.map(l => levelNames[l]).join("・")}`);
            } else {
                parts.push("すべての深さ");
            }
            if (countParam !== "all" && countParam !== null) parts.push(`${countParam}問`);
            else parts.push("すべて");
            if (heavy) parts.push("重い内容を除外");
        }
        if (classroom) parts.push("授業モード");
        if (role === "teacher") parts.push("教師");
        if (previewSummary) previewSummary.textContent = parts.join("・");
    }

    function renderList() {
        if (!previewList) return;
        previewList.replaceChildren();
        deck.forEach((question, index) => {
            const item = document.createElement("li");
            item.className = "student-preview-item";

            const main = document.createElement("div");
            main.className = "student-preview-item-main";

            const meta = document.createElement("div");
            meta.className = "student-preview-meta";

            const num = document.createElement("span");
            num.className = "student-preview-num";
            num.textContent = String(index + 1);

            const level = document.createElement("span");
            level.className = "level-badge";
            level.textContent = `level:${levelNames[question.level] ?? question.level}`;
            meta.append(num, level);

            if (question.sensitivity === 4) {
                const heavyBadge = document.createElement("span");
                heavyBadge.className = "student-preview-badge student-preview-badge-heavy";
                heavyBadge.textContent = "重い内容";
                meta.append(heavyBadge);
            }

            const text = document.createElement("p");
            text.className = "student-preview-question";
            text.textContent = question.question;

            const scenario = scenarioById.get(question.id) || "";
            if (scenario) {
                const scenarioBlock = document.createElement("p");
                scenarioBlock.className = "student-preview-scenario";
                scenarioBlock.textContent = scenario;
                main.append(meta, text, scenarioBlock);
            } else {
                main.append(meta, text);
            }

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "student-preview-remove";
            remove.textContent = "×";
            remove.setAttribute("aria-label", `${index + 1}問目「${question.question}」をセットから外す`);
            remove.addEventListener("click", () => {
                deck = deck.filter(q => q.id !== question.id);
                syncUrl();
                renderList();
                renderAction();
                if (deck.length > 0) {
                    const items = previewList.querySelectorAll(".student-preview-remove");
                    const target = items[Math.min(index, items.length - 1)];
                    if (target) target.focus();
                } else if (startButton) {
                    startButton.focus();
                }
            });

            item.append(main, remove);
            previewList.append(item);
        });
    }

    function renderAction() {
        const count = deck.length;
        if (previewCount) previewCount.textContent = count > 0 ? `${count}問` : "0問";
        if (previewTotal) previewTotal.textContent = `${count}問`;
        if (previewBreakdown) {
            previewBreakdown.textContent = count > 0
                ? "このセットで始められます"
                : "問いがありません。設定に戻って選び直してください。";
        }
        if (startButton) startButton.disabled = count === 0;
        if (shareButton) shareButton.disabled = count === 0;
        if (printButton) printButton.disabled = count === 0;
    }

    async function load() {
        if (backLink) backLink.href = backUrl();
        renderSummary();
        try {
            const [labelsRes, filterRes, indexRes] = await Promise.all([
                fetch("labels.json"),
                fetch("question-filter-index.json"),
                fetch("questions-index.json").catch(() => null)
            ]);
            if (!labelsRes.ok || !filterRes.ok) throw new Error("load failed");
            const [labelsDoc, filterDoc] = await Promise.all([labelsRes.json(), filterRes.json()]);
            labelsById = new Map((labelsDoc.labels ?? []).map(label => [label.id, label]));
            topicLabels = (labelsDoc.labels ?? [])
                .filter(label => label.kind === "topic")
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            questions = Array.isArray(filterDoc.questions) ? filterDoc.questions : [];
            if (indexRes && indexRes.ok) {
                const indexDoc = await indexRes.json();
                const all = Array.isArray(indexDoc.questions) ? indexDoc.questions : [];
                scenarioById = new Map(
                    all
                        .filter(question => typeof question?.id === "string" && typeof question?.scenario === "string")
                        .map(question => [question.id, question.scenario.trim()])
                );
            }
            deck = resolveDeck();
            hideError();
            syncUrl();
            renderSummary();
            renderList();
            renderAction();
        } catch (error) {
            console.error("Omoi: preview load failed", error);
            showError("問いを読み込めませんでした。接続を確認してください。", true);
            if (previewTotal) previewTotal.textContent = "—";
            if (previewBreakdown) previewBreakdown.textContent = "問いを読み込めませんでした";
            if (startButton) startButton.disabled = true;
        }
    }

    function ensureLoad() {
        if (!loadPromise) loadPromise = load().finally(() => { loadPromise = null; });
        return loadPromise;
    }

    if (retryLoadButton) {
        retryLoadButton.addEventListener("click", () => ensureLoad());
    }
    if (startButton) {
        startButton.addEventListener("click", () => {
            if (startButton.disabled || deck.length === 0) return;
            window.location.href = buildQuestionUrl();
        });
    }

    if (shareButton) {
        shareButton.addEventListener("click", async () => {
            if (shareButton.disabled || deck.length === 0) return;
            const url = buildQuestionUrl();
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const area = document.createElement("textarea");
                    area.value = url;
                    area.style.position = "fixed";
                    area.style.opacity = "0";
                    document.body.appendChild(area);
                    area.select();
                    document.execCommand("copy");
                    area.remove();
                }
                if (previewShareStatus) previewShareStatus.textContent = "セットのURLをコピーしました。";
            } catch (error) {
                if (previewShareStatus) previewShareStatus.textContent = "URLをコピーできませんでした。";
            }
        });
    }

    if (printButton) {
        printButton.addEventListener("click", () => {
            if (printButton.disabled || deck.length === 0) return;
            const url = new URL("worksheet.html", window.location.href);
            url.search = "";
            url.searchParams.set("ids", deck.map(q => q.id).join(","));
            if (classroom) url.searchParams.set("classroom", "1");
            window.location.href = url.toString();
        });
    }

    ensureLoad();
})();
