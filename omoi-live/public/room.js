// Omoi Live ルーム画面。ホスト (/host/:code?k=) と参加者 (/r/:code) の両方を扱う。
(function () {
    "use strict";

    const hostMatch = /^\/host\/([A-Za-z0-9]+)$/.exec(window.location.pathname);
    const guestMatch = /^\/r\/([A-Za-z0-9]+)$/.exec(window.location.pathname);
    const code = hostMatch ? hostMatch[1] : guestMatch ? guestMatch[1] : null;
    const hostKey = new URLSearchParams(window.location.search).get("k");
    const isHost = Boolean(hostMatch);

    const $ = (id) => document.getElementById(id);
    const views = {
        invalid: $("invalidView"),
        join: $("joinView"),
        room: $("roomView")
    };
    const bodies = {
        lobby: $("lobbyBody"),
        writing: $("writingBody"),
        revealed: $("revealedBody"),
        ended: $("endedBody")
    };

    const NAME_MAX = 20;
    const ANSWER_MAX = 1000;
    const VALID_CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

    let ws = null;
    let state = null;
    let myId = null;
    let pendingName = null;
    let editing = false;
    let reconnectTimer = null;
    let reconnectAttempts = 0;
    let roomEnded = false;
    const sessionKey = "omoiLive:" + (code ?? "");

    function showView(name) {
        for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
        if (name !== "room") {
            for (const el of Object.values(bodies)) el.hidden = true;
        }
        const badge = $("roleBadge");
        badge.hidden = name !== "room";
        badge.textContent = isHost ? "ホスト" : "参加者";
        badge.classList.toggle("host", isHost);
    }

    function showError(message) {
        const box = $("errorBox");
        box.textContent = message;
        box.hidden = false;
    }

    function hideError() {
        $("errorBox").hidden = true;
    }

    function readSession() {
        try {
            const raw = window.sessionStorage.getItem(sessionKey);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function writeSession(value) {
        try {
            window.sessionStorage.setItem(sessionKey, JSON.stringify(value));
        } catch (e) { /* ignore */ }
    }

    function connect() {
        if (roomEnded) return;
        clearTimeout(reconnectTimer);
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const url = proto + "//" + window.location.host + "/api/rooms/" + code + "/ws" +
            (isHost && hostKey ? "?k=" + encodeURIComponent(hostKey) : "");
        try {
            ws = new WebSocket(url);
        } catch (e) {
            scheduleReconnect();
            return;
        }
        ws.addEventListener("open", () => {
            reconnectAttempts = 0;
            const session = readSession();
            ws.send(JSON.stringify({
                t: "hello",
                name: pendingName ?? session?.name ?? "",
                prevId: session?.pid ?? null
            }));
        });
        ws.addEventListener("message", (event) => {
            let data;
            try { data = JSON.parse(event.data); } catch (e) { return; }
            handleMessage(data);
        });
        ws.addEventListener("close", () => {
            if (roomEnded) return;
            scheduleReconnect();
        });
        ws.addEventListener("error", () => { /* close が続く */ });
    }

    function scheduleReconnect() {
        if (roomEnded) return;
        reconnectAttempts += 1;
        if (reconnectAttempts > 8) {
            showError("接続できませんでした。ネットワークを確認して、ページを再読み込みしてください。");
            return;
        }
        $("roomView").querySelectorAll("button").forEach(b => { b.disabled = true; });
        const delay = Math.min(1000 * reconnectAttempts, 5000);
        reconnectTimer = setTimeout(connect, delay);
    }

    function handleMessage(data) {
        if (!data || typeof data.t !== "string") return;
        switch (data.t) {
            case "welcome":
                myId = data.you?.id ?? null;
                writeSession({ pid: myId, name: data.you?.name ?? pendingName });
                hideError();
                break;
            case "state":
                state = data.state;
                render();
                break;
            case "error":
                if (typeof data.message === "string" && data.message.includes("見つかりません")) {
                    showView("invalid");
                    roomEnded = true;
                    try { ws.close(); } catch (e) { /* ignore */ }
                    return;
                }
                showError(data.message);
                break;
            default:
                break;
        }
    }

    function send(payload) {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify(payload));
    }

    // ------- 描画 -------

    function render() {
        if (!state) return;
        hideError();
        // 再接続などで一時的に無効化されたボタンを戻す（個別の無効化は各描画で上書き）
        for (const b of $("roomView").querySelectorAll("button")) b.disabled = false;
        if (state.phase === "ended") {
            roomEnded = true;
            showView("room");
            for (const el of Object.values(bodies)) el.hidden = true;
            bodies.ended.hidden = false;
            $("progressLabel").textContent = "";
            return;
        }
        showView("room");
        for (const el of Object.values(bodies)) el.hidden = true;

        renderParticipants();
        if (state.phase === "lobby") renderLobby();
        else if (state.phase === "active") state.revealed ? renderRevealed() : renderWriting();
    }

    function renderParticipants() {
        const chips = state.participants.map(p =>
            `<li${p.id === myId ? ' class="me"' : ""}>${escapeHtml(p.name)}${p.role === "host" ? "（ホスト）" : ""}</li>`);
        $("lobbyParticipants").innerHTML = chips.join("");
    }

    function renderLobby() {
        bodies.lobby.hidden = false;
        $("progressLabel").textContent = "";
        $("lobbyCountLabel").textContent = `${state.participants.length}人が入室しています・全${state.total}問`;
        $("lobbyWaitingLabel").textContent = isHost
            ? "みんなが入ったら「はじめる」を押してください。"
            : "ホストがはじめるのを待っています。";
        $("lobbyHostActions").hidden = !isHost;
        $("startButton").disabled = state.participants.length < 1;

        if (isHost) {
            $("qrCard").hidden = false;
            const joinUrl = window.location.origin + "/r/" + code;
            $("joinLink").href = joinUrl;
            $("joinLink").textContent = joinUrl;
            $("codeLabel").textContent = code;
            const box = $("qrBox");
            box.innerHTML = "";
            try {
                const qr = window.qrcode(0, "M");
                qr.addData(joinUrl);
                qr.make();
                box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 6, scalable: true });
            } catch (e) {
                box.textContent = "QRコードを作成できませんでした。リンクを直接共有してください。";
            }
        } else {
            $("qrCard").hidden = true;
        }
    }

    let lastQIndex = null;

    function renderWriting() {
        bodies.writing.hidden = false;
        $("progressLabel").textContent = `問い ${state.qIndex + 1}/${state.total}`;
        const scenarioEl = $("qScenario");
        scenarioEl.textContent = state.scenario || "";
        scenarioEl.hidden = !state.scenario;
        $("qText").textContent = state.question ?? "";

        const input = $("answerInput");
        const isNewQuestion = state.qIndex !== lastQIndex;
        if (isNewQuestion) {
            editing = false;
            lastQIndex = state.qIndex;
            $("submitAnswerButton").textContent = "これで書き終える";
        }
        const submitted = typeof state.myAnswer === "string";
        $("answerArea").hidden = false;
        if (isNewQuestion) {
            input.value = state.myAnswer ?? "";
        } else if (!editing && submitted) {
            input.value = state.myAnswer;
        }
        input.disabled = submitted && !editing;
        $("submitAnswerButton").hidden = submitted && !editing;
        $("editAnswerButton").hidden = !(submitted && !editing);
        updateCharCount();

        $("writeStatusLabel").textContent = submitted && !editing
            ? `書き終えました。他の${state.participants.length - state.submittedCount}人の回答を待っています。`
            : `${state.submittedCount}/${state.participants.length}人が書き終えました。`;

        $("writingHostActions").hidden = !isHost;
        if (isHost) $("forceRevealButton").disabled = state.submittedCount === 0;
    }

    function renderRevealed() {
        bodies.revealed.hidden = false;
        $("progressLabel").textContent = `問い ${state.qIndex + 1}/${state.total}`;
        const list = $("answersList");
        list.innerHTML = state.answers.map(a => {
            const empty = typeof a.text !== "string";
            const mine = a.id === myId;
            const who = `${escapeHtml(a.name)}${mine ? "（あなた）" : ""}`;
            const text = empty ? "（書いていませんでした）" : a.text;
            return `<li>
                <p class="who${mine ? " mine" : ""}">${who}</p>
                <p class="text${empty ? " empty" : ""}">${escapeHtml(text)}</p>
            </li>`;
        }).join("");

        const last = state.qIndex + 1 >= state.total;
        $("revealedHostActions").hidden = !isHost;
        $("nextButton").textContent = last ? "対話を終える" : "次の問いへ";
        $("revealedWaitingLabel").hidden = isHost;
    }

    function updateCharCount() {
        $("charCount").textContent = String($("answerInput").value.length);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // ------- イベント -------

    $("joinButton").addEventListener("click", () => {
        const name = $("nameInput").value.trim();
        if (!name || name.length > NAME_MAX) {
            showError("ニックネームは1〜20文字で入力してください。");
            return;
        }
        hideError();
        pendingName = name;
        showView("room");
        connect();
    });

    $("nameInput").addEventListener("keydown", (event) => {
        if (event.key === "Enter") $("joinButton").click();
    });

    $("answerInput").addEventListener("input", updateCharCount);

    $("submitAnswerButton").addEventListener("click", () => {
        send({ t: "answer", text: $("answerInput").value });
    });

    $("editAnswerButton").addEventListener("click", () => {
        editing = true;
        $("answerInput").disabled = false;
        $("editAnswerButton").hidden = true;
        $("submitAnswerButton").hidden = false;
        $("submitAnswerButton").textContent = "書き直す";
        $("answerInput").focus();
    });

    $("startButton").addEventListener("click", () => send({ t: "start" }));
    $("forceRevealButton").addEventListener("click", () => {
        if (window.confirm("全員が書き終わっていなくても、書かれた分だけ公開しますか？")) {
            send({ t: "reveal" });
        }
    });
    $("nextButton").addEventListener("click", () => send({ t: "next" }));
    for (const id of ["endButton1", "endButton2"]) {
        $(id).addEventListener("click", () => {
            if (window.confirm("対話を終えると、書かれた意見はすべて削除されます。よろしいですか？")) {
                send({ t: "end" });
            }
        });
    }

    // ------- 起動 -------

    if (!code || !VALID_CODE.test(code)) {
        showView("invalid");
        return;
    }
    $("joinCodeLabel").textContent = code;
    const session = readSession();
    if (session?.name) $("nameInput").value = session.name;
    showView("join");
})();
