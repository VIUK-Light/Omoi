(() => {
    const params = new URLSearchParams(window.location.search);
    const backLink = document.getElementById("backLink");
    const printButton = document.getElementById("printButton");
    const includeHelpers = document.getElementById("includeHelpers");
    const helpersOption = document.getElementById("helpersOption");
    const worksheetMeta = document.getElementById("worksheetMeta");
    const worksheetNote = document.getElementById("worksheetNote");
    const worksheetError = document.getElementById("worksheetError");
    const worksheetList = document.getElementById("worksheetList");

    const levelNames = { 2: "低", 3: "中", 4: "高" };
    const answerLineCount = 4;

    let labelMetaById = new Map();

    function parseIdList(value) {
        if (typeof value !== "string" || value.trim() === "") return [];
        return [...new Set(value.split(",").map(v => v.trim()).filter(v => /^[A-Za-z0-9_-]{1,80}$/.test(v)))].slice(0, 200);
    }

    function showError(message) {
        if (worksheetError) {
            worksheetError.hidden = false;
            worksheetError.textContent = message;
        }
        if (printButton) printButton.disabled = true;
        if (helpersOption) helpersOption.hidden = true;
    }

    function buildBackUrl() {
        const url = new URL("student-preview.html", window.location.href);
        url.search = "";
        url.searchParams.set("mode", "student");
        if (params.get("role")) url.searchParams.set("role", params.get("role"));
        if (params.get("ids")) url.searchParams.set("ids", params.get("ids"));
        if (params.get("sel")) url.searchParams.set("sel", params.get("sel"));
        if (params.get("classroom")) url.searchParams.set("classroom", "1");
        return url.toString();
    }

    function resolveQuestions(allQuestions) {
        const ids = parseIdList(params.get("ids"));
        if (ids.length > 0) {
            const byId = new Map(allQuestions.map(q => [q.id, q]));
            return ids.map(id => byId.get(id)).filter(Boolean);
        }
        const indices = params.has("sel") && window.OmoiShare
            ? window.OmoiShare.decodeSharePayload(params.get("sel") || "")
            : [];
        const seen = new Set();
        const result = [];
        for (const index of indices) {
            const q = allQuestions[index];
            if (!q || seen.has(q.id)) continue;
            seen.add(q.id);
            result.push(q);
        }
        return result;
    }

    function topicName(question) {
        const topics = (Array.isArray(question.labels) ? question.labels : [])
            .map(id => labelMetaById.get(id))
            .filter(meta => meta && meta.kind === "topic")
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        return topics[0]?.name ?? "";
    }

    function summaryText(summary) {
        if (typeof summary === "string") return summary.trim();
        if (!Array.isArray(summary)) return "";
        const parts = [];
        for (const block of summary) {
            if (typeof block === "string") {
                parts.push(block.trim());
            } else if (block?.type === "text" && typeof block.text === "string") {
                parts.push(block.text.trim());
            } else if (block?.type === "bullets" && Array.isArray(block.items)) {
                for (const item of block.items) {
                    if (!item) continue;
                    const text = typeof item === "string" ? item : item.text;
                    if (typeof text === "string" && text.trim()) parts.push(text.trim());
                }
            }
        }
        return parts.filter(Boolean).join("\n");
    }

    function termParts(term) {
        if (typeof term === "string") {
            const separator = term.indexOf(":");
            if (separator > 0) {
                return {
                    term: term.slice(0, separator).trim(),
                    definition: term.slice(separator + 1).trim()
                };
            }
            return { term: "", definition: term.trim() };
        }
        if (!term || typeof term !== "object") return null;
        const name = typeof term.term === "string" ? term.term.trim() : "";
        const definition = typeof term.definition === "string" ? term.definition.trim() : "";
        if (!name && !definition) return null;
        return { term: name, definition };
    }

    function helperSection(className, label, build) {
        const section = document.createElement("section");
        section.className = `worksheet-helper ${className}`;
        const heading = document.createElement("p");
        heading.className = "worksheet-helper-label";
        heading.textContent = label;
        section.append(heading);
        build(section);
        return section;
    }

    function buildHelpers(question) {
        const helpers = document.createElement("div");
        helpers.className = "worksheet-helpers";

        const summary = summaryText(question.summary);
        if (summary) {
            helpers.append(helperSection("worksheet-helper-summary", "問いの背景", section => {
                const text = document.createElement("p");
                text.className = "worksheet-helper-text";
                text.textContent = summary;
                section.append(text);
            }));
        }

        const hints = (Array.isArray(question.hints) ? question.hints : [])
            .filter(hint => typeof hint === "string" && hint.trim());
        if (hints.length > 0) {
            helpers.append(helperSection("worksheet-helper-hints", "会話のヒント", section => {
                const list = document.createElement("ul");
                list.className = "worksheet-helper-list";
                for (const hint of hints) {
                    const item = document.createElement("li");
                    item.textContent = hint.trim();
                    list.append(item);
                }
                section.append(list);
            }));
        }

        const terms = (Array.isArray(question.terms) ? question.terms : [])
            .map(termParts)
            .filter(Boolean);
        if (terms.length > 0) {
            helpers.append(helperSection("worksheet-helper-terms", "用語", section => {
                const list = document.createElement("dl");
                list.className = "worksheet-term-list";
                for (const term of terms) {
                    if (term.term) {
                        const name = document.createElement("dt");
                        name.textContent = term.term;
                        list.append(name);
                    }
                    const definition = document.createElement("dd");
                    definition.textContent = term.definition;
                    list.append(definition);
                }
                section.append(list);
            }));
        }

        return helpers.childElementCount > 0 ? helpers : null;
    }

    function render(questions) {
        if (worksheetList) worksheetList.replaceChildren();
        if (worksheetMeta) {
            const levels = [...new Set(questions.map(q => q.level))]
                .filter(level => levelNames[level])
                .sort();
            const levelText = levels.length > 0
                ? levels.map(level => `level:${levelNames[level]}`).join("・")
                : "";
            worksheetMeta.textContent = levelText
                ? `${questions.length}問 ／ ${levelText}`
                : `${questions.length}問`;
        }
        const hasHeavy = questions.some(q => q.sensitivity === 4);
        if (worksheetNote) {
            worksheetNote.hidden = !hasHeavy;
            worksheetNote.textContent = hasHeavy
                ? "重い内容を含む問いがあります。答えたくない問いは飛ばしても大丈夫です。"
                : "";
        }

        let hasAnyHelpers = false;

        for (const [i, question] of questions.entries()) {
            const item = document.createElement("li");
            item.className = "worksheet-item";

            const head = document.createElement("div");
            head.className = "worksheet-item-head";

            const num = document.createElement("span");
            num.className = "worksheet-num";
            num.textContent = `Q${i + 1}`;

            const meta = document.createElement("div");
            meta.className = "worksheet-item-meta";

            const level = document.createElement("span");
            level.className = "worksheet-level";
            level.textContent = `level:${levelNames[question.level] ?? question.level}`;
            meta.append(level);

            const topic = topicName(question);
            if (topic) {
                const category = document.createElement("span");
                category.className = "worksheet-category";
                category.textContent = topic;
                meta.append(category);
            }

            if (question.sensitivity === 4) {
                const badge = document.createElement("span");
                badge.className = "worksheet-heavy";
                badge.textContent = "重い内容";
                meta.append(badge);
            }

            head.append(num, meta);

            const scenario = typeof question.scenario === "string"
                ? question.scenario.trim()
                : "";
            let scenarioBlock = null;
            if (scenario) {
                scenarioBlock = document.createElement("div");
                scenarioBlock.className = "worksheet-scenario";
                const scenarioLabel = document.createElement("p");
                scenarioLabel.className = "worksheet-scenario-label";
                scenarioLabel.textContent = "こんな場面を想像してください";
                const scenarioText = document.createElement("p");
                scenarioText.className = "worksheet-scenario-text";
                scenarioText.textContent = scenario;
                scenarioBlock.append(scenarioLabel, scenarioText);
            }

            const text = document.createElement("p");
            text.className = "worksheet-question";
            text.textContent = question.question;

            const helpers = buildHelpers(question);
            if (helpers) hasAnyHelpers = true;

            const answer = document.createElement("div");
            answer.className = "worksheet-answer";
            answer.setAttribute("aria-hidden", "true");
            const answerLabel = document.createElement("p");
            answerLabel.className = "worksheet-answer-label";
            answerLabel.textContent = "メモ";
            answer.append(answerLabel);
            for (let line = 0; line < answerLineCount; line++) {
                const l = document.createElement("div");
                l.className = "worksheet-answer-line";
                answer.append(l);
            }

            item.append(head);
            if (scenarioBlock) item.append(scenarioBlock);
            item.append(text);
            if (helpers) item.append(helpers);
            item.append(answer);
            worksheetList.append(item);
        }

        if (!hasAnyHelpers && helpersOption) {
            helpersOption.hidden = true;
        }
        if (includeHelpers) {
            worksheetList?.classList.toggle("show-helpers", includeHelpers.checked);
        }

        if (printButton) printButton.disabled = questions.length === 0;
    }

    async function load() {
        if (backLink) backLink.href = buildBackUrl();
        try {
            const labelsPromise = fetch("labels.json")
                .then(res => (res.ok ? res.json() : null))
                .catch(() => null);
            const [res, labelsDoc] = await Promise.all([
                fetch("questions-index.json"),
                labelsPromise
            ]);
            if (!res.ok) throw new Error("load failed");
            const doc = await res.json();
            labelMetaById = new Map(
                (Array.isArray(labelsDoc?.labels) ? labelsDoc.labels : [])
                    .map(label => [label.id, label])
            );
            const all = Array.isArray(doc.questions) ? doc.questions : [];
            const selected = resolveQuestions(all);
            if (selected.length === 0) {
                showError("問いが見つかりませんでした。セットを選び直してください。");
                return;
            }
            render(selected);
        } catch (error) {
            console.error("Omoi: worksheet load failed", error);
            showError("ワークシートを読み込めませんでした。");
        }
    }

    if (printButton) {
        printButton.addEventListener("click", () => {
            if (printButton.disabled) return;
            window.print();
        });
    }

    if (includeHelpers) {
        includeHelpers.addEventListener("change", () => {
            worksheetList?.classList.toggle("show-helpers", includeHelpers.checked);
        });
    }

    load();
})();
