// 対話モード(Omoi Live)のルーム作成ヘルパー。
// 選択画面・警告画面・確認画面から使い、選ばれた問いをルームに投入して
// ホストURLへ遷移する。入力内容はルーム終了時にサーバー側で削除される。
(function () {
    "use strict";

    // デプロイ済みの Omoi Live のURL。デプロイ時に差し替える。
    const DEFAULT_ORIGIN = "https://omoi-live.omoi-live.workers.dev";
    const OVERRIDE_KEY = "omoiLiveOrigin";
    const MAX_QUESTIONS = 100;

    function origin() {
        try {
            const override = window.localStorage.getItem(OVERRIDE_KEY);
            if (typeof override === "string" && /^https?:\/\//.test(override)) {
                return override.replace(/\/+$/, "");
            }
        } catch (error) {
            /* localStorage が使えない環境では既定値を使う */
        }
        return DEFAULT_ORIGIN;
    }

    // カード配列([{question, scenario}])をルームに投入し、ホストURLを返す
    async function createRoom(cards) {
        if (!Array.isArray(cards) || cards.length === 0) {
            throw new Error("問いが選ばれていません。");
        }
        const trimmed = cards.slice(0, MAX_QUESTIONS).map(card => ({
            question: String(card.question ?? ""),
            scenario: String(card.scenario ?? "")
        }));
        const response = await fetch(origin() + "/api/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questions: trimmed })
        });
        if (!response.ok) {
            throw new Error("ルームを作成できませんでした (" + response.status + ")");
        }
        const data = await response.json();
        if (typeof data.code !== "string" || typeof data.hostUrl !== "string") {
            throw new Error("ルーム情報が不正です。");
        }
        return { code: data.code, hostUrl: origin() + data.hostUrl };
    }

    // level の問いデータからカードを作る
    async function cardsForLevel(level) {
        const response = await fetch("../../データ/質問/level" + level + ".json", { cache: "no-store" });
        if (!response.ok) throw new Error("問いデータを読み込めませんでした。");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("問いデータが不正です。");
        return data.map(question => ({
            question: question.question,
            scenario: question.scenario ?? ""
        }));
    }

    // ピックアップ30問からカードを作る
    async function cardsForPickup() {
        const pickupResponse = await fetch("../../データ/ピックアップ/questions.json", { cache: "no-store" });
        if (!pickupResponse.ok) throw new Error("ピックアップ質問を読み込めませんでした。");
        const pickup = await pickupResponse.json();
        const ids = new Set();
        for (const levelIds of Object.values(pickup.levels ?? {})) {
            for (const id of levelIds ?? []) ids.add(id);
        }
        const cards = [];
        for (const level of ["2", "3", "4"]) {
            const response = await fetch("../../データ/質問/level" + level + ".json", { cache: "no-store" });
            if (!response.ok) throw new Error("問いデータを読み込めませんでした。");
            const data = await response.json();
            for (const question of data) {
                if (ids.has(question.id)) {
                    cards.push({ question: question.question, scenario: question.scenario ?? "" });
                }
            }
        }
        if (cards.length === 0) throw new Error("ピックアップ質問が見つかりませんでした。");
        return cards;
    }

    // 対話モードを開始する共通フロー。cards は配列でも Promise<{question,scenario}[]> でもよい。
    // ボタン（またはリンク）の二重押下防止とエラー表示を担う。
    async function startLiveMode(button, cards, busyLabel) {
        if (!button) throw new Error("start button is missing");
        if (button.dataset && button.dataset.liveBusy === "1") return;
        const originalLabel = button.textContent;
        button.disabled = true;
        if (button.dataset) button.dataset.liveBusy = "1";
        button.textContent = busyLabel ?? "ルームを作っています…";
        try {
            const room = await createRoom(await cards);
            window.location.href = room.hostUrl;
        } catch (error) {
            console.warn("Omoi: 対話モードのルーム作成に失敗しました。", error);
            button.disabled = false;
            if (button.dataset) button.dataset.liveBusy = "0";
            button.textContent = originalLabel;
            alert("対話モードを開始できませんでした。ネットワークを確認して、もう一度お試しください。");
        }
    }

    window.OmoiLive = { origin, createRoom, cardsForLevel, cardsForPickup, startLiveMode };
})();
