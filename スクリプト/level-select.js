const levelInputs = document.querySelectorAll('input[name="level"]');
const nextButton = document.getElementById("nextButton");
const pickupInput = document.getElementById("levelPickup");
const pickupSummary = document.getElementById("pickupSummary");

const allowedLevels = new Set(["2", "3", "4"]);
const pickupValue = "pickup";
const pickupDataUrl = "../../データ/ピックアップ/questions.json";
const pickupLevels = ["2", "3", "4"];
const pickupQuestionsPerLevel = 10;
const pickupQuestionsTotal = pickupLevels.length * pickupQuestionsPerLevel;

let selectedLevel = null;
let pickupReady = false;

function redirect(url) {
    window.location.href = url.toString();
}

function formatMonth(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return value;
    return `${match[1]}年${Number(match[2])}月`;
}

function readPickupDocument(data) {
    if (!data || typeof data !== "object" || Array.isArray(data) ||
        data.version !== 1 ||
        typeof data.month !== "string" ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.month) ||
        !data.levels || typeof data.levels !== "object" || Array.isArray(data.levels)) {
        throw new Error("Invalid pickup document.");
    }

    const seen = new Set();
    const counts = [];
    for (const level of pickupLevels) {
        const ids = data.levels[level];
        if (!Array.isArray(ids) || ids.length !== pickupQuestionsPerLevel) {
            throw new Error("Invalid pickup level group.");
        }
        for (const id of ids) {
            if (typeof id !== "string" || id.trim() === "" || seen.has(id)) {
                throw new Error("Invalid pickup question ID.");
            }
            seen.add(id);
        }
        counts.push(ids.length);
    }
    if (seen.size !== pickupQuestionsTotal) {
        throw new Error("Invalid pickup question total.");
    }
    return { month: data.month, counts };
}

function updatePickupSummary(result) {
    if (!pickupSummary) return;
    pickupSummary.textContent = `${formatMonth(result.month)}・${pickupQuestionsTotal}問` +
        `（低${result.counts[0]}・中${result.counts[1]}・高${result.counts[2]}）`;
}

async function loadPickup() {
    if (!pickupInput) return;
    try {
        if (typeof fetch !== "function") {
            throw new Error("fetch is unavailable.");
        }
        const response = await fetch(pickupDataUrl, { cache: "no-store" });
        if (!response.ok) {
            throw new Error("Pickup request failed.");
        }
        const result = readPickupDocument(await response.json());
        updatePickupSummary(result);
        pickupInput.disabled = false;
        pickupReady = true;
    } catch (error) {
        pickupReady = false;
        pickupInput.disabled = true;
        if (pickupSummary) {
            pickupSummary.textContent = "今月のピックアップ質問を読み込めませんでした";
        }
        if (typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn("Omoi: ピックアップ質問を読み込めませんでした。", error);
        }
    }
    updateNextButton();
}

function updateNextButton() {
    const isPickup = selectedLevel === pickupValue;
    nextButton.disabled = isPickup
        ? !pickupReady
        : !allowedLevels.has(selectedLevel);
}

levelInputs.forEach(function (input) {
    input.addEventListener("change", function () {
        if (input.value === pickupValue) {
            selectedLevel = pickupReady ? pickupValue : null;
        } else {
            selectedLevel = allowedLevels.has(input.value) ? input.value : null;
        }
        updateNextButton();
    });
});

nextButton.addEventListener("click", function () {
    if (nextButton.disabled) return;

    if (selectedLevel === pickupValue) {
        const warningUrl = new URL("../対話/warning.html", window.location.href);
        warningUrl.searchParams.set("pickup", "1");
        redirect(warningUrl);
        return;
    }

    if (selectedLevel === "4") {
        redirect(new URL("../対話/warning.html", window.location.href));
        return;
    }
    if (selectedLevel === "3") {
        redirect(new URL("../対話/warning3.html", window.location.href));
        return;
    }

    const questionUrl = new URL("../対話/question.html", window.location.href);
    questionUrl.searchParams.set("level", selectedLevel);
    redirect(questionUrl);
});

updateNextButton();
loadPickup();
