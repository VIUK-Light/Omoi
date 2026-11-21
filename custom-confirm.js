const sessionToken = new URLSearchParams(window.location.search).get("session");

const errorBox = document.getElementById("customConfirmError");
const errorText = document.getElementById("customConfirmErrorText");
const labelList = document.getElementById("confirmLabelList");
const labelEmpty = document.getElementById("confirmLabelEmpty");
const questionList = document.getElementById("confirmQuestionList");
const questionEmpty = document.getElementById("confirmQuestionEmpty");
const totalElement = document.getElementById("confirmTotal");
const breakdownElement = document.getElementById("confirmBreakdown");
const startButton = document.getElementById("confirmStartButton");

let labelsById = new Map();
let questionsById = new Map();
let selection = null;

function showError(message) {
    if (errorBox) errorBox.hidden = false;
    if (errorText) errorText.textContent = message;
    if (startButton) startButton.disabled = true;
}

function hideError() {
    if (errorBox) errorBox.hidden = true;
}

function redirect(url) {
    window.location.href = url.toString();
}

function labelName(labelId) {
    return labelsById.get(labelId)?.name ?? labelId;
}

function render() {
    if (!selection) return;

    const labels = Array.isArray(selection.labels) ? selection.labels : [];
    const ids = Array.isArray(selection.ids) ? selection.ids : [];

    if (labelList) {
        labelList.replaceChildren();
        if (labels.length === 0) {
            if (labelEmpty) labelEmpty.hidden = false;
        } else {
            if (labelEmpty) labelEmpty.hidden = true;
            for (const labelId of labels) {
                const item = document.createElement("li");
                item.className = "confirm-item";
                const text = document.createElement("span");
                text.className = "confirm-item-text";
                text.textContent = labelName(labelId);
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "confirm-remove";
                remove.textContent = "×";
                remove.setAttribute("aria-label", `${labelName(labelId)} を選択から外す`);
                remove.addEventListener("click", function () {
                    selection.labels = selection.labels.filter(id => id !== labelId);
                    persist();
                    render();
                });
                item.append(text, remove);
                labelList.append(item);
            }
        }
    }

    if (questionList) {
        questionList.replaceChildren();
        if (ids.length === 0) {
            if (questionEmpty) questionEmpty.hidden = false;
        } else {
            if (questionEmpty) questionEmpty.hidden = true;
            for (const id of ids) {
                const question = questionsById.get(id);
                const item = document.createElement("li");
                item.className = "confirm-item";
                const text = document.createElement("span");
                text.className = "confirm-item-text";
                text.textContent = question ? question.question : id;
                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "confirm-remove";
                remove.textContent = "×";
                remove.setAttribute("aria-label", "この問いを選択から外す");
                remove.addEventListener("click", function () {
                    selection.ids = selection.ids.filter(value => value !== id);
                    persist();
                    render();
                });
                item.append(text, remove);
                questionList.append(item);
            }
        }
    }

    const labelCount = labels.length;
    const idCount = ids.length;
    if (totalElement) totalElement.textContent = `${labelCount + idCount > 0 ? "選択中" : "未選択"}`;
    if (breakdownElement) {
        const parts = [];
        if (labelCount > 0) parts.push(`カテゴリー${labelCount}件`);
        if (idCount > 0) parts.push(`個別${idCount}問`);
        breakdownElement.textContent = parts.length > 0 ? parts.join("・") : "選択がありません";
    }
    if (startButton) startButton.disabled = (labels.length === 0 && ids.length === 0);
}

function persist() {
    if (!selection || !window.OmoiProgress?.writeSelection) return;
    window.OmoiProgress.writeSelection(selection);
}

async function load() {
    if (!sessionToken) {
        showError("選択内容が見つかりませんでした。選択画面からやり直してください。");
        return;
    }
    if (!window.OmoiProgress?.readSelection) {
        showError("この環境では選択内容を読み取れません。");
        return;
    }
    selection = window.OmoiProgress.readSelection(sessionToken);
    if (!selection) {
        showError("選択内容が見つかりませんでした。選択画面からやり直してください。");
        return;
    }

    try {
        const [labelsResponse, indexResponse] = await Promise.all([
            fetch("labels.json"),
            fetch("questions-index.json")
        ]);
        if (!labelsResponse.ok || !indexResponse.ok) throw new Error("load failed");
        const [labelsDocument, indexDocument] = await Promise.all([
            labelsResponse.json(),
            indexResponse.json()
        ]);
        for (const label of labelsDocument.labels ?? []) {
            labelsById.set(label.id, label);
        }
        for (const question of indexDocument.questions ?? []) {
            questionsById.set(question.id, question);
        }
        hideError();
        render();
    } catch (error) {
        console.error("Omoi: 選択内容の読み込みに失敗しました。", error);
        showError("選択内容の読み込みに失敗しました。");
    }
}

if (startButton) {
    startButton.addEventListener("click", function () {
        if (startButton.disabled || !selection) return;
        const url = new URL("question.html", window.location.href);
        url.searchParams.set("mode", "custom");
        url.searchParams.set("session", sessionToken);
        redirect(url);
    });
}

load();
