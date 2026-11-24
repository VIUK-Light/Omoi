const sessionToken = new URLSearchParams(window.location.search).get("session");

const errorBox = document.getElementById("customConfirmError");
const errorText = document.getElementById("customConfirmErrorText");
const labelList = document.getElementById("confirmLabelList");
const labelEmpty = document.getElementById("confirmLabelEmpty");
const labelCountEl = document.getElementById("confirmLabelCount");
const questionList = document.getElementById("confirmQuestionList");
const excludedList = document.getElementById("confirmExcludedList");
const excludedEmpty = document.getElementById("confirmExcludedEmpty");
const excludedCountEl = document.getElementById("confirmExcludedCount");
const excludedSection = document.getElementById("confirmExcludedSection");
const questionEmpty = document.getElementById("confirmQuestionEmpty");
const questionCountEl = document.getElementById("confirmQuestionCount");
const totalElement = document.getElementById("confirmTotal");
const breakdownElement = document.getElementById("confirmBreakdown");
const startButton = document.getElementById("confirmStartButton");
const editLink = document.getElementById("confirmEditLink");
const shareButton = document.getElementById("confirmShareButton");
const shareStatus = document.getElementById("confirmShareStatus");

let labelsById = new Map();
let questionsById = new Map();
let questionsByLabel = new Map();
let selection = null;
const expandedLabels = new Set();

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

function persist() {
    if (!selection || !window.OmoiProgress?.writeSelection) return;
    window.OmoiProgress.writeSelection(selection);
}

function hasQuestionDetail(question) {
    return Boolean(question) && (Boolean(question.scenario) ||
        Boolean(question.summary && question.summary !== question.question) ||
        (Array.isArray(question.hints) && question.hints.length > 0) ||
        (Array.isArray(question.terms) && question.terms.length > 0));
}

// 削除のたびに画面全体を作り直すため、フォーカスが外れた要素があると
// ブラウザによってはスクロール位置が先頭に戻ってしまう。位置とフォーカスを保つ。
function rerenderPreservingView(mutate, afterRender) {
    const scrollPosition = window.scrollY;
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    mutate();
    persist();
    render();
    if (typeof afterRender === "function") afterRender();
    window.scrollTo(0, scrollPosition);
}

function focusNth(container, selector, index) {
    if (!container) return;
    const targets = [...container.querySelectorAll(selector)];
    if (targets.length === 0) return;
    const target = targets[Math.max(0, Math.min(index, targets.length - 1))];
    target.focus({ preventScroll: true });
}

function renderDetail(container, question) {
    if (!container) return;
    container.replaceChildren();

    const hasDetail = Boolean(question.scenario) ||
        (question.summary && question.summary !== question.question) ||
        (Array.isArray(question.hints) && question.hints.length > 0) ||
        (Array.isArray(question.terms) && question.terms.length > 0);

    if (!hasDetail) {
        const note = document.createElement("p");
        note.className = "confirm-nested-detail-empty";
        note.textContent = "詳細情報はありません。";
        container.append(note);
        return;
    }

    if (question.scenario) {
        const block = document.createElement("div");
        block.className = "confirm-nested-detail-block";
        const heading = document.createElement("strong");
        heading.textContent = "背景";
        const body = document.createElement("p");
        body.textContent = question.scenario;
        block.append(heading, body);
        container.append(block);
    }
    if (question.summary && question.summary !== question.question) {
        const block = document.createElement("div");
        block.className = "confirm-nested-detail-block";
        const heading = document.createElement("strong");
        heading.textContent = "要点";
        const body = document.createElement("p");
        body.textContent = question.summary;
        block.append(heading, body);
        container.append(block);
    }
    if (Array.isArray(question.hints) && question.hints.length > 0) {
        const block = document.createElement("div");
        block.className = "confirm-nested-detail-block";
        const heading = document.createElement("strong");
        heading.textContent = "ヒント";
        const list = document.createElement("ul");
        for (const hint of question.hints) {
            const li = document.createElement("li");
            li.textContent = hint;
            list.append(li);
        }
        block.append(heading, list);
        container.append(block);
    }
    if (Array.isArray(question.terms) && question.terms.length > 0) {
        const block = document.createElement("div");
        block.className = "confirm-nested-detail-block";
        const heading = document.createElement("strong");
        heading.textContent = "用語";
        const list = document.createElement("ul");
        for (const term of question.terms) {
            const li = document.createElement("li");
            li.textContent = term;
            list.append(li);
        }
        block.append(heading, list);
        container.append(block);
    }
}

