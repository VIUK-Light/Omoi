// 学校・若者向け（student）のテーマ・深さ・問いの数・個別選択を決める画面。
// 選択内容は question.html のURLパラメータとして渡し、回答は保存しない。
(() => {
    const params = new URLSearchParams(window.location.search);
    const editMode = params.get("edit") === "1";

    const nextButton = document.getElementById("nextButton");
    const quickStartButton = document.getElementById("quickStartButton");
    const themeGroupsElement = document.getElementById("themeGroups");
    const themeSummary = document.getElementById("themeSummary");
    const clearThemesButton = document.getElementById("clearThemes");
    const levelButtons = [...document.querySelectorAll("[data-student-level]")];
    const roleButtons = [...document.querySelectorAll("[data-student-role]")];
    const countButtons = [...document.querySelectorAll("[data-student-count]")];
    const roleStep = document.getElementById("roleStep");
    const settingsStep = document.getElementById("settingsStep");
    const actionBar = document.getElementById("actionBar");
    const backToSelect = document.getElementById("backToSelect");
    const backToRole = document.getElementById("backToRole");
    const avoidHeavyInput = document.getElementById("avoidHeavy");
    const classroomInput = document.getElementById("classroomStart");
    const questionSearch = document.getElementById("questionSearch");
    const questionTopicFilter = document.getElementById("questionTopicFilter");
    const questionPicker = document.getElementById("questionPicker");
    const questionPickerStatus = document.getElementById("questionPickerStatus");
    const selectAllQuestionsButton = document.getElementById("selectAllQuestions");
    const showMoreQuestions = document.getElementById("showMoreQuestions");
    const selectedQuestionsSection = document.getElementById("selectedQuestionsSection");
    const selectedQuestionsStatus = document.getElementById("selectedQuestionsStatus");
    const selectedQuestionList = document.getElementById("selectedQuestionList");
    const clearQuestionsButton = document.getElementById("clearQuestions");
    const togglePickerButton = document.getElementById("togglePicker");
    const pickerBody = document.getElementById("pickerBody");
    const pickerBlock = document.querySelector(".student-picker-block");
    const individualModeNotice = document.getElementById("individualModeNotice");
    const individualModeCount = document.getElementById("individualModeCount");
    const exitIndividualModeButton = document.getElementById("exitIndividualMode");
    const themeSettingsBlock = document.getElementById("themeSettingsBlock");
    const levelSettingsBlock = document.getElementById("levelSettingsBlock");
    const countSettingsBlock = document.getElementById("countSettingsBlock");
    const avoidHeavyToggle = document.getElementById("avoidHeavyToggle");
    const safetyNote = document.getElementById("safetyNote");
    const studentTotal = document.getElementById("studentTotal");
    const studentBreakdown = document.getElementById("studentBreakdown");
    const studentError = document.getElementById("studentError");
    const studentErrorText = document.getElementById("studentErrorText");
    const retryLoadButton = document.getElementById("retryLoadButton");

    const levelNames = {
        2: "低",
        3: "中",
        4: "高"
    };
    const levelDescriptions = {
        2: "意見が分かれる身近な話",
        3: "社会や価値観について",
        4: "人生に関わる難しい選択"
    };
    const pageSize = 30;
    const themeGroupDefinitions = [
        { title: "学校・友達", ids: ["school", "bullying", "friendship"] },
        { title: "家族・恋愛・支え", ids: ["family", "care", "romance"] },
        { title: "お金・仕事・進路", ids: ["money", "work"] },
        { title: "SNS・情報", ids: ["media", "technology", "privacy"] },
        { title: "こころ・体", ids: ["health", "sexuality", "gender", "disability"] },
        { title: "社会・未来", ids: ["politics", "environment", "culture", "ethics", "crime"] },
        { title: "自分", ids: ["values"] }
    ];
    const themeHints = {
        school: "校則・進路など",
        care: "家族や友達を支える",
        media: "SNS・情報との付き合い",
        technology: "AI・ネット"
    };

    let labelsById = new Map();
    let topicLabels = [];
    let questions = [];
    let scenarioById = new Map();
    async function loadScenarios() {
        try {
            const datasets = await Promise.all([2, 3, 4].map(level =>
                fetch(`../../データ/質問/level${level}.json`)
                    .then(response => (response.ok ? response.json() : []))
                    .catch(() => [])
            ));
            for (const dataset of datasets) {
                if (!Array.isArray(dataset)) continue;
                for (const question of dataset) {
                    if (question?.id && (question.scenario || "").trim()) {
                        scenarioById.set(question.id, question.scenario.trim());
                    }
                }
            }
        } catch (error) {
        }
    }
    let indexReady = false;
    let indexError = "";
    let indexPromise = null;
    let kuromojiTokenizer = null;
    let kuromojiLoadingPromise = null;
    let visibleQuestionCount = pageSize;

    const selectedThemes = new Set();
    const selectedLevels = new Set();
    const selectedQuestionIds = new Set();
    let countMode = "10";
    const roleParam = params.get("role");
    let role = roleParam === "teacher" ? "teacher" : (roleParam === "student" ? "student" : "");
    let roleChosen = role === "teacher" || role === "student";
    let avoidHeavy = false;
    let classroom = false;

    function normalizeSearch(value) {
        return String(value ?? "").normalize("NFKC").toLowerCase();
    }

    function katakanaToHiragana(value) {
        return String(value ?? "").replace(/[ァ-ン]/g, char =>
            String.fromCharCode(char.charCodeAt(0) - 0x60)
        );
    }

    function loadKuromoji() {
        if (kuromojiTokenizer) return Promise.resolve(kuromojiTokenizer);
        if (kuromojiLoadingPromise) return kuromojiLoadingPromise;
        if (typeof window === "undefined" || !window.kuromoji) {
            return Promise.resolve(null);
        }
        kuromojiLoadingPromise = new Promise(resolve => {
            try {
                window.kuromoji.builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/" })
                    .build((error, tokenizer) => {
                        if (error || !tokenizer) {
                            kuromojiTokenizer = null;
                            resolve(null);
                            return;
                        }
                        kuromojiTokenizer = tokenizer;
                        resolve(tokenizer);
                    });
            } catch (error) {
                kuromojiTokenizer = null;
                resolve(null);
            }
        });
        return kuromojiLoadingPromise;
    }

    function textToReading(value) {
        const normalized = normalizeSearch(value);
        if (!normalized) return "";
        if (!kuromojiTokenizer) return normalized;
        try {
            const tokens = kuromojiTokenizer.tokenize(String(value ?? ""));
            const reading = tokens
                .map(token => (token.reading && token.reading !== "*" ? token.reading : token.surface_form))
                .join("");
            return normalizeSearch(katakanaToHiragana(reading));
        } catch (error) {
            return normalized;
        }
    }

    function labelName(labelId) {
        return labelsById.get(labelId)?.name ?? labelId;
    }

    function levelHeavyMatch(question) {
        if (selectedLevels.size > 0 && !selectedLevels.has(question.level)) return false;
        if (avoidHeavy && question.sensitivity === 4) return false;
        return true;
    }

    function basePool() {
        return questions.filter(question => {
            if (!levelHeavyMatch(question)) return false;
            if (selectedThemes.size === 0) {
                return question.labels.includes("student");
            }
            return question.labels.some(label => selectedThemes.has(label));
        });
    }

    function themeCount(labelId) {
        return questions.filter(question =>
            question.labels.includes(labelId) && levelHeavyMatch(question)
        ).length;
    }

    function deckQuestions() {
        if (selectedQuestionIds.size > 0) {
            return questions.filter(question => selectedQuestionIds.has(question.id));
        }
        const pool = basePool();
        if (countMode === "all") return pool;
        return pool.slice(0, Number(countMode));
    }

    function filterPickerQuestions() {
        const rawTerm = questionSearch?.value ?? "";
        const term = normalizeSearch(rawTerm);
        const readingTerm = textToReading(rawTerm);
        const topic = questionTopicFilter?.value || "all";

        return questions.filter(question => {
            if (selectedQuestionIds.size === 0 && !levelHeavyMatch(question)) return false;
            if (topic !== "all" && !question.labels.includes(topic)) return false;
            if (!term) return true;
            const haystack = [
                question.question,
                question.reading,
                ...question.labels.map(labelName)
            ].join(" ").normalize("NFKC").toLowerCase();
            if (haystack.includes(term)) return true;
            return Boolean(readingTerm) && normalizeSearch(question.reading).includes(readingTerm);
        });
    }

    function showError(message, canRetry = true) {
        if (!studentError) return;
        studentError.hidden = false;
        if (studentErrorText) studentErrorText.textContent = message;
        if (retryLoadButton) retryLoadButton.hidden = !canRetry;
    }

    function hideError() {
        if (studentError) studentError.hidden = true;
    }

    function setLoadingState() {
        indexReady = false;
        indexError = "";
        if (themeGroupsElement) themeGroupsElement.replaceChildren();
        if (themeSummary) themeSummary.textContent = "読み込み中…";
        if (clearThemesButton) clearThemesButton.hidden = true;
        if (questionPicker) questionPicker.replaceChildren();
        if (questionPickerStatus) {
            questionPickerStatus.textContent = "読み込み中…";
            questionPickerStatus.dataset.empty = "false";
        }
        if (selectAllQuestionsButton) selectAllQuestionsButton.hidden = true;
        if (showMoreQuestions) showMoreQuestions.hidden = true;
        if (selectedQuestionsSection) selectedQuestionsSection.hidden = true;
        if (clearQuestionsButton) clearQuestionsButton.hidden = true;
        if (studentTotal) studentTotal.textContent = "—";
        if (studentBreakdown) studentBreakdown.textContent = "問いを読み込んでいます…";
        if (nextButton) nextButton.disabled = true;
        hideError();
    }

    function groupCount(group) {
        return questions.filter(question =>
            question.labels.some(label => group.ids.includes(label)) && levelHeavyMatch(question)
        ).length;
    }

    function isGroupSelected(group) {
        return group.ids.some(id => selectedThemes.has(id));
    }

    function selectedCategoryCount() {
        return themeGroupDefinitions.filter(group => isGroupSelected(group)).length;
    }

    function renderThemes() {
        if (!themeGroupsElement) return;
        themeGroupsElement.replaceChildren();

        const grid = document.createElement("div");
        grid.className = "label-grid student-category-grid";

        for (const group of themeGroupDefinitions) {
            const labels = group.ids.map(id => labelsById.get(id)).filter(Boolean);
            if (labels.length === 0) continue;

            const count = groupCount(group);
            const selected = isGroupSelected(group);
            const card = document.createElement("label");
            card.className = "label-card student-category-card";

            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = "theme-group";
            input.value = group.title;
            input.dataset.topicIds = group.ids.join(",");
            input.checked = selected;
            input.disabled = count === 0 && !selected;
            input.addEventListener("change", function () {
                if (input.checked) {
                    for (const id of group.ids) selectedThemes.add(id);
                } else {
                    for (const id of group.ids) selectedThemes.delete(id);
                }
                renderThemes();
                updateSelectionUi();
                renderThemeSummary();
            });

            const check = document.createElement("span");
            check.className = "label-check";
            check.setAttribute("aria-hidden", "true");

            const body = document.createElement("span");
            body.className = "label-card-body";

            const name = document.createElement("span");
            name.className = "label-card-name";
            name.textContent = group.title;

            const countElement = document.createElement("small");
            countElement.className = "label-card-count";
            countElement.textContent = `${count}問`;

            const hint = document.createElement("small");
            hint.className = "label-card-hint";
            hint.textContent = labels.map(label => label.name).join("・");

            body.append(name, countElement, hint);
            card.append(input, check, body);
            grid.append(card);
        }

        themeGroupsElement.append(grid);
    }

    function renderThemeSummary() {
        if (!themeSummary) return;
        if (!indexReady) {
            themeSummary.textContent = indexError ? "読み込めませんでした" : "読み込み中…";
            return;
        }
        const selectedCategories = selectedCategoryCount();
        if (selectedCategories > 0) {
            themeSummary.textContent = `${selectedCategories}カテゴリーを選択中・${basePool().length}問`;
            return;
        }
        const count = basePool().length;
        if (selectedLevels.size > 0 || avoidHeavy) {
            themeSummary.textContent = `学校・若者向けから${count}問`;
            return;
        }
        themeSummary.textContent = `学校・若者向けの${count}問から選びます`;
    }

    function renderLevelButtons() {
        for (const button of levelButtons) {
            const value = button.dataset.studentLevel;
            const pressed = value === "all"
                ? selectedLevels.size === 0
                : selectedLevels.has(Number(value));
            button.setAttribute("aria-pressed", String(pressed));
            button.setAttribute("title", value === "all"
                ? "すべての深さ"
                : `level:${levelNames[Number(value)]}｜${levelDescriptions[Number(value)]}`);
        }
    }

    function renderCountButtons() {
        for (const button of countButtons) {
            button.setAttribute("aria-pressed", String(button.dataset.studentCount === countMode));
        }
    }

    function syncRoleUrl() {
        const url = new URL(window.location.href);
        if (roleChosen && role) url.searchParams.set("role", role);
        else url.searchParams.delete("role");
        history.replaceState(null, "", url.toString());
    }

    function showRoleStep() {
        roleChosen = false;
        role = "";
        syncRoleUrl();
        if (roleStep) roleStep.hidden = false;
        if (settingsStep) settingsStep.hidden = true;
        if (actionBar) actionBar.hidden = true;
        if (backToSelect) backToSelect.hidden = false;
        if (backToRole) backToRole.hidden = true;
    }

    function showSettingsStep() {
        if (!role) role = "student";
        roleChosen = true;
        syncRoleUrl();
        if (roleStep) roleStep.hidden = true;
        if (settingsStep) settingsStep.hidden = false;
        if (actionBar) actionBar.hidden = false;
        if (backToSelect) backToSelect.hidden = true;
        if (backToRole) backToRole.hidden = false;
        updatePickerToggle();
        updateSelectionUi();
        renderPicker();
    }

    function setRole(nextRole) {
        if (!indexReady) return;
        role = nextRole === 'teacher' ? 'teacher' : 'student';
        if (role === 'student') {
            selectedQuestionIds.clear();
            if (pickerBlock) pickerBlock.hidden = true;
        } else {
            if (pickerBlock) pickerBlock.hidden = false;
            if (pickerBody) pickerBody.hidden = true;
            if (togglePickerButton) togglePickerButton.textContent = '問いを選ぶ';
        }
        showSettingsStep();
    }

    function updatePickerToggle() {
        if (!pickerBlock) return;
        if (role !== 'teacher') {
            pickerBlock.hidden = true;
            if (togglePickerButton) togglePickerButton.hidden = true;
            return;
        }
        pickerBlock.hidden = false;
        if (togglePickerButton) {
            togglePickerButton.hidden = false;
            if (pickerBody && pickerBody.hidden) {
                const n = selectedQuestionIds.size;
                togglePickerButton.textContent = n > 0 ? `問いを選ぶ（${n}問選択中）` : '問いを選ぶ';
            } else {
                togglePickerButton.textContent = '閉じる';
            }
        }
    }

    function updateIndividualModeUi() {
        const active = selectedQuestionIds.size > 0;
        if (individualModeNotice) individualModeNotice.hidden = !active;
        if (individualModeCount) {
            individualModeCount.textContent = active
                ? `${selectedQuestionIds.size}問を選んでいます。テーマ・深さ・問いの数の設定は使いません。`
                : "";
        }
        for (const element of [
            themeSettingsBlock,
            levelSettingsBlock,
            countSettingsBlock,
            avoidHeavyToggle,
            safetyNote
        ]) {
            if (element) element.hidden = active;
        }
    }

    function updateSelectionUi() {
        renderSelectedQuestions();
        renderSummary();
        updateSelectAllButton();
        updateIndividualModeUi();
        if (clearThemesButton) clearThemesButton.hidden = selectedThemes.size === 0;
        if (clearQuestionsButton) clearQuestionsButton.hidden = selectedQuestionIds.size === 0;
        updatePickerToggle();
    }

    function renderSummary() {
        if (!studentTotal || !studentBreakdown) return;
        if (!indexReady) {
            studentTotal.textContent = "—";
            studentBreakdown.textContent = indexError
                ? "問いを読み込めませんでした"
                : "問いを読み込んでいます…";
            if (nextButton) nextButton.disabled = true;
            return;
        }

        const deck = deckQuestions();
        studentTotal.textContent = `${deck.length}問`;

        if (deck.length === 0 && selectedQuestionIds.size === 0) {
            studentBreakdown.textContent = "テーマを選ぶか、深さ・重い内容の条件を見直してください";
        } else if (selectedQuestionIds.size > 0) {
            studentBreakdown.textContent = `個別に選んだ${selectedQuestionIds.size}問で始めます`;
        } else {
            const pool = basePool();
            const countLabel = countMode === "all"
                ? `全${pool.length}問`
                : `${deck.length}問（${pool.length}問から）`;
            const selectedCategories = selectedCategoryCount();
            const themeLabel = selectedCategories > 0
                ? `${selectedCategories}カテゴリー`
                : "学校・若者向け";
            const levelLabel = selectedLevels.size === 0
                ? "すべての深さ"
                : `level:${[...selectedLevels].sort().map(value => levelNames[value]).join("・")}`;
            const heavyLabel = avoidHeavy ? "・重い内容を除外" : "";
            studentBreakdown.textContent = `${themeLabel}・${levelLabel}・${countLabel}${heavyLabel}`;
        }

        const individualMode = role === "teacher" && selectedQuestionIds.size > 0;
        if (safetyNote) {
            if (individualMode) {
                safetyNote.hidden = true;
            } else {
                safetyNote.hidden = !basePool().some(question => question.sensitivity === 4);
            }
        }
        if (nextButton) nextButton.disabled = deck.length === 0;
    }

    function renderSelectedQuestions() {
        if (!selectedQuestionsSection || !selectedQuestionList) return;

        const selected = questions.filter(question => selectedQuestionIds.has(question.id));
        selectedQuestionsSection.hidden = selected.length === 0;

        if (selectedQuestionsStatus) {
            selectedQuestionsStatus.textContent = selected.length === 0
                ? ""
                : `${selected.length}問を選んでいます。この問いだけで始めます。`;
        }

        selectedQuestionList.replaceChildren();
        for (const question of selected) {
            const item = document.createElement("li");
            item.className = "selected-question-item";

            const text = document.createElement("span");
            text.className = "selected-question-text";
            text.textContent = question.question;
            text.title = question.question;

            const scenarioText = (scenarioById.get(question.id) || "").trim();
            let detailToggle = null;
            let scenario = null;
            if (scenarioText) {
                detailToggle = document.createElement("button");
                detailToggle.type = "button";
                detailToggle.className = "selected-question-detail-toggle";
                detailToggle.textContent = "i";
                detailToggle.setAttribute("aria-label", `「${question.question}」の背景を表示`);
                detailToggle.setAttribute("aria-expanded", "false");

                scenario = document.createElement("p");
                scenario.className = "selected-question-scenario";
                scenario.hidden = true;
                scenario.textContent = scenarioText;

                detailToggle.addEventListener("click", function () {
                    scenario.hidden = !scenario.hidden;
                    detailToggle.setAttribute("aria-expanded", String(!scenario.hidden));
                });
            }

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "selected-question-remove";
            remove.textContent = "×";
            remove.setAttribute("aria-label", `「${question.question}」を選択から外す`);
            remove.addEventListener("click", function () {
                const index = selected.findIndex(value => value.id === question.id);
                setQuestionSelected(question.id, false);
                const nextRemove = selectedQuestionList.children[
                    Math.min(Math.max(index, 0), selectedQuestionList.children.length - 1)
                ]?.querySelector(".selected-question-remove");
                if (nextRemove && typeof nextRemove.focus === "function") {
                    nextRemove.focus();
                } else if (questionSearch && typeof questionSearch.focus === "function") {
                    questionSearch.focus();
                }
            });

            item.append(text);
            if (detailToggle) item.append(detailToggle);
            item.append(remove);
            if (scenario) item.append(scenario);
            selectedQuestionList.append(item);
        }
    }

    function setQuestionSelected(id, isSelected) {
        if (isSelected) selectedQuestionIds.add(id);
        else selectedQuestionIds.delete(id);

        if (questionPicker) {
            const input = [...questionPicker.querySelectorAll('input[type="checkbox"]')]
                .find(element => element.value === id);
            if (input) {
                input.checked = isSelected;
                const item = input.closest(".question-pick");
                if (item) item.dataset.selected = isSelected ? "true" : "false";
            }
        }

        updateSelectionUi();
    }

    function updateSelectAllButton() {
        if (!selectAllQuestionsButton) return;
        const list = filterPickerQuestions();
        if (!indexReady || list.length === 0) {
            selectAllQuestionsButton.hidden = true;
            return;
        }
        selectAllQuestionsButton.hidden = false;
        const allSelected = list.every(question => selectedQuestionIds.has(question.id));
        selectAllQuestionsButton.textContent = allSelected
            ? "表示中の選択をすべて解除"
            : "表示中の問いをすべて選択";
    }

    function renderPicker() {
        if (!questionPicker) return;
        questionPicker.replaceChildren();

        if (!indexReady) {
            if (questionPickerStatus) {
                questionPickerStatus.textContent = indexError
                    ? "問いを読み込めませんでした。"
                    : "読み込み中…";
                questionPickerStatus.dataset.empty = "false";
            }
            if (showMoreQuestions) showMoreQuestions.hidden = true;
            return;
        }

        const list = filterPickerQuestions();
        const shown = list.slice(0, visibleQuestionCount);
        const term = questionSearch?.value?.trim() ?? "";

        if (questionPickerStatus) {
            questionPickerStatus.dataset.empty = String(list.length === 0);
            if (list.length === 0) {
                questionPickerStatus.textContent = term
                    ? `「${term}」に一致する問いがありません。別の言葉で探してみてください。`
                    : "条件に一致する問いがありません。";
            } else if (shown.length >= list.length) {
                questionPickerStatus.textContent = `${list.length}問を表示しています。`;
            } else {
                questionPickerStatus.textContent =
                    `${list.length}問中${shown.length}問を表示しています。`;
            }
        }

        for (const question of shown) {
            const item = document.createElement("li");
            item.className = "question-pick";
            item.dataset.selected = selectedQuestionIds.has(question.id) ? "true" : "false";

            const label = document.createElement("label");
            label.className = "question-pick-label";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = "question";
            checkbox.value = question.id;
            checkbox.checked = selectedQuestionIds.has(question.id);
            checkbox.dataset.questionId = question.id;
            checkbox.addEventListener("change", function () {
                setQuestionSelected(question.id, checkbox.checked);
            });

            const check = document.createElement("span");
            check.className = "question-pick-check";
            check.setAttribute("aria-hidden", "true");

            const text = document.createElement("span");
            text.className = "question-pick-text";

            const meta = document.createElement("span");
            meta.className = "question-pick-meta";

            const levelBadge = document.createElement("span");
            levelBadge.className = "level-badge";
            levelBadge.textContent = `level:${levelNames[question.level] ?? question.level}`;
            meta.append(levelBadge);

            const labels = document.createElement("span");
            labels.className = "question-pick-labels";
            labels.textContent = question.labels
                .filter(value => value !== "student")
                .slice(0, 3)
                .map(labelName)
                .join("・");
            meta.append(labels);

            if (selectedQuestionIds.size === 0 && selectedThemes.size > 0 &&
                question.labels.some(value => selectedThemes.has(value))) {
                const included = document.createElement("span");
                included.className = "question-pick-included";
                included.textContent = "テーマに含む";
                meta.append(included);
            }

            const questionText = document.createElement("span");
            questionText.className = "question-pick-question";
            questionText.textContent = question.question;

            text.append(meta, questionText);
            label.append(checkbox, check, text);
            item.append(label);

            const scenarioText = (scenarioById.get(question.id) || "").trim();
            if (scenarioText) {
                const detail = document.createElement("details");
                detail.className = "question-pick-detail";
                const summary = document.createElement("summary");
                summary.className = "question-pick-detail-summary";
                summary.textContent = "背景を見る";
                detail.append(summary);

                const block = document.createElement("div");
                block.className = "question-detail-block";
                const body = document.createElement("p");
                body.textContent = scenarioText;
                block.append(body);
                detail.append(block);
                item.append(detail);
            }

            questionPicker.append(item);
        }

        if (showMoreQuestions) {
            const remaining = list.length - shown.length;
            showMoreQuestions.hidden = remaining <= 0;
            showMoreQuestions.textContent = remaining > 0
                ? `もっと見る（残り${remaining}問）`
                : "もっと見る";
        }
    }

    function populateTopicFilter() {
        if (!questionTopicFilter) return;
        const previous = questionTopicFilter.value || "all";
        questionTopicFilter.replaceChildren();

        const allOption = document.createElement("option");
        allOption.value = "all";
        allOption.textContent = "すべてのテーマ";
        questionTopicFilter.append(allOption);

        for (const label of topicLabels) {
            const count = questions.filter(question =>
                question.labels.includes(label.id) &&
                (selectedQuestionIds.size > 0 || levelHeavyMatch(question))
            ).length;
            if (count === 0) continue;
            const option = document.createElement("option");
            option.value = label.id;
            option.textContent = `${label.name}（${count}問）`;
            questionTopicFilter.append(option);
        }

        questionTopicFilter.value = topicLabels.some(label => label.id === previous)
            ? previous
            : "all";
    }

    function renderAll() {
        renderThemes();
        renderLevelButtons();
        renderCountButtons();
        populateTopicFilter();
        renderThemeSummary();
        renderPicker();
        updateSelectionUi();
    }

    function restoreEditSettings() {
        if (!editMode || !window.OmoiProgress?.read) return;
        const saved = window.OmoiProgress.read();
        if (!saved || saved.mode !== "student" || saved.version !== 3 || !saved.student) {
            return;
        }
        const settings = saved.student;

        selectedThemes.clear();
        for (const theme of Array.isArray(settings.themes) ? settings.themes : []) {
            if (labelsById.has(theme)) selectedThemes.add(theme);
        }

        selectedLevels.clear();
        for (const level of Array.isArray(settings.levels) ? settings.levels : []) {
            if ([2, 3, 4].includes(level)) selectedLevels.add(level);
        }

        countMode = settings.count === "all"
            ? "all"
            : String(Number.isInteger(settings.count) ? settings.count : 10);
        if (!["5", "10", "20", "all"].includes(countMode)) countMode = "10";

        avoidHeavy = settings.heavy === true;
        classroom = settings.classroom === true;
        if (avoidHeavyInput) avoidHeavyInput.checked = avoidHeavy;
        if (classroomInput) classroomInput.checked = classroom;

        selectedQuestionIds.clear();
        if (settings.source === "selection") {
            const hasCategoryMetadata =
                (Array.isArray(settings.themes) && settings.themes.length > 0) ||
                (Array.isArray(settings.levels) && settings.levels.length > 0) ||
                (settings.count && settings.count !== "all") ||
                settings.heavy === true;
            if (!hasCategoryMetadata) {
                role = "teacher";
                roleChosen = true;
                const validIds = new Set(questions.map(question => question.id));
                for (const id of Array.isArray(saved.ids) ? saved.ids : []) {
                    if (validIds.has(id)) selectedQuestionIds.add(id);
                }
            } else if (!roleChosen) {
                role = "student";
                roleChosen = true;
            }
        } else if (!roleChosen) {
            // 編集で戻ってきた場合は役割選択を省略して設定画面を開く
            role = "student";
            roleChosen = true;
        }
    }

    function restoreFromParams() {
        const hasParams = ["themes", "levels", "count", "heavy", "classroom", "sel", "ids"]
            .some(key => params.has(key));
        if (!hasParams) return;

        selectedThemes.clear();
        selectedLevels.clear();
        selectedQuestionIds.clear();
        countMode = "10";
        avoidHeavy = params.get("heavy") === "1" || params.get("heavy") === "true";
        classroom = params.get("classroom") === "1" || params.get("classroom") === "true";

        const themeValues = (params.get("themes") || "")
            .split(",")
            .map(v => v.trim())
            .filter(v => /^[a-z][a-z_]{0,30}$/.test(v));
        for (const value of themeValues) {
            if (labelsById.has(value)) selectedThemes.add(value);
        }

        const levelValues = (params.get("levels") || "")
            .split(",")
            .map(v => Number(v.trim()))
            .filter(v => [2, 3, 4].includes(v));
        for (const value of levelValues) selectedLevels.add(value);

        const countParam = params.get("count");
        if (countParam === "all" || ["5", "10", "20"].includes(countParam)) {
            countMode = countParam;
        }

        const idValues = (params.get("ids") || "")
            .split(",")
            .map(v => v.trim())
            .filter(v => /^[A-Za-z0-9_-]{1,80}$/.test(v));
        if (idValues.length > 0) {
            selectedQuestionIds.clear();
            const validIds = new Set(questions.map(question => question.id));
            for (const id of idValues) {
                if (validIds.has(id)) selectedQuestionIds.add(id);
            }
            if (selectedQuestionIds.size > 0) {
                role = "teacher";
                roleChosen = true;
            }
        } else if (params.has("sel") && window.OmoiShare) {
            const indices = window.OmoiShare.decodeSharePayload(params.get("sel") || "");
            if (indices.length > 0) {
                selectedQuestionIds.clear();
                for (const index of indices) {
                    const question = questions[index];
                    if (question) selectedQuestionIds.add(question.id);
                }
                if (selectedQuestionIds.size > 0) {
                    role = "teacher";
                    roleChosen = true;
                }
            }
        }

        if (avoidHeavyInput) avoidHeavyInput.checked = avoidHeavy;
        if (classroomInput) classroomInput.checked = classroom;
        if (!role) role = "student";
        roleChosen = true;
    }

    function validateLabelsDocument(documentValue) {
        if (!documentValue || documentValue.version !== 1 ||
            !Array.isArray(documentValue.labels)) {
            throw new Error("Invalid labels document.");
        }
        const map = new Map();
        for (const label of documentValue.labels) {
            if (!label || typeof label.id !== "string" || typeof label.name !== "string" ||
                !["audience", "topic"].includes(label.kind)) {
                throw new Error("Invalid label definition.");
            }
            map.set(label.id, label);
        }
        return map;
    }

    function validateFilterDocument(documentValue, labelMap) {
        if (!documentValue || documentValue.version !== 1 ||
            !Array.isArray(documentValue.questions)) {
            throw new Error("Invalid question filter index.");
        }
        const seenIndices = new Set();
        return documentValue.questions.map(question => {
            if (!question || typeof question.id !== "string" || !question.id.trim() ||
                !Number.isInteger(question.index) || question.index < 0 ||
                !Number.isInteger(question.level) || ![2, 3, 4].includes(question.level) ||
                !Number.isInteger(question.sensitivity) ||
                question.sensitivity < 1 || question.sensitivity > 4 ||
                !Array.isArray(question.labels) || question.labels.length === 0 ||
                question.labels.some(label => !labelMap.has(label)) ||
                typeof question.question !== "string" || !question.question.trim() ||
                typeof question.reading !== "string") {
                throw new Error("Invalid question filter entry.");
            }
            if (seenIndices.has(question.index)) {
                throw new Error("Duplicate question index.");
            }
            seenIndices.add(question.index);
            return {
                index: question.index,
                id: question.id,
                level: question.level,
                sensitivity: question.sensitivity,
                labels: question.labels,
                question: question.question,
                reading: question.reading
            };
        }).sort((left, right) => left.index - right.index);
    }

    async function load() {
        setLoadingState();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const [labelsResponse, filterResponse] = await Promise.all([
                fetch("../../データ/索引/labels.json", { signal: controller.signal }),
                fetch("../../データ/索引/question-filter-index.json", { signal: controller.signal })
            ]);
            if (!labelsResponse.ok || !filterResponse.ok) {
                throw new Error("Labels or question filter request failed.");
            }
            const [labelsDocument, filterDocument] = await Promise.all([
                labelsResponse.json(),
                filterResponse.json()
            ]);

            labelsById = validateLabelsDocument(labelsDocument);
            topicLabels = [...labelsById.values()]
                .filter(label => label.kind === "topic")
                .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
            questions = validateFilterDocument(filterDocument, labelsById);

            loadScenarios();

            const validLabelIds = new Set(topicLabels.map(label => label.id));
            for (const id of [...selectedThemes]) {
                if (!validLabelIds.has(id)) selectedThemes.delete(id);
            }
            const validQuestionIds = new Set(questions.map(question => question.id));
            for (const id of [...selectedQuestionIds]) {
                if (!validQuestionIds.has(id)) selectedQuestionIds.delete(id);
            }

            restoreEditSettings();
            restoreFromParams();

            indexReady = true;
            indexError = "";
            visibleQuestionCount = pageSize;
            if (avoidHeavyInput) avoidHeavyInput.checked = avoidHeavy;
            if (classroomInput) classroomInput.checked = classroom;

            hideError();
            renderAll();
            if (roleChosen) showSettingsStep();
            else showRoleStep();
        } catch (error) {
            console.error("Omoi: 学校・若者向けの設定を読み込めませんでした。", error);
            indexReady = false;
            indexError = controller.signal.aborted
                ? "読み込みに時間がかかっています。接続を確認してください。"
                : "問いを読み込めませんでした。接続を確認してください。";
            if (!controller.signal.aborted) controller.abort();
            showError(indexError, true);
            renderThemeSummary();
            renderSummary();
            renderPicker();
        } finally {
            clearTimeout(timeout);
        }
    }

    function ensureLoad() {
        if (indexReady) return Promise.resolve();
        if (!indexPromise) {
            indexPromise = load().catch(() => {
                indexPromise = null;
            });
        }
        return indexPromise;
    }

    function redirect(url) {
        window.location.href = url.toString();
    }

    function buildStartUrl() {
        const isTeacher = role === "teacher";
        const url = new URL(isTeacher ? "student-preview.html" : "../対話/question.html", window.location.href);
        url.search = "";
        url.searchParams.set("mode", "student");
        if (isTeacher) url.searchParams.set("role", role);

        if (selectedQuestionIds.size > 0) {
            const selectedQuestions = questions.filter(question => selectedQuestionIds.has(question.id));
            const payload = window.OmoiShare?.encodeSharePayload(
                selectedQuestions.map(question => question.index)
            );
            if (!payload) {
                showError("選んだ問いをURLにまとめられませんでした。選び直してください。", false);
                return null;
            }
            url.searchParams.set("sel", payload);
        } else {
            if (selectedThemes.size > 0) {
                const order = new Map(topicLabels.map((label, index) => [label.id, index]));
                url.searchParams.set(
                    "themes",
                    [...selectedThemes]
                        .sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0))
                        .join(",")
                );
            }
            if (selectedLevels.size > 0) {
                url.searchParams.set(
                    "levels",
                    [...selectedLevels].sort((left, right) => left - right).join(",")
                );
            }
            if (countMode !== "all") {
                url.searchParams.set("count", countMode);
            }
            if (avoidHeavy) {
                url.searchParams.set("heavy", "1");
            }
        }

        if (classroom) {
            url.searchParams.set("classroom", "1");
        }
        return url;
    }

    levelButtons.forEach(button => {
        button.addEventListener("click", function () {
            if (!indexReady) return;
            const value = button.dataset.studentLevel;
            if (value === "all") {
                selectedLevels.clear();
            } else {
                const level = Number(value);
                if (selectedLevels.has(level)) selectedLevels.delete(level);
                else selectedLevels.add(level);
            }
            renderLevelButtons();
            renderThemes();
            populateTopicFilter();
            renderPicker();
            renderThemeSummary();
            updateSelectionUi();
        });
    });

    countButtons.forEach(button => {
        button.addEventListener("click", function () {
            if (!indexReady) return;
            countMode = button.dataset.studentCount || "10";
            renderCountButtons();
            renderSummary();
        });
    });

    if (avoidHeavyInput) {
        avoidHeavyInput.addEventListener("change", function () {
            avoidHeavy = avoidHeavyInput.checked;
            renderThemes();
            populateTopicFilter();
            renderPicker();
            renderThemeSummary();
            updateSelectionUi();
        });
    }

    if (classroomInput) {
        classroomInput.addEventListener("change", function () {
            classroom = classroomInput.checked;
            if (classroom && avoidHeavyInput && !avoidHeavyInput.checked) {
                avoidHeavyInput.checked = true;
                avoidHeavy = true;
                renderThemes();
                populateTopicFilter();
                renderPicker();
                renderThemeSummary();
                updateSelectionUi();
            }
        });
    }

    if (questionSearch) {
        questionSearch.addEventListener("input", function () {
            visibleQuestionCount = pageSize;
            renderPicker();
            updateSelectAllButton();
        });
        questionSearch.addEventListener("search", function () {
            visibleQuestionCount = pageSize;
            renderPicker();
            updateSelectAllButton();
        });
        questionSearch.addEventListener("focus", function () {
            loadKuromoji().then(function (tokenizer) {
                if (tokenizer) renderPicker();
            });
        });
    }

    if (questionTopicFilter) {
        questionTopicFilter.addEventListener("change", function () {
            visibleQuestionCount = pageSize;
            renderPicker();
            updateSelectAllButton();
        });
    }

    if (selectAllQuestionsButton) {
        selectAllQuestionsButton.addEventListener("click", function () {
            const list = filterPickerQuestions();
            if (list.length === 0) return;
            const allSelected = list.every(question => selectedQuestionIds.has(question.id));
            for (const question of list) {
                if (allSelected) selectedQuestionIds.delete(question.id);
                else selectedQuestionIds.add(question.id);
            }
            renderPicker();
            updateSelectionUi();
        });
    }

    if (showMoreQuestions) {
        showMoreQuestions.addEventListener("click", function () {
            visibleQuestionCount += pageSize;
            renderPicker();
        });
    }

    if (clearThemesButton) {
        clearThemesButton.addEventListener("click", function () {
            if (selectedThemes.size === 0) return;
            selectedThemes.clear();
            renderThemes();
            renderThemeSummary();
            updateSelectionUi();
            const firstCheckbox = themeGroupsElement?.querySelector('input[type="checkbox"]');
            if (firstCheckbox && typeof firstCheckbox.focus === "function") {
                firstCheckbox.focus();
            }
        });
    }

    if (clearQuestionsButton) {
        clearQuestionsButton.addEventListener("click", function () {
            if (selectedQuestionIds.size === 0) return;
            selectedQuestionIds.clear();
            renderPicker();
            updateSelectionUi();
            if (questionSearch && typeof questionSearch.focus === "function") {
                questionSearch.focus();
            }
        });
    }

    if (exitIndividualModeButton) {
        exitIndividualModeButton.addEventListener("click", function () {
            if (selectedQuestionIds.size === 0) return;
            selectedQuestionIds.clear();
            renderPicker();
            updateSelectionUi();
            const firstTheme = themeGroupsElement?.querySelector('input[name="theme-group"]');
            if (firstTheme && typeof firstTheme.focus === "function") {
                firstTheme.focus();
            }
        });
    }

    if (togglePickerButton) {
        togglePickerButton.addEventListener("click", function () {
            if (role !== 'teacher' || !pickerBody) return;
            pickerBody.hidden = !pickerBody.hidden;
            updatePickerToggle();
        });
    }

    roleButtons.forEach(button => {
        button.addEventListener("click", function () {
            const next = button.dataset.studentRole || 'student';
            role = next === 'teacher' ? 'teacher' : 'student';
            if (role === 'student') {
                selectedQuestionIds.clear();
                if (pickerBlock) pickerBlock.hidden = true;
            } else if (pickerBlock) {
                pickerBlock.hidden = false;
                if (pickerBody) pickerBody.hidden = true;
            }
            showSettingsStep();
            if (!indexReady) ensureLoad();
        });
    });

    if (backToRole) {
        backToRole.addEventListener("click", function () {
            showRoleStep();
            const first = roleStep?.querySelector('[data-student-role]');
            if (first && typeof first.focus === "function") first.focus();
        });
    }

    if (retryLoadButton) {
        retryLoadButton.addEventListener("click", function () {
            if (indexPromise) return;
            ensureLoad();
        });
    }

    if (nextButton) {
        nextButton.addEventListener("click", function () {
            if (nextButton.disabled || !indexReady) return;
            const url = buildStartUrl();
            if (url) redirect(url);
        });
    }

    if (quickStartButton) {
        quickStartButton.addEventListener("click", function () {
            const url = new URL("../対話/question.html", window.location.href);
            url.search = "";
            url.searchParams.set("mode", "student");
            if (classroom) url.searchParams.set("classroom", "1");
            redirect(url);
        });
    }

    if (roleChosen) {
        if (roleStep) roleStep.hidden = true;
        if (settingsStep) settingsStep.hidden = false;
        if (actionBar) actionBar.hidden = false;
        if (backToSelect) backToSelect.hidden = true;
        if (backToRole) backToRole.hidden = false;
    } else {
        if (roleStep) roleStep.hidden = false;
        if (settingsStep) settingsStep.hidden = true;
        if (actionBar) actionBar.hidden = true;
        if (backToSelect) backToSelect.hidden = false;
        if (backToRole) backToRole.hidden = true;
    }
    setLoadingState();
    ensureLoad();
    // E2E がクリック可能になるタイミングを判定できるよう、初期化完了を記録する。
    document.documentElement.dataset.studentSelectReady = "true";
})();
