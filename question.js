const params = new URLSearchParams(window.location.search);
const allowedLevels = new Set(["2", "3", "4"]);
const allowedModes = new Set(["student", "all", "custom"]);

const levelParameters = params.getAll("level");
const hasLevelParameter = params.has("level");
const level = levelParameters.length === 1 ? Number(levelParameters[0]) : NaN;
const hasValidLevelParameter = levelParameters.length === 1 &&
    allowedLevels.has(levelParameters[0]);

const modeParameters = params.getAll("mode");
const hasModeParameter = params.has("mode");
const modeFromUrl = modeParameters.length === 1 ? modeParameters[0] : null;
const isModeMalformed = hasModeParameter &&
    (modeParameters.length !== 1 || !allowedModes.has(modeFromUrl));
const mode = isModeMalformed
    ? null
    : (modeFromUrl ?? (hasValidLevelParameter ? "all" : null));

const sharedIdValues = params.getAll("id");
const hasSharedId = params.has("id");
const sharedId = sharedIdValues.length === 1 ? sharedIdValues[0] : null;
const isSharedIdMalformed = hasSharedId &&
    (sharedIdValues.length !== 1 || sharedId.trim() === "");



// 進行中のセッションは、URLのtokenと端末の保存データが揃ったときだけ再開する。
const sessionTokenValues = params.getAll("session");
const sessionTokenFromUrl = sessionTokenValues.length === 1
    ? sessionTokenValues[0]
    : null;
const hasSessionToken = typeof sessionTokenFromUrl === "string" &&
    /^[A-Za-z0-9_-]{6,64}$/.test(sessionTokenFromUrl);

const sharedLabelsParam = params.get("labels");
const sharedIdsParam = params.get("ids");
const sharedSelParam = params.get("sel");
const sharedCustomSelection = !hasSessionToken && mode === "custom" &&
    (sharedLabelsParam || sharedIdsParam || sharedSelParam)
    ? {
        labels: sharedLabelsParam ? sharedLabelsParam.split(",").map(v => v.trim()).filter(Boolean) : [],
        ids: sharedIdsParam ? sharedIdsParam.split(",").map(v => v.trim()).filter(Boolean) : [],
        sel: sharedSelParam || null
    }
    : null;

const isRequestValid = !isModeMalformed &&
    allowedModes.has(mode) &&
    (mode !== "all" || hasValidLevelParameter) &&
    (mode === "all" || !hasLevelParameter) &&
    !(hasSharedId && mode !== "all");

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
            .map(levelValue => Number(levelValue.trim()))
            .filter(levelValue => [2, 3, 4].includes(levelValue))
    )].sort((left, right) => left - right);
}

function parseCountParameter(value) {
    if (value === "all") return "all";
    if (typeof value !== "string" || !/^[0-9]{1,3}$/.test(value)) return null;
    const count = Number(value);
    return count >= 1 && count <= 200 ? count : null;
}

const studentThemes = mode === "student"
    ? parseThemeParameter(params.get("themes"))
    : [];
const studentLevels = mode === "student"
    ? parseLevelsParameter(params.get("levels"))
    : [];
const parsedStudentCount = mode === "student"
    ? parseCountParameter(params.get("count"))
    : null;
const studentHeavy = mode === "student" &&
    (params.get("heavy") === "1" || params.get("heavy") === "true");
const classroomFromUrl = params.get("classroom") === "1" ||
    params.get("classroom") === "true";
function parseIdList(value) {
    if (typeof value !== "string" || value.trim() === "") return [];
    return [...new Set(
        value.split(",")
            .map(id => id.trim())
            .filter(id => /^[A-Za-z0-9_-]{1,80}$/.test(id))
    )].slice(0, 200);
}

const studentSelectionIds = mode === "student"
    ? parseIdList(params.get("ids"))
    : [];
const hasStudentSelection = mode === "student" && (params.has("sel") || studentSelectionIds.length > 0);
const studentSelectionIndices = !studentSelectionIds.length && hasStudentSelection && window.OmoiShare
    ? window.OmoiShare.decodeSharePayload(params.get("sel") ?? "")
    : [];
const studentSource = hasStudentSelection
    ? "selection"
    : (studentThemes.length > 0 ? "themes" : "default");

function savedProgressMode(saved) {
    return saved?.version === 1 ? "all" : saved?.mode;
}

function readSavedProgress() {
    if (!hasSessionToken || !window.OmoiProgress) return null;
    const saved = window.OmoiProgress.read();
    if (!saved || saved.token !== sessionTokenFromUrl) return null;
    if (savedProgressMode(saved) !== mode) return null;
    if (mode === "all" && saved.level !== level) return null;
    return saved;
}

const savedProgress = readSavedProgress();
const savedStudentSettings = savedProgress?.version === 3 &&
    savedProgress.mode === "student" && savedProgress.student
    ? savedProgress.student
    : null;
const pendingSelection = !savedProgress && mode === "custom" && hasSessionToken
    ? window.OmoiProgress?.readSelection(sessionTokenFromUrl) ?? null
    : null;
const hasSharedCustomSelection = Boolean(sharedCustomSelection);
let sessionToken = savedProgress
    ? savedProgress.token
    : pendingSelection
        ? pendingSelection.token
        : null;
let sessionCustomLabels = [];
let sessionCustomIds = [];
let sessionCustomExcluded = [];
// 保存データが無いときは、別端末で開いた共有リンクとして扱う。
let isSharedQuestion = hasSharedId && mode === "all" &&
    !savedProgress && !pendingSelection;

const questionText = document.getElementById("questionText");
const scenarioBlock = document.getElementById("scenarioBlock");
const scenarioText = document.getElementById("scenarioText");
const furiganaSettings = document.querySelector(".furigana-settings");
const furiganaSettingsSummary = document.getElementById("furiganaSettingsSummary");
const questionScreen = document.querySelector(".question-screen");
const changeCategoryLink = document.getElementById("changeCategoryLink");
const otherQuestionsLink = document.getElementById("otherQuestionsLink");
const sharedQuestionNotice = document.getElementById("sharedQuestionNotice");
const classroomModeButton = document.getElementById("classroomModeButton");
const questionProgress = document.getElementById("questionProgress");
const fullscreenButton = document.getElementById("fullscreenButton");
const nextNote = document.getElementById("nextNote");
const shareButton = document.getElementById("shareButton");
const speakButton = document.getElementById("speakButton");
const voiceControl = document.getElementById("voiceControl");
const voiceSelect = document.getElementById("voiceSelect");
const questionLive = document.getElementById("questionLive");
const shareControl = document.getElementById("shareControl");
const shareMenu = document.getElementById("shareMenu");
const shareUrlButton = document.getElementById("shareUrlButton");
const shareImageButton = document.getElementById("shareImageButton");
const printQuestionButton = document.getElementById("printQuestionButton");
const shareStatus = document.getElementById("shareStatus");
const textSizeControl = document.getElementById("textSizeControl");
const textSizeButtons = [
    { size: "small", element: document.getElementById("smallTextToggle") },
    { size: "medium", element: document.getElementById("mediumTextToggle") },
    { size: "large", element: document.getElementById("largeTextToggle") }
];
const classroomModeToggle = document.getElementById("classroomModeToggle");
const questionSummaryToggle = document.getElementById("questionSummaryToggle");
const furiganaToggle = document.getElementById("furiganaToggle");
const questionSummary = document.getElementById("questionSummary");
const questionSummaryText = document.getElementById("questionSummaryText");
let currentSummary = null;
const questionContent =
    document.querySelector(".question-content");
const sourceSection =
    document.getElementById("sourceSection");

const sourceList =
    document.getElementById("sourceList");
const hintButton = document.getElementById("hintButton");
const hintsPanel = document.getElementById("hintsPanel");
const hintsList = document.getElementById("hintsList");
const termsSection = document.getElementById("termsSection");
const termsList = document.getElementById("termsList");
const nextQuestionButton =
    document.getElementById("nextQuestionButton");
const nextQuestionLabel =
    document.getElementById("nextQuestionLabel");

const finishButton =
    document.getElementById("finishButton");

const sessionComplete =
    document.getElementById("sessionComplete");
const sessionCompleteTitle =
    document.getElementById("sessionCompleteTitle");
const sessionCompleteMessage =
    document.getElementById("sessionCompleteMessage");
const restartSessionButton =
    document.getElementById("restartSessionButton");
const completeSettingsLink =
    document.getElementById("completeSettingsLink");

const printSheet =
    document.getElementById("printSheet");
const printSheetLevel =
    document.getElementById("printSheetLevel");
const printSheetLevelNote =
    document.getElementById("printSheetLevelNote");
const printSheetScenarioBlock =
    document.getElementById("printSheetScenarioBlock");
const printSheetScenario =
    document.getElementById("printSheetScenario");
const printSheetQuestion =
    document.getElementById("printSheetQuestion");

const finishConfirmDialog =
    document.getElementById("finishConfirmDialog");

const cancelFinishButton =
    document.getElementById("cancelFinishButton");

const confirmFinishButton =
    document.getElementById("confirmFinishButton");

const previousQuestionButton =
    document.getElementById("previousQuestionButton");

const detailButton =
    document.getElementById("detailButton");

const detailButtonLabel =
    document.getElementById("detailButtonLabel");

const detailPanel =
    document.getElementById("detailPanel");

const detailText =
    document.getElementById("detailText");