function render() {
    if (!selection) return;

    const labels = Array.isArray(selection.labels) ? selection.labels : [];
    const ids = Array.isArray(selection.ids) ? selection.ids : [];

    if (labelCountEl) labelCountEl.textContent = `${labels.length}件`;
    if (questionCountEl) questionCountEl.textContent = `${ids.length}問`;

    if (labelList) {
        labelList.replaceChildren();
        if (labels.length === 0) {
            if (labelEmpty) labelEmpty.hidden = false;
        } else {
            if (labelEmpty) labelEmpty.hidden = true;
            for (const labelId of labels) {
                const card = document.createElement("div");
                card.className = "confirm-category-card";
                card.dataset.labelId = labelId;

                const head = document.createElement("div");
                head.className = "confirm-category-head";

                const name = document.createElement("span");
                name.className = "confirm-category-name";
                name.textContent = labelName(labelId);

                const meta = document.createElement("span");
                meta.className = "confirm-category-meta";
                const qs = questionsByLabel.get(labelId) ?? [];
                const excludedSet = new Set(Array.isArray(selection.excludedIds) ? selection.excludedIds : []);
                const visibleCount = qs.filter(q => !excludedSet.has(q.id)).length;
                meta.textContent = `${visibleCount}問`;

                const actions = document.createElement("div");
                actions.className = "confirm-category-actions";

                const toggle = document.createElement("button");
                toggle.type = "button";
                toggle.className = "confirm-toggle";
                const initiallyOpen = expandedLabels.has(labelId);
                toggle.textContent = initiallyOpen ? "閉じる" : "中の問いを見る";
                toggle.setAttribute("aria-expanded", String(initiallyOpen));

                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "confirm-remove";
                remove.textContent = "×";
                remove.setAttribute("aria-label", `${labelName(labelId)} を選択から外す`);
                remove.addEventListener("click", function () {
                    const index = [...labelList.querySelectorAll(".confirm-category-card")].indexOf(card);
                    rerenderPreservingView(function () {
                        selection.labels = selection.labels.filter(id => id !== labelId);
                    }, function () {
                        focusNth(labelList, ".confirm-remove", index);
                    });
                });

                actions.append(toggle, remove);
                head.append(name, meta, actions);

                const body = document.createElement("div");
                body.className = "confirm-category-body";
                body.hidden = !expandedLabels.has(labelId);

                const questionUl = document.createElement("ul");
                questionUl.className = "confirm-nested-list";
                for (const q of qs) {
                    if (excludedSet.has(q.id)) continue;
                    const li = document.createElement("li");
                    li.className = "confirm-nested-item";

                    const text = document.createElement("span");
                    text.className = "confirm-nested-text";
                    text.textContent = q.question;

                    const hasDetail = hasQuestionDetail(q);

                    const detailToggle = hasDetail ? document.createElement("button") : null;
                    if (detailToggle) {
                        detailToggle.type = "button";
                        detailToggle.className = "confirm-nested-detail-toggle";
                        detailToggle.textContent = "i";
                        detailToggle.setAttribute("aria-label", `「${q.question}」の詳細を見る`);
                        detailToggle.setAttribute("aria-expanded", "false");
                    }

                    const remove = document.createElement("button");
                    remove.type = "button";
                    remove.className = "confirm-nested-remove";
                    remove.textContent = "×";
                    remove.setAttribute("aria-label", `「${q.question}」をこのカテゴリーから外す`);
                    remove.addEventListener("click", function () {
                        const index = [...questionUl.children].indexOf(li);
                        rerenderPreservingView(function () {
                            if (!Array.isArray(selection.excludedIds)) selection.excludedIds = [];
                            if (!selection.excludedIds.includes(q.id)) selection.excludedIds.push(q.id);
                        }, function () {
                            const targetCard = labelList?.querySelector(
                                '.confirm-category-card[data-label-id="' + labelId + '"]'
                            );
                            focusNth(
                                targetCard?.querySelector(".confirm-nested-list"),
                                ".confirm-nested-remove",
                                index
                            );
                        });
                    });

                    const detail = document.createElement("div");
                    detail.className = "confirm-nested-detail";
                    detail.hidden = true;
                    if (hasDetail) renderDetail(detail, q);
                    else detail.hidden = true;

                    if (detailToggle) {
                        detailToggle.addEventListener("click", function () {
                            const willOpen = detail.hidden;
                            detail.hidden = !willOpen;
                            detailToggle.setAttribute("aria-expanded", String(willOpen));
                            detailToggle.classList.toggle("is-open", willOpen);
                        });
                    }

                    const row = document.createElement("div");
                    row.className = "confirm-nested-row";
                    if (detailToggle) row.append(text, detailToggle, remove);
                    else row.append(text, remove);

                    li.append(row, detail);
                    questionUl.append(li);
                }
                body.append(questionUl);

                toggle.addEventListener("click", function () {
                    const willOpen = body.hidden;
                    body.hidden = !willOpen;
                    toggle.setAttribute("aria-expanded", String(willOpen));
                    toggle.textContent = willOpen ? "閉じる" : "中の問いを見る";
                    if (willOpen) expandedLabels.add(labelId);
                    else expandedLabels.delete(labelId);
                });

                card.append(head, body);
                labelList.append(card);
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

                const row = document.createElement("div");
                row.className = "confirm-item-row";

                const text = document.createElement("span");
                text.className = "confirm-item-text";
                text.textContent = question ? question.question : id;

                row.append(text);

                const hasDetail = hasQuestionDetail(question);
                const detail = document.createElement("div");
                detail.className = "confirm-nested-detail";
                detail.hidden = true;

                if (hasDetail) {
                    const detailToggle = document.createElement("button");
                    detailToggle.type = "button";
                    detailToggle.className = "confirm-item-detail-toggle";
                    detailToggle.textContent = "i";
                    detailToggle.setAttribute("aria-label", `「${text.textContent}」の詳細を見る`);
                    detailToggle.setAttribute("aria-expanded", "false");
                    detailToggle.addEventListener("click", function () {
                        const willOpen = detail.hidden;
                        detail.hidden = !willOpen;
                        detailToggle.setAttribute("aria-expanded", String(willOpen));
                        detailToggle.classList.toggle("is-open", willOpen);
                    });
                    renderDetail(detail, question);
                    row.append(detailToggle);
                }

                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "confirm-remove";
                remove.textContent = "×";
                remove.setAttribute("aria-label", "この問いを選択から外す");
                remove.addEventListener("click", function () {
                    const index = [...questionList.children].indexOf(item);
                    rerenderPreservingView(function () {
                        selection.ids = selection.ids.filter(value => value !== id);
                    }, function () {
                        focusNth(questionList, ".confirm-remove", index);
                    });
                });
                row.append(remove);

                item.append(row);
                if (hasDetail) item.append(detail);
                questionList.append(item);
            }
        }
    }

    const excludedIds = Array.isArray(selection.excludedIds) ? selection.excludedIds : [];
    if (excludedCountEl) excludedCountEl.textContent = `${excludedIds.length}問`;
    if (excludedList) {
        excludedList.replaceChildren();
        if (excludedIds.length === 0) {
            if (excludedEmpty) excludedEmpty.hidden = false;
            if (excludedSection) excludedSection.hidden = true;
        } else {
            if (excludedEmpty) excludedEmpty.hidden = true;
            if (excludedSection) excludedSection.hidden = false;
            for (const id of excludedIds) {
                const question = questionsById.get(id);
                const item = document.createElement("li");
                item.className = "confirm-item";

                const row = document.createElement("div");
                row.className = "confirm-item-row";

                const text = document.createElement("span");
                text.className = "confirm-item-text";
                text.textContent = question ? question.question : id;

                const restore = document.createElement("button");
                restore.type = "button";
                restore.className = "confirm-remove";
                restore.textContent = "↩︎";
                restore.setAttribute("aria-label", "除外を解除する");
                restore.addEventListener("click", function () {
                    const index = [...excludedList.children].indexOf(item);
                    rerenderPreservingView(function () {
                        selection.excludedIds = selection.excludedIds.filter(v => v !== id);
                    }, function () {
                        focusNth(excludedList, ".confirm-remove", index);
                    });
                });

                row.append(text, restore);
                item.append(row);
                excludedList.append(item);
            }
        }
    }

    const labelCount = labels.length;
    const idCount = ids.length;
    if (totalElement) totalElement.textContent = labelCount + idCount > 0 ? "確認" : "未選択";
    if (breakdownElement) {
        const parts = [];
        if (labelCount > 0) parts.push(`カテゴリー${labelCount}件`);
        if (idCount > 0) parts.push(`個別${idCount}問`);
        breakdownElement.textContent = parts.length > 0 ? parts.join("・") : "選択がありません";
    }
    if (startButton) startButton.disabled = (labels.length === 0 && ids.length === 0);
}

