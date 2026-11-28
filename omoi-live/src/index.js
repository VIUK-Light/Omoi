// Omoi Live: 対話モードの入口。
// - /api/rooms         ルーム作成（本流 Omoi から呼ばれる。CORS許可）
// - /api/rooms/:code/ws WebSocket 接続（RoomDO へ転送）
// - /r/:code /host/:code は public/room.html を返す。それ以外は静的アセット。
import { RoomDO } from "./room.js";

export { RoomDO };

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 0/O/1/I を除く
const CODE_LENGTH = 6;
const MAX_QUESTIONS = 100;
const QUESTION_MAX = 600;
const SCENARIO_MAX = 3000;

function randomToken(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let out = "";
    for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    return out;
}

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
    };
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() }
    });
}

// ホストが投入する問いの配列を検証して整形する
function normalizeQuestions(body) {
    if (!body || !Array.isArray(body.questions) || body.questions.length === 0) {
        throw new Error("questions must be a non-empty array");
    }
    if (body.questions.length > MAX_QUESTIONS) {
        throw new Error(`too many questions (max ${MAX_QUESTIONS})`);
    }
    return body.questions.map(q => {
        if (!q || typeof q.question !== "string" || !q.question.trim() || q.question.length > QUESTION_MAX) {
            throw new Error("invalid question");
        }
        let scenario = "";
        if (q.scenario !== undefined && q.scenario !== null) {
            if (typeof q.scenario !== "string" || q.scenario.length > SCENARIO_MAX) {
                throw new Error("invalid scenario");
            }
            scenario = q.scenario;
        }
        return { question: q.question.trim(), scenario };
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS プリフライト
        if (request.method === "OPTIONS" && path.startsWith("/api/")) {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        // ルーム作成
        if (request.method === "POST" && path === "/api/rooms") {
            let questions;
            try {
                questions = normalizeQuestions(await request.json());
            } catch (error) {
                return json({ error: error.message }, 400);
            }
            const hostKey = randomToken(16);
            for (let attempt = 0; attempt < 5; attempt++) {
                const code = randomToken(CODE_LENGTH);
                const id = env.ROOM.idFromName(code);
                const stub = env.ROOM.get(id);
                const setup = await stub.fetch("https://room/setup", {
                    method: "POST",
                    body: JSON.stringify({ questions, hostKey })
                });
                if (setup.status === 409) continue; // コード重複。付け直す
                if (!setup.ok) return json({ error: "room setup failed" }, 500);
                return json({
                    code,
                    hostKey,
                    hostUrl: `/host/${code}?k=${encodeURIComponent(hostKey)}`,
                    joinUrl: `/r/${code}`
                });
            }
            return json({ error: "could not allocate room code" }, 500);
        }

        // WebSocket 接続は RoomDO へ転送
        const wsMatch = /^\/api\/rooms\/([A-Z0-9]{6})\/ws$/.exec(path);
        if (wsMatch && request.headers.get("Upgrade") === "websocket") {
            const id = env.ROOM.idFromName(wsMatch[1]);
            const stub = env.ROOM.get(id);
            return stub.fetch(request);
        }

        // /r/:code と /host/:code は room.html を返す
        const roomMatch = /^\/(r|host)\/([A-Za-z0-9]+)$/.exec(path);
        if (roomMatch) {
            const assetUrl = new URL("/room.html", url.origin);
            return env.ASSETS.fetch(new Request(assetUrl, request));
        }

        // html_handling: none のため / は手動で index.html へ
        if (path === "/") {
            return env.ASSETS.fetch(new Request(new URL("/index.html", url.origin), request));
        }

        // それ以外は静的アセット
        return env.ASSETS.fetch(request);
    }
};