let sessionQuestions = [];
let currentQuestionIndex = 0;
if (sessionComplete) sessionComplete.hidden = true;
let readingsByQuestionId = {};
let currentFurigana = {};
let currentTextFields = new Map();
let furiganaEnabled = false;
let textSize = "medium";
let classroomModeEnabled = mode === "student" && (savedProgress
    ? savedProgress.classroom === true || savedStudentSettings?.classroom === true
    : classroomFromUrl);
let sessionStudentSettings = savedStudentSettings
    ? {
        themes: [...savedStudentSettings.themes],
        levels: [...savedStudentSettings.levels],
        count: savedStudentSettings.count,
        heavy: savedStudentSettings.heavy,
        classroom: classroomModeEnabled,
        source: savedStudentSettings.source
    }
    : {
        themes: [...studentThemes],
        levels: [...studentLevels],
        count: parsedStudentCount ?? "all",
        heavy: studentHeavy,
        classroom: classroomModeEnabled,
        source: studentSource
    };

const retryLoadButton = document.getElementById("retryLoadButton");
let state = "idle";

function setState(nextState) {
    state = nextState;
    nextQuestionButton.disabled = state !== "ready";
    shareButton.disabled = state !== "ready";
    finishButton.disabled = state !== "ready";
    previousQuestionButton.disabled =
        state !== "ready" || currentQuestionIndex === 0;
    questionContent.setAttribute("aria-busy", String(state === "loading"));
    retryLoadButton.hidden = state !== "error";
    if (classroomModeButton) {
        classroomModeButton.disabled = state !== "ready";
    }
    updateQuestionProgress();
    updateNextQuestionLabel();
}

function applySharedMode() {
    questionScreen.classList.toggle("shared-question", isSharedQuestion);
    sharedQuestionNotice.hidden = !isSharedQuestion;
    nextQuestionButton.hidden = isSharedQuestion;
    previousQuestionButton.hidden = isSharedQuestion;
    nextNote.hidden = isSharedQuestion;
    changeCategoryLink.hidden = isSharedQuestion;
    otherQuestionsLink.hidden = !isSharedQuestion;
    if (!isSharedQuestion && mode === "custom") {
        changeCategoryLink.href = "custom-select.html?edit=1";
        changeCategoryLink.textContent = "← 選択を編集する";
    }
    if (!isSharedQuestion && mode === "student") {
        changeCategoryLink.href = "student-select.html?edit=1";
        changeCategoryLink.textContent = "← 設定を変える";
    }
    if (completeSettingsLink) {
        completeSettingsLink.href = mode === "student"
            ? "student-select.html?edit=1"
            : mode === "custom"
                ? "custom-select.html?edit=1"
                : "select.html";
    }

    finishButton.hidden = isSharedQuestion;
    classroomModeToggle.hidden = isSharedQuestion || mode !== "student";
    classroomModeButton.hidden = isSharedQuestion || mode !== "student";
    fullscreenButton.hidden = isSharedQuestion || mode !== "student";
    if (mode !== "student") {
        questionProgress.hidden = true;
    }
}

function showMessage(message) {
    questionText.textContent = message;
    scenarioText.textContent = "";
    questionText.removeAttribute("data-furigana-path");
    scenarioText.removeAttribute("data-furigana-path");
    currentTextFields.clear();
    currentFurigana = {};
    furiganaSettings.hidden = true;
    textSizeControl.hidden = true;
    classroomModeToggle.hidden = true;
    classroomModeButton.hidden = true;
    fullscreenButton.hidden = true;
    questionProgress.hidden = true;
    furiganaToggle.hidden = true;
    if (speakButton) speakButton.hidden = true;
    if (voiceControl) voiceControl.hidden = true;
    if (printSheet) {
        printSheetQuestion.textContent = "";
        printSheetScenario.textContent = "";
        printSheetScenarioBlock.hidden = true;
        printSheetLevel.textContent = "";
        printSheetLevelNote.textContent = "";
    }
    scenarioBlock.setAttribute("aria-hidden", "true");
    updateQuestionLayout({ question: message });
    currentSummary = null;
    questionSummaryToggle.hidden = true;
    setQuestionSummaryOpen(false);
    hintButton.hidden = true;
    setHintsPanelOpen(false);
    detailButton.hidden = true;
    setDetailPanelOpen(false);
    shareButton.hidden = true;
    shareButton.disabled = true;
    setShareMenuOpen(false);
    shareStatus.textContent = "";
}

function validateQuestions(questions, expectedLevel) {
    if (!Array.isArray(questions)) {
        throw new Error("Question data must be an array.");
    }
    const questionIds = new Set();
    for (const question of questions) {
        if (!question || question.level !== expectedLevel ||
            typeof question.id !== "string" || !question.id.trim() ||
            typeof question.question !== "string" || !question.question.trim()) {
            throw new Error("Invalid question or mismatched level in question data.");
        }
        if (question.labels !== undefined &&
            (!Array.isArray(question.labels) || question.labels.length === 0 ||
                question.labels.some(label => typeof label !== "string" || !label.trim()))) {
            throw new Error("Invalid question labels.");
        }
        if (questionIds.has(question.id)) {
            throw new Error("Duplicate question id.");
        }
        questionIds.add(question.id);
        if (question.scenario !== undefined && typeof question.scenario !== "string") {
            throw new Error("Invalid question scenario.");
        }
        validateSummary(question.summary);
        if (question.hints !== undefined &&
            (!Array.isArray(question.hints) || question.hints.length === 0 ||
                question.hints.some(hint => typeof hint !== "string" || !hint.trim()))) {
            throw new Error("Invalid question hints.");
        }
        if (question.terms !== undefined &&
            (!Array.isArray(question.terms) || question.terms.length === 0 ||
                question.terms.some(term => !term ||
                    typeof term.term !== "string" || !term.term.trim() ||
                    typeof term.definition !== "string" || !term.definition.trim()))) {
            throw new Error("Invalid question terms.");
        }
        if (question.detail !== undefined) {
            const detail = question.detail;
            if (!detail || typeof detail !== "object" || Array.isArray(detail) ||
                typeof detail.text !== "string" || !detail.text.trim()) {
                throw new Error("Invalid question detail.");
            }
            for (const source of detail.sources ?? []) {
                if (!source || typeof source.title !== "string" || !source.title.trim() ||
                    typeof source.url !== "string" || !/^https?:$/.test(new URL(source.url).protocol)) {
                    throw new Error("Invalid question source.");
                }
            }
        }
    }
}

function getVisibleTextFields(question) {
    const fields = { question: question.question };
    const scenario = question.scenario?.trim() ?? "";
    if (scenario) fields.scenario = scenario;

    if (question.level === 3 || question.level === 4) {
        for (const [blockIndex, block] of (question.summary ?? []).entries()) {
            if (block.type === "text") {
                fields[`summary.${blockIndex}.text`] = block.text;
            } else {
                for (const [itemIndex, item] of block.items.entries()) {
                    if (item.label !== undefined) {
                        fields[`summary.${blockIndex}.items.${itemIndex}.label`] = item.label;
                    }
                    fields[`summary.${blockIndex}.items.${itemIndex}.text`] = item.text;
                }
            }
        }

        for (const [index, hint] of (question.hints ?? []).entries()) {
            fields[`hints.${index}`] = hint;
        }
        const detailText = question.detail?.text?.trim() ?? "";
        if (detailText) fields["detail.text"] = detailText;
        for (const [index, term] of (question.terms ?? []).entries()) {
            fields[`terms.${index}.term`] = term.term;
            fields[`terms.${index}.definition`] = term.definition;
        }
        for (const [index, source] of (question.detail?.sources ?? []).entries()) {
            fields[`detail.sources.${index}.title`] = source.title;
        }
    }
    return fields;
}

function validateFurigana(questions, readings) {
    if (!readings || typeof readings !== "object" || Array.isArray(readings)) {
        throw new Error("Invalid furigana data.");
    }

    const questionIds = new Set(questions.map(question => question.id));
    for (const [questionId, fields] of Object.entries(readings)) {
        if (!questionIds.has(questionId) || !fields ||
            typeof fields !== "object" || Array.isArray(fields)) {
            throw new Error("Invalid furigana question entry.");
        }
    }

    const containsKanji = value => /\p{Script=Han}/u.test(value);
    for (const question of questions) {
        const fields = getVisibleTextFields(question);
        const readingsForQuestion = readings[question.id];
        if (!readingsForQuestion || !Array.isArray(readingsForQuestion.question)) {
            throw new Error(`Missing question furigana: ${question.id}`);
        }
        for (const [fieldPath, segments] of Object.entries(readingsForQuestion)) {
            const source = fields[fieldPath];
            if (typeof source !== "string" || !Array.isArray(segments) || segments.length === 0) {
                throw new Error(`Invalid furigana field: ${question.id}.${fieldPath}`);
            }

            let reconstructed = "";
            for (const segment of segments) {
                if (!segment || typeof segment !== "object" || Array.isArray(segment)) {
                    throw new Error(`Invalid furigana segment: ${question.id}.${fieldPath}`);
                }
                if (typeof segment.text === "string" &&
                    Object.keys(segment).length === 1) {
                    if (containsKanji(segment.text)) {
                        throw new Error(`Unannotated kanji: ${question.id}.${fieldPath}`);
                    }
                    reconstructed += segment.text;
                } else if (typeof segment.ruby === "string" &&
                    typeof segment.reading === "string" &&
                    Object.keys(segment).length === 2 &&
                    containsKanji(segment.ruby) &&
                    /^[\u3041-\u3096\u309D-\u309F\u30FC・]+$/u.test(segment.reading)) {
                    reconstructed += segment.ruby;
                } else {
                    throw new Error(`Invalid ruby segment: ${question.id}.${fieldPath}`);
                }
            }
            if (reconstructed !== source) {
                throw new Error(`Furigana text does not match source: ${question.id}.${fieldPath}`);
            }
        }

        for (const [fieldPath, source] of Object.entries(fields)) {
            if (containsKanji(source) &&
                !Object.hasOwn(readingsForQuestion, fieldPath)) {
                throw new Error(`Missing furigana: ${question.id}.${fieldPath}`);
            }
        }
    }
}

