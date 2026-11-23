// カスタムモードの選択内容を、64bit整数ワードのビットマスクとして
// Base64URL にエンコード/デコードするユーティリティ。
// 問いのインデックスは questions-index.json の index フィールドに対応する。
// 追加は末尾のみを許可し、既存インデックスの安定性を保つ。

const LEGACY_SHARE_WORD_COUNT = 12;
const SHARE_WORD_COUNT = 13; // 832 bits - 既存743問 + 将来の追加分
const SHARE_BIT_COUNT = SHARE_WORD_COUNT * 64;
const LEGACY_SHARE_BYTES = LEGACY_SHARE_WORD_COUNT * 8;
const SHARE_BYTES = SHARE_WORD_COUNT * 8;

function indicesToWords(indices, wordCount) {
    const words = new Array(wordCount).fill(0n);
    for (const i of indices) {
        if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i >= wordCount * 64) continue;
        words[Math.floor(i / 64)] |= (1n << BigInt(i % 64));
    }
    return words;
}

function wordsToBytes(words) {
    const bytes = new Uint8Array(words.length * 8);
    for (let w = 0; w < words.length; w++) {
        let val = words[w];
        for (let b = 0; b < 8; b++) {
            bytes[w * 8 + b] = Number(val & 0xFFn);
            val >>= 8n;
        }
    }
    return bytes;
}

function bytesToWords(bytes, wordCount) {
    const words = new Array(wordCount).fill(0n);
    for (let w = 0; w < wordCount; w++) {
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
    const maxIndex = indices.reduce((max, value) => {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return max;
        return value > max ? value : max;
    }, -1);
    if (maxIndex >= SHARE_BIT_COUNT) return "";
    // 旧クライアント互換のため、768bit以内なら96バイトでエンコードする。
    const wordCount = maxIndex >= LEGACY_SHARE_WORD_COUNT * 64
        ? SHARE_WORD_COUNT
        : LEGACY_SHARE_WORD_COUNT;
    const words = indicesToWords(indices, wordCount);
    const bytes = wordsToBytes(words);
    return bytesToBase64Url(bytes);
}

function decodeSharePayload(str) {
    if (typeof str !== "string" || str === "") return [];
    try {
        const bytes = base64UrlToBytes(str);
        let wordCount;
        if (bytes.length === LEGACY_SHARE_BYTES) wordCount = LEGACY_SHARE_WORD_COUNT;
        else if (bytes.length === SHARE_BYTES) wordCount = SHARE_WORD_COUNT;
        else return [];
        const words = bytesToWords(bytes, wordCount);
        const indices = [];
        for (let w = 0; w < wordCount; w++) {
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
