// カスタムモードの選択内容を、12個の64bit整数（ビットマスク）として
// Base64URL にエンコード/デコードするユーティリティ。
// 問いのインデックスは questions-index.json の index フィールドに対応する。
// 追加は末尾のみを許可し、既存インデックスの安定性を保つ。

const SHARE_WORD_COUNT = 12;
const SHARE_BIT_COUNT = SHARE_WORD_COUNT * 64;

function indicesToWords(indices) {
    const words = new Array(SHARE_WORD_COUNT).fill(0n);
    for (const i of indices) {
        if (typeof i !== "number" || i < 0 || i >= SHARE_BIT_COUNT) continue;
        words[Math.floor(i / 64)] |= (1n << BigInt(i % 64));
    }
    return words;
}

function wordsToBytes(words) {
    const bytes = new Uint8Array(SHARE_WORD_COUNT * 8);
    for (let w = 0; w < SHARE_WORD_COUNT; w++) {
        let val = words[w];
        for (let b = 0; b < 8; b++) {
            bytes[w * 8 + b] = Number(val & 0xFFn);
            val >>= 8n;
        }
    }
    return bytes;
}

function bytesToWords(bytes) {
    const words = new Array(SHARE_WORD_COUNT).fill(0n);
    for (let w = 0; w < SHARE_WORD_COUNT; w++) {
        let val = 0n;
        for (let b = 7; b >= 0; b--) {
            val = (val << 8n) | BigInt(bytes[w * 8 + b]);
        }
        words[w] = val;
    }
    return words;
}

function bytesToBase64Url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str) {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/") +
        "===".slice(0, (4 - (str.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function encodeSharePayload(indices) {
    const words = indicesToWords(indices);
    const bytes = wordsToBytes(words);
    return bytesToBase64Url(bytes);
}

function decodeSharePayload(str) {
    if (typeof str !== "string" || str === "") return [];
    try {
        const bytes = base64UrlToBytes(str);
        if (bytes.length !== SHARE_WORD_COUNT * 8) return [];
        const words = bytesToWords(bytes);
        const indices = [];
        for (let w = 0; w < SHARE_WORD_COUNT; w++) {
            let val = words[w];
            for (let b = 0; b < 64; b++) {
                if (val & (1n << BigInt(b))) {
                    indices.push(w * 64 + b);
                }
            }
        }
        return indices;
    } catch (error) {
        return [];
    }
}

if (typeof window !== "undefined") {
    window.OmoiShare = { encodeSharePayload, decodeSharePayload, SHARE_BIT_COUNT };
}
if (typeof module !== "undefined" && module.exports) {
    module.exports = { encodeSharePayload, decodeSharePayload, SHARE_BIT_COUNT };
}