function validateSummary(summary) {
    if (summary === undefined) return;
    if (!Array.isArray(summary) || summary.length === 0) {
        throw new Error("Invalid question summary.");
    }
    const nonEmpty = value => typeof value === "string" && value.trim() !== "";
    for (const block of summary) {
        if (!block || typeof block !== "object" || Array.isArray(block)) {
            throw new Error("Invalid question summary block.");
        }
        if (block.type === "text") {
            if (!nonEmpty(block.text)) throw new Error("Invalid summary text.");
        } else if (block.type === "bullets") {
            if (!Array.isArray(block.items) || block.items.length === 0 ||
                block.items.some(item => !item || !nonEmpty(item.text) ||
                    (item.label !== undefined && !nonEmpty(item.label)))) {
                throw new Error("Invalid summary bullets.");
            }
        } else {
            throw new Error("Unsupported question summary format.");
        }
    }
}

function drawFuriganaText(element, text, fieldPath, suffix = "") {
    const segments = currentFurigana[fieldPath];
    if (!furiganaEnabled || !segments) {
        element.textContent = text + suffix;
        return;
    }

    element.replaceChildren();
    for (const segment of segments) {
        if (typeof segment.text === "string") {
            element.appendChild(document.createTextNode(segment.text));
        } else {
            const ruby = document.createElement("ruby");
            ruby.appendChild(document.createTextNode(segment.ruby));
            const reading = document.createElement("rt");
            reading.textContent = segment.reading;
            ruby.appendChild(reading);
            element.appendChild(ruby);
        }
    }
    if (suffix) element.appendChild(document.createTextNode(suffix));
}

function renderFuriganaText(element, text, fieldPath, suffix = "") {
    element.dataset.furiganaPath = fieldPath;
    element.dataset.furiganaSuffix = suffix;
    currentTextFields.set(fieldPath, text);
    drawFuriganaText(element, text, fieldPath, suffix);
}

function refreshFuriganaText() {
    document.querySelectorAll("[data-furigana-path]").forEach(element => {
        const fieldPath = element.dataset.furiganaPath;
        const text = currentTextFields.get(fieldPath);
        if (text !== undefined) {
            drawFuriganaText(element, text, fieldPath, element.dataset.furiganaSuffix);
        }
    });
}

function setQuestionSummaryOpen(isOpen) {
    isOpen = Boolean(isOpen && state === "ready" && currentSummary);
    if (isOpen) {
        setHintsPanelOpen(false);
        setDetailPanelOpen(false);
    }
    questionSummaryText.innerHTML = "";
    if (isOpen) {
        for (const [blockIndex, block] of currentSummary.entries()) {
            if (block.type === "text") {
                const paragraph = document.createElement("p");
                renderFuriganaText(
                    paragraph,
                    block.text,
                    `summary.${blockIndex}.text`
                );
                questionSummaryText.appendChild(paragraph);
            } else {
                const list = document.createElement("ul");
                list.className = "summary-bullets";
                for (const [itemIndex, item] of block.items.entries()) {
                    const entry = document.createElement("li");
                    if (item.label !== undefined) {
                        const label = document.createElement("strong");
                        renderFuriganaText(
                            label,
                            item.label,
                            `summary.${blockIndex}.items.${itemIndex}.label`,
                            "："
                        );
                        const text = document.createElement("span");
                        renderFuriganaText(
                            text,
                            item.text,
                            `summary.${blockIndex}.items.${itemIndex}.text`
                        );
                        entry.appendChild(label);
                        entry.appendChild(text);
                    } else {
                        renderFuriganaText(
                            entry,
                            item.text,
                            `summary.${blockIndex}.items.${itemIndex}.text`
                        );
                    }
                    list.appendChild(entry);
                }
                questionSummaryText.appendChild(list);
            }
        }
    }
    questionSummary.hidden = !isOpen;
    questionSummaryToggle.setAttribute("aria-expanded", String(isOpen));
    questionSummaryToggle.textContent = isOpen ? "要点を閉じる" : "問いの要点を見る";
}

async function loadLevelDataset(levelValue, signal) {
    const [response, furiganaResponse] = await Promise.all([
        fetch("level" + levelValue + ".json", { signal }),
        fetch("level" + levelValue + "-furigana.json", { signal })
    ]);
    if (!response.ok || !furiganaResponse.ok) {
        throw new Error("Question or furigana request failed.");
    }
    const [questions, furigana] = await Promise.all([
        response.json(),
        furiganaResponse.json()
    ]);
    validateQuestions(questions, levelValue);
    validateFurigana(questions, furigana);
    return { questions, furigana };
}

function levelsForSession() {
    if (mode === "all") return [level];
    if (mode === "student") {
        if (hasStudentSelection || sessionStudentSettings.source === "selection") {
            return [2, 3, 4];
        }
        if (sessionStudentSettings.levels.length > 0) {
            return [...sessionStudentSettings.levels].sort((left, right) => left - right);
        }
    }
    return [2, 3, 4];
}

function studentPool(questions) {
    if (hasStudentSelection) {
        const seen = new Set();
        const selected = [];
        if (studentSelectionIds.length > 0) {
            const byId = new Map(questions.map(question => [question.id, question]));
            for (const id of studentSelectionIds) {
                const question = byId.get(id);
                if (!question || seen.has(question.id)) continue;
                seen.add(question.id);
                selected.push(question);
            }
            return selected;
        }
        for (const index of studentSelectionIndices) {
            const question = questions[index];
            if (!question || seen.has(question.id)) continue;
            seen.add(question.id);
            selected.push(question);
        }
        return selected;
    }

    const themeSet = new Set(sessionStudentSettings.themes);
    const levelSet = new Set(sessionStudentSettings.levels);
    return questions.filter(question => {
        if (!Array.isArray(question.labels)) return false;
        if (themeSet.size > 0) {
            if (!question.labels.some(label => themeSet.has(label))) return false;
        } else if (!question.labels.includes("student")) {
            return false;
        }
        if (levelSet.size > 0 && !levelSet.has(question.level)) return false;
        if (sessionStudentSettings.heavy && question.sensitivity === 4) return false;
        return true;
    });
}

function customPool(questions, labels, ids, excluded) {
    const labelSet = new Set(Array.isArray(labels) ? labels : []);
    const idSet = new Set(Array.isArray(ids) ? ids : []);
    const excludedSet = new Set(Array.isArray(excluded) ? excluded : []);
    return questions.filter(question =>
        idSet.has(question.id) || (
            !excludedSet.has(question.id) &&
            Array.isArray(question.labels) &&
            question.labels.some(label => labelSet.has(label))
        ));
}

function fallbackPoolForSavedProgress(questions, saved) {
    const savedMode = savedProgressMode(saved);
    if (savedMode === "student") return studentPool(questions);
    if (savedMode === "custom") {
        sessionCustomLabels = Array.isArray(saved.labels) ? saved.labels : [];
        sessionCustomIds = Array.isArray(saved.selectedIds) ? saved.selectedIds : [];
        sessionCustomExcluded = Array.isArray(saved.excludedIds) ? saved.excludedIds : [];
        return customPool(questions, sessionCustomLabels, sessionCustomIds, sessionCustomExcluded);
    }
    return questions;
}

