// 対話モードの結合テスト。wrangler dev 起動後に実行する:
//   BASE=http://localhost:8787 node omoi-live/flow-test.mjs
// Node.js >= 22（グローバル WebSocket）が必要。
const BASE = process.env.BASE ?? "http://localhost:8787";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class RoomSocket {
  constructor(code, { hostKey = "", label = "" } = {}) {
    this.label = label;
    this.messages = [];
    this.closed = false;
    const proto = BASE.startsWith("https") ? "wss" : "ws";
    const url = proto + "://" + BASE.replace(/^https?:\/\//, "") + `/api/rooms/${code}/ws` + (hostKey ? `?k=${hostKey}` : "");
    this.ws = new WebSocket(url);
    this.ws.addEventListener("close", () => { this.closed = true; });
  }
  open() {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("open timeout")), 5000);
      this.ws.addEventListener("open", () => { clearTimeout(t); resolve(); }, { once: true });
      this.ws.addEventListener("error", (e) => { clearTimeout(t); reject(new Error("open error")); }, { once: true });
    });
  }
  send(obj) { this.ws.send(JSON.stringify(obj)); }
  async next(pred = () => true, timeout = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const found = this.messages.find(pred);
      if (found) return found;
      await sleep(50);
    }
    throw new Error(`[${this.label}] message wait timeout`);
  }
  listen() {
    this.ws.addEventListener("message", (event) => {
      try { this.messages.push(JSON.parse(event.data)); } catch (e) {}
    });
  }
}

const post = await fetch(BASE + "/api/rooms", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ questions: [
    { question: "問い1: テスト用の問いです。", scenario: "場面の説明" },
    { question: "問い2: 二つ目の問いです。", scenario: "" }
  ]})
});
const room = await post.json();
console.log("created:", room.code);

const host = new RoomSocket(room.code, { hostKey: room.hostKey, label: "host" });
const guest = new RoomSocket(room.code, { label: "guest" });
await Promise.all([host.open(), guest.open()]);
host.listen(); guest.listen();

host.send({ t: "hello", name: "ホスト太郎" });
const hostWelcome = await host.next(m => m.t === "welcome");
console.log("host welcome:", hostWelcome.you.role);

guest.send({ t: "hello", name: "ゲスト花子" });
const guestWelcome = await guest.next(m => m.t === "welcome");
console.log("guest welcome:", guestWelcome.you.role, "lobby:", guestWelcome.state.phase);

// 不正ホスト鍵で接続 → guest になることを確認
const impostor = new RoomSocket(room.code, { hostKey: "WRONGWRONGWRONG", label: "impostor" });
await impostor.open(); impostor.listen();
impostor.send({ t: "next" }); // hello前なので参加者にはならない
const impReject = await impostor.next(m => m.t === "error");
console.log("impostor next rejected (before hello):", impReject.message);
impostor.ws.close();

host.send({ t: "start" });
const guestActive = await guest.next(m => m.t === "state" && m.state.phase === "active");
console.log("phase active, q:", guestActive.state.question);

guest.send({ t: "answer", text: "ゲストの意見です。" });
await guest.next(m => m.t === "state" && m.state.submittedCount === 1);
const guestState = guest.messages.filter(m => m.t === "state").at(-1).state;
console.log("guest submitted, revealed (should be false):", guestState.revealed, "answers hidden:", guestState.answers === null);

host.send({ t: "answer", text: "ホストの意見です。" });
const hostReveal = await host.next(m => m.t === "state" && m.state.revealed === true);
console.log("auto-revealed, answers:", JSON.stringify(hostReveal.state.answers.map(a => a.name)));

guest.send({ t: "answer", text: "公開後の編集は拒否されるべき" });
await sleep(300);
const stillRevealed = guest.messages.filter(m => m.t === "state").at(-1).state;
console.log("answer after reveal rejected:", stillRevealed.answers.map(a => a.text).every(x => x !== "公開後の編集は拒否されるべき"));

host.send({ t: "next" });
const guestQ2 = await guest.next(m => m.t === "state" && m.state.qIndex === 1);
console.log("moved to q2, revealed reset:", guestQ2.state.revealed === false, "submitted:", guestQ2.state.submittedCount);

guest.send({ t: "answer", text: "二問目の意見" });
host.send({ t: "answer", text: "二問目ホスト" });
await guest.next(m => m.t === "state" && m.state.revealed === true);

host.send({ t: "next" }); // 最後の問いなので終了
const guestEnd = await guest.next(m => m.t === "state" && m.state.phase === "ended");
console.log("ended reached");
await sleep(300);

// 終了後の再接続 → 見つからない
const late = new RoomSocket(room.code, { label: "late" });
await late.open(); late.listen();
late.send({ t: "hello", name: "後から" });
const lateErr = await late.next(m => m.t === "error");
console.log("post-end join error:", lateErr.message);

console.log("ALL FLOW OK");
process.exit(0);
