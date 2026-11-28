// RoomDO: 対話モードのルーム1つぶんの状態とWebSocket同期を担う。
// 揮発性の設計:
// - 入力内容はこのDOのstorageにだけ存在する（他の保存先はない）
// - ホストが「終了」すると storage 全削除 + 全接続切断
// - 3時間無操作のルームはアラームで storage 全削除
const NAME_MAX = 20;
const ANSWER_MAX = 1000;
const INACTIVITY_MS = 3 * 60 * 60 * 1000;

export class RoomDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.room = undefined; // 遅延ロード
    }

    async ensureRoom() {
        if (this.room !== undefined) return this.room;
        this.room = (await this.state.storage.get("room")) ?? null;
        return this.room;
    }

    async save() {
        this.room.lastActivity = Date.now();
        await this.state.storage.put("room", this.room);
        await this.state.storage.setAlarm(this.room.lastActivity + INACTIVITY_MS);
    }

    async alarm() {
        const room = await this.ensureRoom();
        if (!room) return;
        if (Date.now() - room.lastActivity < INACTIVITY_MS - 1000) {
            // 活動があったので再設定
            await this.state.storage.setAlarm(room.lastActivity + INACTIVITY_MS);
            return;
        }
        await this.destroy();
    }

    async destroy() {
        for (const ws of this.state.getWebSockets()) {
            try { ws.close(1000, "room ended"); } catch (e) { /* ignore */ }
        }
        this.room = null;
        await this.state.storage.deleteAll();
    }

    // 接続ごとに見せないものを除いたスナップショット
    snapshotFor(attachment) {
        const room = this.room;
        const me = attachment?.pid
            ? room.participants.find(p => p.id === attachment.pid) ?? null
            : null;
        const qIndex = room.qIndex;
        const answers = room.answers[qIndex] ?? {};
        const revealed = Boolean(room.revealed[qIndex]);
        return {
            phase: room.phase,
            total: room.questions.length,
            qIndex,
            question: room.questions[qIndex]?.question ?? null,
            scenario: room.questions[qIndex]?.scenario ?? "",
            participants: room.participants.map(p => ({ id: p.id, name: p.name, role: p.role })),
            revealed,
            submittedCount: Object.keys(answers).length,
            myAnswer: me ? (answers[me.id] ?? null) : null,
            // 公開済みのときだけ全員の回答を見せる。未回答は null
            answers: revealed
                ? room.participants.map(p => ({ id: p.id, name: p.name, text: answers[p.id] ?? null }))
                : null
        };
    }

    async broadcast() {
        const message = JSON.stringify({ t: "state" });
        for (const ws of this.state.getWebSockets()) {
            const attachment = ws.deserializeAttachment();
            try {
                ws.send(JSON.stringify({ t: "state", state: this.snapshotFor(attachment) }));
            } catch (e) { /* 切断済みは次のイベントで処理される */ }
        }
    }

    async sendError(ws, message) {
        try { ws.send(JSON.stringify({ t: "error", message })); } catch (e) { /* ignore */ }
    }

    async fetch(request) {
        const url = new URL(request.url);

        // ホストからの初期投入
        if (url.pathname === "/setup" && request.method === "POST") {
            const body = await request.json();
            const room = await this.ensureRoom();
            if (room) return new Response(JSON.stringify({ occupied: true }), { status: 409 });
            if (!Array.isArray(body.questions) || body.questions.length === 0 ||
                typeof body.hostKey !== "string" || !body.hostKey) {
                return new Response("invalid", { status: 400 });
            }
            this.room = {
                code: this.state.id.toString().slice(0, 6),
                hostKey: body.hostKey,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                phase: "lobby",
                qIndex: 0,
                questions: body.questions,
                participants: [],
                answers: {},
                revealed: {}
            };
            await this.save();
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        // WebSocket（Workerからは元のパス /api/rooms/:code/ws のまま転送される）
        if (url.pathname.endsWith("/ws")) {
            const pair = new WebSocketPair();
            const client = pair[0];
            const server = pair[1];

            const room = await this.ensureRoom();
            if (!room) {
                this.state.acceptWebSocket(server);
                await this.sendError(server, "ルームが見つかりません。コードを確認してください。");
                try { server.close(1008, "not found"); } catch (e) { /* ignore */ }
                return new Response(null, { status: 101, webSocket: client });
            }

            const hostKey = url.searchParams.get("k");
            const isHost = typeof hostKey === "string" && hostKey === room.hostKey;
            // ロールはタグとattachmentの両方に持たせる
            this.state.acceptWebSocket(server, isHost ? ["role:host"] : ["role:guest"]);
            server.serializeAttachment({ role: isHost ? "host" : "guest" });
            try { server.send(JSON.stringify({ t: "connected", role: isHost ? "host" : "guest" })); } catch (e) { /* ignore */ }
            return new Response(null, { status: 101, webSocket: client });
        }

        return new Response("not found", { status: 404 });
    }

    async webSocketMessage(ws, message) {
        const room = await this.ensureRoom();
        if (!room) {
            await this.sendError(ws, "ルームは終了しました。");
            ws.close(1008, "gone");
            return;
        }
        let data;
        try {
            data = JSON.parse(typeof message === "string" ? message : "");
        } catch (e) {
            await this.sendError(ws, "不正なメッセージです。");
            return;
        }
        if (!data || typeof data !== "object") return;
        const attachment = ws.deserializeAttachment();
        switch (data.t) {
            case "hello": return await this.handleHello(ws, data, attachment);
            case "answer": return await this.handleAnswer(ws, data, attachment);
            case "start": return await this.handleHostAction(ws, attachment, "start");
            case "reveal": return await this.handleHostAction(ws, attachment, "reveal");
            case "next": return await this.handleHostAction(ws, attachment, "next");
            case "end": return await this.handleHostAction(ws, attachment, "end");
            case "ping": try { ws.send(JSON.stringify({ t: "pong" })); } catch (e) { /* ignore */ } return;
            default: return;
        }
    }

    async handleHello(ws, data, attachment) {
        const room = this.room;
        const rawName = typeof data.name === "string" ? data.name.trim() : "";
        if (!rawName || rawName.length > NAME_MAX) {
            await this.sendError(ws, "ニックネームは1〜20文字で入力してください。");
            return;
        }

        // 再接続: 同じ参加者IDがあって接続が無いならその参加者を引き継ぐ
        const prevId = typeof data.prevId === "string" ? data.prevId : null;
        let pid = null;
        if (prevId) {
            const taken = this.state.getWebSockets().some(other => {
                if (other === ws) return false;
                try {
                    return other.deserializeAttachment()?.pid === prevId;
                } catch (e) { return false; }
            });
            if (!taken && room.participants.some(p => p.id === prevId)) pid = prevId;
        }
        if (!pid) pid = crypto.randomUUID().slice(0, 8);

        const role = attachment?.role === "host" ? "host" : "guest";
        const existing = room.participants.find(p => p.id === pid);
        if (existing) {
            existing.name = rawName;
        } else {
            room.participants.push({ id: pid, name: rawName, role, joinedAt: Date.now() });
        }
        ws.serializeAttachment({ pid, role });
        await this.save();
        try {
            ws.send(JSON.stringify({ t: "welcome", you: { id: pid, name: rawName, role }, state: this.snapshotFor({ pid }) }));
        } catch (e) { /* ignore */ }
        await this.broadcast();
    }

    async handleAnswer(ws, data, attachment) {
        const room = this.room;
        const me = attachment?.pid ? room.participants.find(p => p.id === attachment.pid) : null;
        if (!me || room.phase !== "active" || room.revealed[room.qIndex]) {
            await this.sendError(ws, "いまは回答を受け付けられません。");
            return;
        }
        const text = typeof data.text === "string" ? data.text.trim() : "";
        if (!text) {
            delete room.answers[room.qIndex]?.[me.id];
        } else if (text.length > ANSWER_MAX) {
            await this.sendError(ws, `回答は${ANSWER_MAX}文字以内で入力してください。`);
            return;
        } else {
            (room.answers[room.qIndex] ??= {})[me.id] = text;
        }

        // 全員が書き終えたら自動公開。ただし1人だけのときは公開せず待つ
        // （ホストが先に書いてからQRを配る流れを保つため）
        if (!room.revealed[room.qIndex] && room.participants.length >= 2) {
            const submitted = room.answers[room.qIndex] ?? {};
            if (room.participants.every(p => typeof submitted[p.id] === "string")) {
                room.revealed[room.qIndex] = true;
            }
        }
        await this.save();
        await this.broadcast();
    }

    async handleHostAction(ws, attachment, action) {
        const room = this.room;
        const me = attachment?.pid ? room.participants.find(p => p.id === attachment.pid) : null;
        if (!me || me.role !== "host") {
            await this.sendError(ws, "ホストのみ操作できます。");
            return;
        }
        if (action === "start") {
            if (room.phase === "lobby") {
                room.phase = "active";
                await this.save();
                await this.broadcast();
            }
            return;
        }
        if (action === "reveal") {
            if (room.phase === "active" && !room.revealed[room.qIndex]) {
                room.revealed[room.qIndex] = true;
                await this.save();
                await this.broadcast();
            }
            return;
        }
        if (action === "next") {
            if (room.phase === "active" && room.revealed[room.qIndex] && room.qIndex + 1 < room.questions.length) {
                room.qIndex += 1;
                await this.save();
                await this.broadcast();
            } else if (room.phase === "active" && room.revealed[room.qIndex]) {
                await this.endRoom();
            }
            return;
        }
        if (action === "end") {
            if (room.phase !== "ended") await this.endRoom();
            return;
        }
    }

    async endRoom() {
        const room = this.room;
        if (!room) return;
        room.phase = "ended";
        // 終了を全員に届けてから、保存領域ごと消す
        for (const ws of this.state.getWebSockets()) {
            const attachment = ws.deserializeAttachment();
            try {
                ws.send(JSON.stringify({ t: "state", state: this.snapshotFor(attachment) }));
            } catch (e) { /* ignore */ }
        }
        await this.destroy();
    }

    async webSocketClose(ws) {
        // 接続が切れたら状態を再配信（参加者一覧は変えない: 再接続を許すため）
    }
}