async function loadQuestions() {
    if (state === "loading" || isSharedIdMalformed || !isRequestValid) return;
    if (mode === "custom" && !savedProgress && !pendingSelection && !sharedCustomSelection) {
        showMessage("選んだ内容が見つかりませんでした。条件を選び直してください。");
        setState("invalid");
        return;
    }
    setState("loading");
    showMessage("読み込み中...");
    sessionQuestions = [];
    currentQuestionIndex = 0;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const datasets = await Promise.all(
            levelsForSession().map(levelValue =>
                loadLevelDataset(levelValue, controller.signal))
        );
        const allQuestions = [];
        readingsByQuestionId = {};
        for (const dataset of datasets) {
            allQuestions.push(...dataset.questions);
            Object.assign(readingsByQuestionId, dataset.furigana);
        }
        if (allQuestions.length === 0) {
            showMessage("この条件の質問はまだありません。条件を選び直してください。");
            setState("empty");
            return;
        }
        const byId = new Map(allQuestions.map(question => [question.id, question]));
        if (isSharedQuestion) {
            const target = byId.get(sharedId);
            if (!target) {
                showMessage("指定された問いが見つかりませんでした。共有リンクが古いか、URLが正しくない可能性があります。「他の質問をする」から選び直してください。");
                setState("invalid");
                return;
            }
            sessionQuestions = [target];
        } else if (savedProgress) {
            // 前回の並び順と位置を復元する。消えたIDは除く。
            const ordered = savedProgress.ids
                .map(id => byId.get(id))
                .filter(Boolean);
            if (ordered.length > 0) {
                sessionQuestions = ordered;
                const currentId = savedProgress.ids[savedProgress.index];
                const restoredIndex = ordered.findIndex(question => question.id === currentId);
                currentQuestionIndex = restoredIndex >= 0 ? restoredIndex : 0;
                if (savedProgress.version !== 1 && savedProgress.mode === "custom") {
                    sessionCustomLabels = Array.isArray(savedProgress.labels) ? savedProgress.labels : [];
                    sessionCustomIds = Array.isArray(savedProgress.selectedIds) ? savedProgress.selectedIds : [];
                }
            } else {
                const fallback = fallbackPoolForSavedProgress(allQuestions, savedProgress);
                if (fallback.length === 0) {
                    showMessage("前回の続きを復元できませんでした。条件を選び直してください。");
                    setState("empty");
                    return;
                }
                const savedStudentSource = savedProgress.version === 3 &&
                    savedProgress.mode === "student"
                    ? savedProgress.student?.source
                    : null;
                const savedStudentCount = savedProgress.version === 3 &&
                    savedProgress.mode === "student"
                    ? savedProgress.student?.count
                    : null;
                startNewSession(fallback, {
                    shuffle: savedStudentSource !== "selection",
                    limit: savedStudentSource === "selection" ||
                        savedStudentCount === null ||
                        savedStudentCount === "all"
                        ? undefined
                        : savedStudentCount
                });
            }
        } else if (mode === "student") {
            const hasIdsParam = studentSelectionIds.length > 0;
            const hasSelParam = params.has("sel");
            if (hasSelParam && !hasIdsParam && studentSelectionIndices.length === 0) {
                showMessage("共有された問いの形式が正しくありません。URLを確認するか、設定から選び直してください。");
                setState("invalid");
                return;
            }
            if (hasIdsParam && studentSelectionIds.length === 0) {
                showMessage("共有された問いの形式が正しくありません。URLを確認するか、設定から選び直してください。");
                setState("invalid");
                return;
            }
            const pool = studentPool(allQuestions);
            if (pool.length === 0) {
                showMessage(hasStudentSelection
                    ? "選んだ問いが見つかりませんでした。設定から選び直してください。"
                    : "この条件に合う学校・若者向けの問いはありません。テーマや深さを変えてください。");
                setState("empty");
                return;
            }
            startNewSession(pool, {
                shuffle: sessionStudentSettings.source !== "selection",
                limit: sessionStudentSettings.source === "selection" ||
                    sessionStudentSettings.count === "all"
                    ? undefined
                    : sessionStudentSettings.count
            });
        } else if (mode === "custom") {
            if (pendingSelection) {
                sessionCustomLabels = Array.isArray(pendingSelection.labels) ? pendingSelection.labels : [];
                sessionCustomIds = Array.isArray(pendingSelection.ids) ? pendingSelection.ids : [];
                sessionCustomExcluded = Array.isArray(pendingSelection.excludedIds) ? pendingSelection.excludedIds : [];
            } else if (sharedCustomSelection) {
                sessionCustomLabels = sharedCustomSelection.labels || [];
                sessionCustomIds = sharedCustomSelection.ids || [];
                sessionCustomExcluded = [];
                if (sharedCustomSelection.sel && window.OmoiShare) {
                    const indices = window.OmoiShare.decodeSharePayload(sharedCustomSelection.sel);
                    const idByIndex = new Map(allQuestions.map((q, i) => [i, q.id]));
                    const decodedIds = indices.map(i => idByIndex.get(i)).filter(Boolean);
                    if (decodedIds.length > 0) {
                        sessionCustomIds = decodedIds;
                        sessionCustomLabels = [];
                    }
                }
            } else {
                sessionCustomLabels = [];
                sessionCustomIds = [];
                sessionCustomExcluded = [];
            }
            const pool = customPool(allQuestions, sessionCustomLabels, sessionCustomIds, sessionCustomExcluded);
            if (pool.length === 0) {
                showMessage("選んだカテゴリーや問いに合う質問がありません。条件を選び直してください。");
                setState("empty");
                return;
            }
            startNewSession(pool, { newToken: false });
            window.OmoiProgress?.clearSelection();
        } else {
            startNewSession(allQuestions);
        }
        showQuestion();
        setState("ready");
    } catch (error) {
        const timedOut = controller.signal.aborted;
        console.error("Omoi: 質問の読み込みに失敗しました。", error);
        if (!timedOut) controller.abort();
        showMessage(timedOut
            ? "読み込みに時間がかかっています。接続を確認して再試行してください。"
            : "質問を読み込めませんでした。接続を確認して再試行してください。");
        setState("error");
    } finally {
        clearTimeout(timeout);
    }
}

retryLoadButton.addEventListener("click", loadQuestions);
applySharedMode();
if (!isRequestValid) {
    setState("invalid");
    showMessage("質問の条件が正しくありません。「選び直す」から選び直してください。");
} else if (isSharedIdMalformed) {
    setState("invalid");
    showMessage("共有リンクの形式が正しくありません。URLを確認するか、「他の質問をする」から選び直してください。");
} else {
    loadQuestions();
}


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {

        const j =
            Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] =
            [array[j], array[i]];
    }
}


function startNewSession(questions, options = {}) {
    if (options.shuffle !== false) {
        shuffle(questions);
    }
    const limit = Number.isInteger(options.limit) && options.limit > 0
        ? options.limit
        : questions.length;
    sessionQuestions = questions.slice(0, limit);
    currentQuestionIndex = 0;
    if (options.newToken !== false || !sessionToken) {
        sessionToken = window.OmoiProgress
            ? window.OmoiProgress.createToken()
            : null;
    }
}


function saveProgress() {
    if (isSharedQuestion || !sessionToken ||
        !window.OmoiProgress || sessionQuestions.length === 0) return;
    const data = {
        version: mode === "student" ? 3 : 2,
        token: sessionToken,
        mode,
        ids: sessionQuestions.map(question => question.id),
        index: currentQuestionIndex,
        updatedAt: Date.now(),
        classroom: classroomModeEnabled
    };
    if (mode === "all") {
        data.level = level;
    }
    if (mode === "custom") {
        data.labels = [...sessionCustomLabels];
        data.selectedIds = [...sessionCustomIds];
        data.excludedIds = [...sessionCustomExcluded];
    }
    if (mode === "student") {
        sessionStudentSettings.classroom = classroomModeEnabled;
        data.student = {
            themes: [...sessionStudentSettings.themes],
            levels: [...sessionStudentSettings.levels],
            count: sessionStudentSettings.count,
            heavy: sessionStudentSettings.heavy,
            classroom: classroomModeEnabled,
            source: sessionStudentSettings.source
        };
    }
    window.OmoiProgress.write(data);
}

const voiceStorageKey = "omoi-speech-voice";
let speechUtterance = null;
let voiceWaitHandler = null;
let voiceWaitTimer = null;

function readSavedVoiceURI() {
    try {
        return window.localStorage?.getItem(voiceStorageKey) || "";
    } catch (error) {
        return "";
    }
}

function saveVoiceURI(value) {
    try {
        if (value) {
            window.localStorage.setItem(voiceStorageKey, value);
        } else {
            window.localStorage.removeItem(voiceStorageKey);
        }
    } catch (error) {
        // 保存できない環境でも読み上げ自体は使える。
    }
}

function getJapaneseVoices() {
    if (typeof window === "undefined" || !window.speechSynthesis?.getVoices) {
        return [];
    }
    try {
        return window.speechSynthesis.getVoices()
            .filter(voice => voice && /^ja/i.test(voice.lang || ""));
    } catch (error) {
        return [];
    }
}

// 端末に入っている日本語音声を、聞き取りやすい順に並べる。
function scoreJapaneseVoice(voice) {
    if (!voice || !/^ja/i.test(voice.lang || "")) return -1000;
    const name = `${voice.name || ""} ${voice.voiceURI || ""}`;
    let score = 0;
    if (/^ja[-_]JP$/i.test(voice.lang || "")) score += 30;
    if (/Google.*(日本語|Japanese)/i.test(name)) score += 100;
    if (/(Microsoft|Windows).*(Nanami|Keita|Mayu|Daichi|Naoki|Shiori)/i.test(name)) score += 95;
    if (/Natural|Neural/i.test(name)) score += 80;
    if (/Enhanced|Premium/i.test(name)) score += 70;
    if (/Kyoko/i.test(name)) score += 50;
    if (/O-Ren|Otoya|Hattori/i.test(name)) score += 45;
    if (/compact/i.test(name)) score -= 30;
    if (voice.localService === false) score += 5;
    return score;
}

function chooseJapaneseVoice(voices, preferredURI) {
    const japanese = (Array.isArray(voices) ? voices : [])
        .filter(voice => voice && /^ja/i.test(voice.lang || ""));
    if (japanese.length === 0) return null;
    if (preferredURI) {
        const preferred = japanese.find(voice =>
            voice.voiceURI === preferredURI || voice.name === preferredURI);
        if (preferred) return preferred;
    }
    return japanese
        .slice()
        .sort((left, right) => scoreJapaneseVoice(right) - scoreJapaneseVoice(left))[0];
}

function voiceQualityLabel(voice) {
    const name = `${voice?.name || ""} ${voice?.voiceURI || ""}`;
    return /Google|Natural|Neural|Enhanced|Premium/i.test(name) ? "（高音質）" : "";
}