function buildShareUrl() {
    if (!selection) return null;
    const url = new URL("../対話/question.html", window.location.href);
    url.search = "";
    url.searchParams.set("mode", "custom");
    url.searchParams.set("v", "1");

    // 選択された問いのインデックス集合を作る
    const indexSet = new Set();
    const labels = Array.isArray(selection.labels) ? selection.labels : [];
    const ids = Array.isArray(selection.ids) ? selection.ids : [];
    const excluded = new Set(Array.isArray(selection.excludedIds) ? selection.excludedIds : []);
    for (const [id, question] of questionsById) {
        if (typeof question.index !== "number") continue;
        if (excluded.has(id) && !ids.includes(id)) continue;
        const inCategory = labels.some(labelId => Array.isArray(question.labels) && question.labels.includes(labelId));
        const inIndividual = ids.includes(id);
        if (inCategory || inIndividual) indexSet.add(question.index);
    }
    // 個別選択のうち index が questionsById に無いものは無視（共有不可）
    const payload = window.OmoiShare ? window.OmoiShare.encodeSharePayload([...indexSet]) : "";
    if (payload) url.searchParams.set("sel", payload);
    return url.href;
}

function load() {
    if (!sessionToken) {
        showError("選択内容が見つかりませんでした。選択画面からやり直してください。");
        return;
    }
    if (!window.OmoiProgress?.readSelection) {
        showError("この環境では選択内容を読み取れません。");
        return;
    }
    selection = window.OmoiProgress.readSelection(sessionToken);
    if (editLink && sessionToken) {
        editLink.href = "custom-select.html?edit=1&session=" + encodeURIComponent(sessionToken);
    }
    if (!selection) {
        showError("選択内容が見つかりませんでした。選択画面からやり直してください。");
        return;
    }

    Promise.all([
        fetch("../../データ/索引/labels.json"),
        fetch("../../データ/索引/questions-index.json")
    ])
        .then(responses => {
            if (!responses[0].ok || !responses[1].ok) throw new Error("load failed");
            return Promise.all([responses[0].json(), responses[1].json()]);
        })
        .then(([labelsDocument, indexDocument]) => {
            for (const label of labelsDocument.labels ?? []) {
                labelsById.set(label.id, label);
            }
            for (const question of indexDocument.questions ?? []) {
                questionsById.set(question.id, question);
                for (const labelId of question.labels ?? []) {
                    if (!questionsByLabel.has(labelId)) questionsByLabel.set(labelId, []);
                    questionsByLabel.get(labelId).push(question);
                }
            }
            hideError();
            render();
        })
        .catch(error => {
            console.error("Omoi: 選択内容の読み込みに失敗しました。", error);
            showError("選択内容の読み込みに失敗しました。");
        });
}

if (startButton) {
    startButton.addEventListener("click", function () {
        if (startButton.disabled || !selection) return;
        const url = new URL("../対話/question.html", window.location.href);
        url.searchParams.set("mode", "custom");
        url.searchParams.set("session", sessionToken);
        redirect(url);
    });
}

if (shareButton) {
    shareButton.addEventListener("click", async function () {
        const url = buildShareUrl();
        if (!url) return;
        if (shareStatus) shareStatus.textContent = "";
        try {
            if (typeof navigator.share === "function") {
                await navigator.share({
                    title: "Omoi｜質問カード",
                    text: "カスタムモードの選択",
                    url
                });
                if (shareStatus) shareStatus.textContent = "共有しました";
                return;
            }
        } catch (error) {
            if (error?.name === "AbortError") return;
        }
        try {
            await navigator.clipboard.writeText(url);
            if (shareStatus) shareStatus.textContent = "リンクをコピーしました";
        } catch (error) {
            window.prompt("このURLをコピーしてください。", url);
        }
    });
}

load();