function refreshVoiceOptions() {
    if (!voiceControl || !voiceSelect ||
        typeof window === "undefined" || !window.speechSynthesis) {
        if (voiceControl) voiceControl.hidden = true;
        return;
    }
    const voices = getJapaneseVoices()
        .slice()
        .sort((left, right) => scoreJapaneseVoice(right) - scoreJapaneseVoice(left));
    if (isSharedQuestion || voices.length < 2) {
        voiceControl.hidden = true;
        return;
    }

    const preferred = voiceSelect.value || readSavedVoiceURI();
    voiceSelect.replaceChildren();

    const autoOption = document.createElement("option");
    autoOption.value = "";
    autoOption.textContent = "自動（高音質を優先）";
    voiceSelect.appendChild(autoOption);

    voices.forEach(voice => {
        const option = document.createElement("option");
        option.value = voice.voiceURI || voice.name || "";
        option.textContent = `${voice.name || "日本語の声"}${voiceQualityLabel(voice)}`;
        voiceSelect.appendChild(option);
    });

    const hasPreferred = voices.some(voice =>
        (voice.voiceURI || voice.name) === preferred);
    voiceSelect.value = hasPreferred ? preferred : "";
    voiceControl.hidden = false;
}

function cancelVoiceWait() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (voiceWaitHandler && window.speechSynthesis.removeEventListener) {
        window.speechSynthesis.removeEventListener("voiceschanged", voiceWaitHandler);
    }
    voiceWaitHandler = null;
    if (voiceWaitTimer !== null) {
        clearTimeout(voiceWaitTimer);
        voiceWaitTimer = null;
    }
}

function stopSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    cancelVoiceWait();
    window.speechSynthesis.cancel();
    speechUtterance = null;
    if (speakButton) {
        speakButton.setAttribute("aria-pressed", "false");
        speakButton.textContent = "読み上げ";
    }
}

function speakCurrentQuestion() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const question = sessionQuestions[currentQuestionIndex];
    if (!question) return;

    const begin = () => {
        cancelVoiceWait();
        window.speechSynthesis.cancel();
        const parts = [];
        if (question.scenario && question.scenario.trim()) parts.push(question.scenario.trim());
        parts.push(question.question);
        const utterance = new SpeechSynthesisUtterance(parts.join("。"));
        utterance.lang = "ja-JP";
        utterance.rate = 0.95;
        utterance.pitch = 1;
        const preferred = voiceSelect?.value || readSavedVoiceURI();
        const jaVoice = chooseJapaneseVoice(getJapaneseVoices(), preferred);
        if (jaVoice) utterance.voice = jaVoice;
        utterance.onend = () => { stopSpeech(); };
        utterance.onerror = () => { stopSpeech(); };
        speechUtterance = utterance;
        if (speakButton) {
            speakButton.setAttribute("aria-pressed", "true");
            speakButton.textContent = "停止";
        }
        window.speechSynthesis.speak(utterance);
    };

    // Chromeなどは初回に音声一覧が空のことがあるため、読み込みを少し待つ。
    if (getJapaneseVoices().length === 0 &&
        typeof window.speechSynthesis.addEventListener === "function") {
        cancelVoiceWait();
        if (speakButton) {
            speakButton.setAttribute("aria-pressed", "true");
            speakButton.textContent = "準備中";
        }
        voiceWaitHandler = () => begin();
        window.speechSynthesis.addEventListener("voiceschanged", voiceWaitHandler);
        voiceWaitTimer = setTimeout(() => begin(), 800);
        return;
    }

    begin();
}

function toggleSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (window.speechSynthesis.speaking ||
        window.speechSynthesis.pending ||
        voiceWaitHandler) {
        stopSpeech();
    } else {
        speakCurrentQuestion();
    }
}

if (speakButton) {
    speakButton.addEventListener("click", function () {
        if (state !== "ready") return;
        toggleSpeech();
    });
}

if (voiceSelect) {
    voiceSelect.addEventListener("change", function () {
        saveVoiceURI(voiceSelect.value);
        if (window.speechSynthesis &&
            (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
            stopSpeech();
            speakCurrentQuestion();
        }
    });
}

if (typeof window !== "undefined" && window.speechSynthesis?.addEventListener) {
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoiceOptions);
}
refreshVoiceOptions();

window.addEventListener("beforeunload", stopSpeech);
document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopSpeech();
});

function updateNextQuestionLabel() {
    if (!nextQuestionLabel) return;
    const isLast = state === "ready" &&
        sessionQuestions.length > 0 &&
        currentQuestionIndex === sessionQuestions.length - 1;
    nextQuestionLabel.textContent = isLast
        ? "すべての問いを終える"
        : "次の問いを見る";
}

function updatePrintSheet(question) {
    if (!printSheet || !question) return;
    printSheetQuestion.textContent = question.question || "";
    printSheetQuestion.classList.toggle(
        "long",
        (question.question || "").length > 80
    );
    const scenario = question.scenario?.trim() ?? "";
    printSheetScenario.textContent = scenario;
    printSheetScenarioBlock.hidden = scenario === "";
    printSheetLevel.textContent = question.level
        ? `level:${levelNames[question.level] ?? ""}`
        : "";
    printSheetLevelNote.textContent = levelDescriptions[question.level] ?? "";
}

function completeSession() {
    stopSpeech();
    setQuestionSummaryOpen(false);
    setHintsPanelOpen(false);
    setDetailPanelOpen(false);
    setShareMenuOpen(false);
    window.OmoiProgress?.clear();
    setState("completed");
    questionScreen.classList.add("session-complete-mode");
    document.body?.classList.add("session-complete-active");
    if (sessionComplete) sessionComplete.hidden = false;
    if (sessionCompleteMessage) {
        const total = sessionQuestions.length;
        sessionCompleteMessage.textContent = total > 0
            ? `${total}問を終えました。ここまで話したことを、またいつでも思い出せます。`
            : "すべての問いを終えました。";
    }
    if (questionLive) questionLive.textContent = "すべての問いが終わりました";
    // 再読み込みで共有質問扱いにならないよう、セッション情報をURLから外す。
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete("id");
        url.searchParams.delete("session");
        window.history?.replaceState(null, "", url.href);
    } catch (error) {
        // 履歴APIが使えない環境ではURLを変えない。
    }
    if (sessionCompleteTitle && typeof sessionCompleteTitle.focus === "function") {
        sessionCompleteTitle.focus();
    }
}

function restartSession() {
    if (sessionQuestions.length === 0) return;
    if (sessionComplete) sessionComplete.hidden = true;
    questionScreen.classList.remove("session-complete-mode");
    document.body?.classList.remove("session-complete-active");
    currentQuestionIndex = 0;
    sessionToken = window.OmoiProgress
        ? window.OmoiProgress.createToken()
        : sessionToken;
    setState("ready");
    showQuestion();
}

function showQuestion() {
    stopSpeech();
    const currentQuestion =
        sessionQuestions[currentQuestionIndex];

    currentFurigana = readingsByQuestionId[currentQuestion.id];
    currentTextFields = new Map();
    furiganaToggle.hidden = Object.keys(currentFurigana).length === 0;
    textSizeControl.hidden = false;
    classroomModeToggle.hidden = isSharedQuestion || mode !== "student";
    classroomModeButton.hidden = isSharedQuestion || mode !== "student";
    if (speakButton) speakButton.hidden = isSharedQuestion || typeof window.speechSynthesis === "undefined";
    furiganaSettings.hidden = false;
    updateDisplayModes();
    furiganaToggle.setAttribute("aria-pressed", String(furiganaEnabled));
    furiganaToggle.textContent = furiganaEnabled ? "ふりがなを隠す" : "ふりがなを表示";
    renderFuriganaText(questionText, currentQuestion.question, "question");

    const scenario = currentQuestion.scenario?.trim() ?? "";
    renderFuriganaText(scenarioText, scenario, "scenario");
    scenarioBlock.setAttribute("aria-hidden", String(scenario === ""));

    updateQuestionLayout(currentQuestion);

    // 前の質問の状態をリセット
    setQuestionSummaryOpen(false);
    const supportsHelpers = currentQuestion.level === 3 || currentQuestion.level === 4;
    currentSummary = supportsHelpers ? currentQuestion.summary ?? null : null;
    questionSummaryToggle.hidden = !currentSummary;
    hintButton.hidden = true;
    setHintsPanelOpen(false);
    hintsList.innerHTML = "";
    detailButton.hidden = true;
    setDetailPanelOpen(false);
    sourceSection.hidden = true;
    termsSection.hidden = true;
    previousQuestionButton.disabled = currentQuestionIndex === 0;

    detailText.textContent = "";
    sourceList.innerHTML = "";
    termsList.innerHTML = "";

    const hints = supportsHelpers ? currentQuestion.hints ?? [] : [];
    if (hints.length > 0) {
        hintButton.hidden = false;
        hints.forEach(function (hint, index) {
            const listItem = document.createElement("li");
            renderFuriganaText(listItem, hint, `hints.${index}`);
            hintsList.appendChild(listItem);
        });
    }

    const detail = supportsHelpers ? currentQuestion.detail : undefined;
    const detailValue = detail?.text?.trim() ?? "";
    const sources = detail?.sources ?? [];
    const terms = supportsHelpers ? currentQuestion.terms ?? [] : [];
    if (detailValue !== "" || sources.length > 0 || terms.length > 0) {
        detailButton.hidden = false;
        if (detailValue) {
            renderFuriganaText(detailText, detailValue, "detail.text");
        }

        termsSection.hidden = terms.length === 0;
        terms.forEach(function (term, index) {
            const name = document.createElement("dt");
            renderFuriganaText(name, term.term, `terms.${index}.term`);
            const definition = document.createElement("dd");
            renderFuriganaText(definition, term.definition, `terms.${index}.definition`);
            termsList.appendChild(name);
            termsList.appendChild(definition);
        });

        // 出典がある場合だけ表示
        if (sources.length > 0) {
            sourceSection.hidden = false;

            sources.forEach(function (source, index) {
                const listItem =
                    document.createElement("li");

                const link =
                    document.createElement("a");

                renderFuriganaText(link, source.title, `detail.sources.${index}.title`);

                link.href =
                    source.url;

                link.target =
                    "_blank";

                link.rel =
                    "noopener noreferrer";

                listItem.appendChild(link);
                sourceList.appendChild(listItem);
            });
        }
    }

    shareButton.hidden = !currentQuestion.id;
    shareButton.disabled = false;
    shareStatus.textContent = "";
    if (questionLive && sessionQuestions.length > 0) {
        questionLive.textContent = `${currentQuestionIndex + 1}問目 / ${sessionQuestions.length}問`;
    }
    refreshVoiceOptions();
    updatePrintSheet(currentQuestion);
    updateNextQuestionLabel();
    saveProgress();
    syncUrlWithCurrentQuestion(currentQuestion);
    if (!isSharedQuestion && typeof questionText?.focus === "function") {
        questionText.focus({ preventScroll: false });
    }
}


function syncUrlWithCurrentQuestion(question) {
    if (!question?.id) return;
    if (hasSharedCustomSelection) return;
    const url = new URL(window.location.href);
    url.search = "";
    if (!isSharedQuestion) {
        url.searchParams.set("mode", mode);
    }
    if (isSharedQuestion || mode === "all") {
        url.searchParams.set("level", String(isSharedQuestion ? question.level : level));
        url.searchParams.set("id", question.id);
    }
    if (!isSharedQuestion && sessionToken) {
        url.searchParams.set("session", sessionToken);
    }
    if (!isSharedQuestion && mode === "student") {
        if (sessionStudentSettings.source === "selection" && hasStudentSelection) {
            if (studentSelectionIds.length > 0) {
                url.searchParams.set("ids", studentSelectionIds.join(","));
            } else if (params.get("sel")) {
                url.searchParams.set("sel", params.get("sel"));
            }
            if (sessionStudentSettings.themes.length > 0) {
                url.searchParams.set("themes", sessionStudentSettings.themes.join(","));
            }
            if (sessionStudentSettings.levels.length > 0) {
                url.searchParams.set("levels", sessionStudentSettings.levels.join(","));
            }
            if (sessionStudentSettings.count !== "all") {
                url.searchParams.set("count", String(sessionStudentSettings.count));
            }
            if (sessionStudentSettings.heavy) {
                url.searchParams.set("heavy", "1");
            }
        } else if (sessionStudentSettings.source !== "selection") {
            if (sessionStudentSettings.themes.length > 0) {
                url.searchParams.set("themes", sessionStudentSettings.themes.join(","));
            }
            if (sessionStudentSettings.levels.length > 0) {
                url.searchParams.set("levels", sessionStudentSettings.levels.join(","));
            }
            if (sessionStudentSettings.count !== "all") {
                url.searchParams.set("count", String(sessionStudentSettings.count));
            }
            if (sessionStudentSettings.heavy) {
                url.searchParams.set("heavy", "1");
            }
        }
        if (classroomModeEnabled) {
            url.searchParams.set("classroom", "1");
        }
    }
    try {
        window.history?.replaceState(null, "", url.href);
    } catch (error) {
        // 履歴APIが使えない環境ではURL同期をしない
    }
}


function buildShareUrl(question) {
    const url = new URL("question.html", window.location.href);
    url.search = "";
    url.searchParams.set("level", String(question.level));
    url.searchParams.set("id", question.id);
    return url.href;
}


const cardWidth = 1080;
const cardHeight = 1620;
const cardPadding = 84;

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

function readCardColors() {
    const fallback = {
        page: "#ffffff",
        ink: "#111111",
        muted: "#666666",
        accent: "#24566b",
        scrim: "rgb(255 255 255)",
        scrimOpacity: 0
    };
    if (typeof getComputedStyle !== "function") {
        return fallback;
    }
    const styles = getComputedStyle(document.documentElement);
    const read = (name, defaultValue) => {
        const value = styles.getPropertyValue(name).trim();
        return value || defaultValue;
    };
    const opacity = Number.parseFloat(read("--omoi-scrim-opacity", "0"));
    return {
        page: read("--omoi-page", fallback.page),
        ink: read("--omoi-ink", fallback.ink),
        muted: read("--omoi-muted", fallback.muted),
        accent: read("--omoi-link", fallback.accent),
        scrim: read("--omoi-scrim-color", fallback.scrim),
        scrimOpacity: Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 0
    };
}


function readCardBackgroundImage() {
    if (typeof getComputedStyle !== "function") {
        return "";
    }
    const layer = document.querySelector(".page-background");
    if (!layer) {
        return "";
    }
    const image = getComputedStyle(layer).backgroundImage;
    if (!image || image === "none") {
        return "";
    }
    return image;
}


function escapeSvgAttribute(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// CSSのグラデーションを解析せず、そのまま画像として描画するためSVGへ埋め込む。
async function drawCardBackground(context, image) {
    if (!image || typeof Image !== "function") {
        return false;
    }
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}"`,
        ` viewBox="0 0 ${cardWidth} ${cardHeight}">`,
        `<foreignObject x="0" y="0" width="${cardWidth}" height="${cardHeight}">`,
        `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${cardWidth}px;height:${cardHeight}px;`,
        `background:${escapeSvgAttribute(image)};"></div>`,
        `</foreignObject></svg>`
    ].join("");
    const picture = new Image();
    picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    try {
        await picture.decode();
    } catch (error) {
        return false;
    }
    try {
        context.drawImage(picture, 0, 0, cardWidth, cardHeight);
    } catch (error) {
        return false;
    }
    return true;
}


// 行頭に置かない文字と、行末に置かない文字（簡易的な禁則処理）。
const noLineStart = "、。，．！？!?ー〜」』】）〕｝〉》…‥・：；ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ";
const noLineEnd = "「『【（〔｛〈《";

function wrapCardText(context, text, maxWidth) {
    const lines = [];
    for (const paragraph of String(text ?? "").split("\n")) {
        if (paragraph === "") {
            lines.push("");
            continue;
        }
        let current = "";
        for (const character of paragraph) {
            const candidate = current + character;
            if (current && context.measureText(candidate).width > maxWidth) {
                if (noLineStart.includes(character)) {
                    // 句読点などは行頭に送らず、行に含める。
                    lines.push(candidate);
                    current = "";
                } else if (noLineEnd.includes(current[current.length - 1])) {
                    // 開き括弧は行末に残さず、次の行へ送る。
                    const tail = current.slice(-1);
                    lines.push(current.slice(0, -1));
                    current = tail + character;
                } else {
                    lines.push(current);
                    current = character;
                }
            } else {
                current = candidate;
            }
        }
        if (current) {
            lines.push(current);
        }
    }
    return lines;
}


function drawCardLines(context, lines, options) {
    const shown = lines.slice(0, options.maxLines);
    if (lines.length > options.maxLines && shown.length > 0) {
        shown[shown.length - 1] = `${shown[shown.length - 1].slice(0, -1)}…`;
    }
    shown.forEach((line, index) => {
        context.fillText(line, options.x, options.y + index * options.lineHeight);
    });
    return shown.length * options.lineHeight;
}


async function createQuestionCard(question) {
    const canvas = document.createElement("canvas");
    canvas.width = cardWidth;
    canvas.height = cardHeight;
    const context = canvas.getContext ? canvas.getContext("2d") : null;
    if (!context) {
        return null;
    }

    const colors = readCardColors();
    const contentWidth = cardWidth - cardPadding * 2;
    const headerRuleY = 248;
    const footerRuleY = cardHeight - 152;

    context.textBaseline = "top";
    context.textAlign = "left";
    context.fillStyle = colors.page;
    context.fillRect(0, 0, cardWidth, cardHeight);

    // 背景は画面の選択と同じグラデーションを、指定された濃さのまま重ねる。
    const painted = await drawCardBackground(context, readCardBackgroundImage());
    if (painted && colors.scrimOpacity > 0) {
        context.globalAlpha = colors.scrimOpacity;
        context.fillStyle = colors.scrim;
        context.fillRect(0, 0, cardWidth, cardHeight);
        context.globalAlpha = 1;
    }

    // 見出し（左：ロゴ、右：level）
    context.fillStyle = colors.ink;
    context.font = "700 52px sans-serif";
    if ("letterSpacing" in context) {
        context.letterSpacing = "2px";
    }
    context.fillText("Omoi", cardPadding, cardPadding);
    if ("letterSpacing" in context) {
        context.letterSpacing = "0px";
    }

    context.textAlign = "right";
    context.fillStyle = colors.accent;
    context.font = "600 23px sans-serif";
    if ("letterSpacing" in context) {
        context.letterSpacing = "2px";
    }
    context.fillText(`level:${levelNames[question.level]}`, cardWidth - cardPadding, cardPadding + 2);
    if ("letterSpacing" in context) {
        context.letterSpacing = "0px";
    }
    context.fillStyle = colors.muted;
    context.font = "400 21px sans-serif";
    const levelDescription = levelDescriptions[question.level];
    if (levelDescription) {
        context.fillText(levelDescription, cardWidth - cardPadding, cardPadding + 40);
    }
    context.textAlign = "left";

    // 見出しの罫線
    context.globalAlpha = 0.18;
    context.fillStyle = colors.ink;
    context.fillRect(cardPadding, headerRuleY, contentWidth, 1.5);
    context.globalAlpha = 1;

    // 本文の高さを測る。入りきらないときは問いを少しずつ小さくし、
    // それでも入らなければ場面の行数を減らす。
    const scenarioLineHeight = 58;
    const scenarioLabelHeight = 44;
    const scenarioGap = 64;
    const questionSizes = [92, 86, 80, 74, 68];
    const bodyZoneHeight = footerRuleY - headerRuleY;
    const bodyAvailable = bodyZoneHeight - 64 - 48;

    let scenarioLines = [];
    if (question.scenario) {
        context.font = "400 34px sans-serif";
        scenarioLines = wrapCardText(context, question.scenario, contentWidth - 34);
    }

    let questionLines = [];
    let questionFontSize = 0;
    let questionLineHeight = 0;
    let scenarioLineLimit = 0;
    let questionLineLimit = 0;
    let bodyHeight = 0;

    fit: for (const scenarioLimit of [5, 4, 3, 2]) {
        for (const size of questionSizes) {
            const lineHeight = Math.round(size * 1.32);
            context.font = `700 ${size}px sans-serif`;
            const wrapped = wrapCardText(context, question.question, contentWidth);
            const shownScenario = scenarioLines.length > 0
                ? Math.min(scenarioLines.length, scenarioLimit)
                : 0;
            const scenarioHeight = shownScenario > 0
                ? scenarioLabelHeight + shownScenario * scenarioLineHeight
                : 0;
            const shownQuestion = Math.min(wrapped.length, 6);
            const total = scenarioHeight +
                (scenarioHeight > 0 ? scenarioGap : 0) +
                shownQuestion * lineHeight;
            if (wrapped.length <= 6 && total <= bodyAvailable) {
                questionLines = wrapped;
                questionFontSize = size;
                questionLineHeight = lineHeight;
                scenarioLineLimit = shownScenario;
                questionLineLimit = shownQuestion;
                bodyHeight = total;
                break fit;
            }
        }
    }

    if (bodyHeight === 0) {
        // 極端に長いときは最小の大きさで先頭から表示する。
        questionFontSize = questionSizes[questionSizes.length - 1];
        questionLineHeight = Math.round(questionFontSize * 1.32);
        context.font = `700 ${questionFontSize}px sans-serif`;
        questionLines = wrapCardText(context, question.question, contentWidth);
        scenarioLineLimit = Math.min(scenarioLines.length, 2);
        questionLineLimit = Math.min(questionLines.length, 6);
        const scenarioHeight = scenarioLineLimit > 0
            ? scenarioLabelHeight + scenarioLineLimit * scenarioLineHeight
            : 0;
        bodyHeight = scenarioHeight +
            (scenarioHeight > 0 ? scenarioGap : 0) +
            questionLineLimit * questionLineHeight;
    }

    let y = headerRuleY + Math.max(64, (bodyZoneHeight - bodyHeight) / 2);

    // 場面（左の細い罫線つき）
    if (scenarioLineLimit > 0) {
        const ruleTop = y + 4;
        const ruleHeight = scenarioLabelHeight + scenarioLineLimit * scenarioLineHeight;
        context.globalAlpha = 0.5;
        context.fillStyle = colors.accent;
        context.fillRect(cardPadding, ruleTop, 3, ruleHeight);
        context.globalAlpha = 1;

        const textX = cardPadding + 34;
        context.fillStyle = colors.muted;
        context.font = "600 21px sans-serif";
        if ("letterSpacing" in context) {
            context.letterSpacing = "1px";
        }
        context.fillText("こんな場面を想像してください", textX, y + 4);
        if ("letterSpacing" in context) {
            context.letterSpacing = "0px";
        }

        context.font = "400 34px sans-serif";
        drawCardLines(context, scenarioLines, {
            x: textX,
            y: y + scenarioLabelHeight,
            lineHeight: scenarioLineHeight,
            maxLines: scenarioLineLimit
        });
        y += scenarioLabelHeight + scenarioLineLimit * scenarioLineHeight + scenarioGap;
    }

    // 問い
    context.fillStyle = colors.ink;
    context.font = `700 ${questionFontSize}px sans-serif`;
    drawCardLines(context, questionLines, {
        x: cardPadding,
        y,
        lineHeight: questionLineHeight,
        maxLines: questionLineLimit
    });

    // フッターの罫線とURL
    context.globalAlpha = 0.18;
    context.fillStyle = colors.ink;
    context.fillRect(cardPadding, footerRuleY, contentWidth, 1.5);
    context.globalAlpha = 1;

    context.fillStyle = colors.muted;
    context.font = "400 22px sans-serif";
    context.fillText("omoi.viuk-light.org", cardPadding, footerRuleY + 30);

    context.textAlign = "right";
    context.font = "400 20px sans-serif";
    context.fillText("重い話を話せる質問カード", cardWidth - cardPadding, footerRuleY + 32);
    context.textAlign = "left";

    return canvas;
}


async function shareQuestionImage(question) {
    const canvas = await createQuestionCard(question);
    if (!canvas) {
        shareStatus.textContent = "画像を作れませんでした";
        return;
    }
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
        shareStatus.textContent = "画像を作れませんでした";
        return;
    }

    let file = null;
    if (typeof File === "function") {
        file = new File([blob], "omoi-question.png", { type: "image/png" });
    }
    if (file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: "Omoi｜質問カード",
                text: question.question
            });
            shareStatus.textContent = "画像を共有しました";
            return;
        } catch (error) {
            if (error?.name === "AbortError") {
                return;
            }
        }
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "omoi-question.png";
    document.body.append(link);
    link.click();
    link.remove();
    // ダウンロードの開始後にURLを破棄すると保存が失敗することがあるため、遅らせて片付ける。
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    shareStatus.textContent = "画像を保存しました";
}


const shareMenuGap = 8;
const shareMenuMargin = 12;


function positionShareMenu() {
    if (!shareMenu || shareMenu.hidden) return;
    if (typeof shareButton.getBoundingClientRect !== "function" ||
        typeof shareMenu.getBoundingClientRect !== "function") {
        return;
    }

    const buttonRect = shareButton.getBoundingClientRect();
    const menuRect = shareMenu.getBoundingClientRect();
    const viewportWidth =
        document.documentElement?.clientWidth ||
        window.innerWidth ||
        0;
    const viewportHeight =
        document.documentElement?.clientHeight ||
        window.innerHeight ||
        0;

    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    const menuWidth = menuRect.width;
    const menuHeight = menuRect.height;
    const maxLeft = Math.max(
        shareMenuMargin,
        viewportWidth - menuWidth - shareMenuMargin
    );
    const maxTop = Math.max(
        shareMenuMargin,
        viewportHeight - menuHeight - shareMenuMargin
    );

    // 右端をボタンに合わせ、入りきらない場合は左端合わせか画面内へ寄せる。
    let left = buttonRect.right - menuWidth;
    if (left < shareMenuMargin) {
        left = buttonRect.left;
    }
    left = Math.min(Math.max(left, shareMenuMargin), maxLeft);

    // 基本はボタンの上。上に余地がなければ下、それも無理なら画面内へ寄せる。
    let top = buttonRect.top - menuHeight - shareMenuGap;
    if (top < shareMenuMargin) {
        const below = buttonRect.bottom + shareMenuGap;
        top = below + menuHeight <= viewportHeight - shareMenuMargin
            ? below
            : maxTop;
    }
    top = Math.min(Math.max(top, shareMenuMargin), maxTop);

    shareMenu.style.left = `${Math.round(left)}px`;
    shareMenu.style.top = `${Math.round(top)}px`;
}


function setShareMenuOpen(isOpen) {
    if (!shareMenu) {
        return;
    }
    shareMenu.hidden = !isOpen;
    shareButton.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
        positionShareMenu();
        requestAnimationFrame(positionShareMenu);
    }
}


function updateQuestionLayout(question) {
    const questionValue =
        typeof question.question === "string"
            ? question.question
            : "";
    const scenarioValue =
        typeof question.scenario === "string"
            ? question.scenario
            : "";

    const isLongQuestion =
        [...questionValue, ...scenarioValue].length >= 60;
    const hasLongQuestionText =
        [...questionValue].length >= 60;

    questionContent.classList.toggle(
        "long-question",
        isLongQuestion
    );
    questionContent.classList.toggle(
        "long-question-text",
        hasLongQuestionText
    );

    questionContent.scrollTop = 0;
    requestAnimationFrame(updateQuestionScrollState);
}


function updateQuestionScrollState() {
    const hasOverflow =
        questionContent.scrollHeight >
        questionContent.clientHeight + 1;

    const isAtBottom =
        questionContent.scrollTop +
        questionContent.clientHeight >=
        questionContent.scrollHeight - 1;

    questionContent.classList.toggle(
        "has-more-question-text",
        hasOverflow && !isAtBottom
    );
}


questionContent.addEventListener(
    "scroll",
    updateQuestionScrollState,
    { passive: true }
);

window.addEventListener(
    "resize",
    updateQuestionScrollState
);

window.addEventListener("resize", positionShareMenu);
window.addEventListener("scroll", positionShareMenu, true);


function goToNextQuestion() {
    if (state !== "ready" || isSharedQuestion) return;
    stopSpeech();
    currentQuestionIndex++;

    if (currentQuestionIndex >= sessionQuestions.length) {
        finishSession(true);
        return;
    }

    showQuestion();
}

function goToPreviousQuestion() {
    if (state !== "ready" || isSharedQuestion || currentQuestionIndex === 0) return;
    stopSpeech();
    currentQuestionIndex--;
    showQuestion();
}

function finishSession(completed = false) {
    if (completed) {
        completeSession();
        return;
    }
    stopSpeech();
    setQuestionSummaryOpen(false);
    setHintsPanelOpen(false);
    setDetailPanelOpen(false);
    setState("finished");
    // 途中で終えたときは続きを残す。
    window.location.href = "index.html";
}


nextQuestionButton.addEventListener("click", function () {
    goToNextQuestion();
});

previousQuestionButton.addEventListener("click", function () {
    goToPreviousQuestion();
});

if (restartSessionButton) {
    restartSessionButton.addEventListener("click", restartSession);
}

finishButton.addEventListener("click", function () {
    if (state !== "ready" || isSharedQuestion) return;
    finishConfirmDialog.showModal();
    cancelFinishButton.focus();
});

changeCategoryLink.addEventListener("click", function () {
    // 編集リンクのときは進捗を残して復元できるようにする。
    const href = typeof changeCategoryLink.getAttribute === "function"
        ? changeCategoryLink.getAttribute("href")
        : changeCategoryLink.href;
    const isEditLink = (href || "").includes("edit=1");
    if (!isSharedQuestion && !isEditLink) {
        window.OmoiProgress?.clear();
    }
});

cancelFinishButton.addEventListener("click", function () {
    finishConfirmDialog.close();
    finishButton.focus();
});

confirmFinishButton.addEventListener("click", function () {
    finishConfirmDialog.close();
    finishSession();
});

finishConfirmDialog.addEventListener("close", function () {
    if (state === "ready") finishButton.focus();
});


detailButton.addEventListener("click", function () {
    setDetailPanelOpen(detailPanel.hidden);
});

hintButton.addEventListener("click", function () {
    setHintsPanelOpen(hintsPanel.hidden);
});

questionSummaryToggle.addEventListener("click", function () {
    setQuestionSummaryOpen(questionSummary.hidden);
});

shareButton.addEventListener("click", function () {
    if (state !== "ready") return;
    setShareMenuOpen(shareMenu.hidden);
});

shareUrlButton.addEventListener("click", async function () {
    if (state !== "ready") return;
    const question = sessionQuestions[currentQuestionIndex];
    if (!question?.id) return;
    setShareMenuOpen(false);
    shareButton.focus();
    const url = buildShareUrl(question);
    shareStatus.textContent = "";
    try {
        if (typeof navigator.share === "function") {
            await navigator.share({
                title: "Omoi｜質問カード",
                text: question.question,
                url
            });
            shareStatus.textContent = "✓ 共有しました";
            window.setTimeout(() => {
                if (shareStatus.textContent === "✓ 共有しました") shareStatus.textContent = "";
            }, 3000);
            return;
        }
    } catch (error) {
        if (error?.name === "AbortError") return;
    }
    try {
        await navigator.clipboard.writeText(url);
        shareStatus.textContent = "✓ リンクをコピーしました";
        window.setTimeout(() => {
            if (shareStatus.textContent === "✓ リンクをコピーしました") {
                shareStatus.textContent = "";
            }
        }, 3000);
    } catch (error) {
        window.prompt("このURLをコピーしてください。", url);
    }
});

shareImageButton.addEventListener("click", async function () {
    if (state !== "ready") return;
    const question = sessionQuestions[currentQuestionIndex];
    if (!question?.id) return;
    setShareMenuOpen(false);
    shareButton.focus();
    shareStatus.textContent = "";
    await shareQuestionImage(question);
});

if (printQuestionButton) {
    printQuestionButton.addEventListener("click", function () {
        if (state !== "ready") return;
        const question = sessionQuestions[currentQuestionIndex];
        if (question) updatePrintSheet(question);
        setShareMenuOpen(false);
        shareButton.focus();
        window.print();
    });
}

furiganaToggle.addEventListener("click", function () {
    if (state !== "ready") return;
    furiganaEnabled = !furiganaEnabled;
    furiganaToggle.setAttribute("aria-pressed", String(furiganaEnabled));
    furiganaToggle.textContent = furiganaEnabled ? "ふりがなを隠す" : "ふりがなを表示";
    refreshFuriganaText();
});

for (const { size, element } of textSizeButtons) {
    element.addEventListener("click", function () {
        if (state !== "ready" || classroomModeEnabled) return;
        textSize = size;
        updateDisplayModes();
    });
}

function setClassroomMode(enabled) {
    if (mode !== "student" || state !== "ready" || isSharedQuestion) return;
    const next = Boolean(enabled);
    if (next === classroomModeEnabled) return;
    classroomModeEnabled = next;
    if (classroomModeEnabled) {
        setQuestionSummaryOpen(false);
        setHintsPanelOpen(false);
        setDetailPanelOpen(false);
    }
    updateDisplayModes();
    saveProgress();
}

classroomModeToggle.addEventListener("click", function () {
    setClassroomMode(!classroomModeEnabled);
});

if (classroomModeButton) {
    classroomModeButton.addEventListener("click", function () {
        setClassroomMode(!classroomModeEnabled);
    });
}

if (fullscreenButton) {
    fullscreenButton.addEventListener("click", toggleFullscreen);
}

document.addEventListener("fullscreenchange", updateFullscreenButton);

function updateQuestionProgress() {
    if (!questionProgress) return;
    const show = mode === "student" &&
        !isSharedQuestion &&
        state === "ready" &&
        sessionQuestions.length > 0 &&
        (sessionQuestions.length > 1 || classroomModeEnabled);
    questionProgress.hidden = !show;
    if (show) {
        questionProgress.textContent =
            `${currentQuestionIndex + 1} / ${sessionQuestions.length}`;
    }
}

function updateFullscreenButton() {
    if (!fullscreenButton) return;
    const supported = typeof document !== "undefined" &&
        typeof document.documentElement?.requestFullscreen === "function";
    fullscreenButton.hidden = mode !== "student" || !classroomModeEnabled || isSharedQuestion || !supported;
    fullscreenButton.textContent = document.fullscreenElement
        ? "全画面を終了"
        : "全画面";
}

function toggleFullscreen() {
    if (typeof document === "undefined") return;
    try {
        if (document.fullscreenElement) {
            const result = document.exitFullscreen?.();
            if (result && typeof result.catch === "function") {
                result.catch(() => {});
            }
        } else if (typeof document.documentElement?.requestFullscreen === "function") {
            const result = document.documentElement.requestFullscreen();
            if (result && typeof result.catch === "function") {
                result.catch(() => {});
            }
        }
    } catch (error) {
        // 全画面にできない環境では何もしない。
    }
}

function updateDisplayModes() {
    questionScreen.classList.toggle("text-size-small", textSize === "small");
    questionScreen.classList.toggle("text-size-large", textSize === "large");
    questionScreen.classList.toggle("classroom-mode", classroomModeEnabled);
    for (const { size, element } of textSizeButtons) {
        element.setAttribute("aria-pressed", String(textSize === size));
        // 授業モードでは文字の大きさを切り替えない。
        element.disabled = classroomModeEnabled;
    }
    classroomModeToggle.setAttribute("aria-pressed", String(classroomModeEnabled));
    classroomModeToggle.textContent =
        classroomModeEnabled ? "授業モードを終了" : "授業モード";
    if (classroomModeButton) {
        classroomModeButton.setAttribute("aria-pressed", String(classroomModeEnabled));
        classroomModeButton.textContent =
            classroomModeEnabled ? "授業モードを終了" : "授業モード";
        classroomModeButton.disabled = state !== "ready";
    }
    updateQuestionProgress();
    updateFullscreenButton();
}

document.addEventListener("click", function (event) {
    const clickedButton = event.target.closest("button");
    const shareButtons = [shareButton, shareUrlButton, shareImageButton, printQuestionButton].filter(Boolean);
    if (clickedButton && !shareButtons.includes(clickedButton)) {
        shareStatus.textContent = "";
    }
    if (shareControl && !shareControl.contains(event.target)) {
        setShareMenuOpen(false);
    }
    if (!furiganaSettings.contains(event.target)) {
        furiganaSettings.open = false;
    }
});

function setDetailPanelOpen(isOpen) {
    if (isOpen) {
        setHintsPanelOpen(false);
        setQuestionSummaryOpen(false);
    }
    detailPanel.hidden = !isOpen;
    detailButton.setAttribute("aria-expanded", String(isOpen));
    detailButtonLabel.textContent =
        isOpen ? "背景を閉じる" : "問いの背景";
}

function setHintsPanelOpen(isOpen) {
    if (isOpen) {
        setDetailPanelOpen(false);
        setQuestionSummaryOpen(false);
    }
    hintsPanel.hidden = !isOpen;
    hintButton.setAttribute("aria-expanded", String(isOpen));
}

function closeDetailPanel() {
    setDetailPanelOpen(false);
    detailButton.focus();
}

function closeHintsPanel() {
    setHintsPanelOpen(false);
    hintButton.focus();
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        if (finishConfirmDialog.open) return;
        if (shareMenu && !shareMenu.hidden) {
            setShareMenuOpen(false);
            shareButton.focus();
        } else if (furiganaSettings.open) {
            furiganaSettings.open = false;
            furiganaSettingsSummary.focus();
        } else if (!questionSummary.hidden) {
            setQuestionSummaryOpen(false);
            questionSummaryToggle.focus();
        } else if (!hintsPanel.hidden) {
            closeHintsPanel();
        } else if (!detailPanel.hidden) {
            closeDetailPanel();
        }
        return;
    }

    if (finishConfirmDialog.open || event.defaultPrevented) return;
    const target = event.target;
    const isEditable = Boolean(target) && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
    );
    if (isEditable || event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextQuestion();
    } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousQuestion();
    } else if (event.key.toLowerCase() === "f" && classroomModeEnabled) {
        event.preventDefault();
        toggleFullscreen();
    }
});

setShareMenuOpen(false);

window.addEventListener("pagehide", function () {
    setQuestionSummaryOpen(false);
});
