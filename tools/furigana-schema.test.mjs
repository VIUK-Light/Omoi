import test from "node:test";
import assert from "node:assert/strict";
import { validateFuriganaSidecar } from "./furigana-schema.mjs";

const question = {
    id: "sample",
    level: 3,
    question: "学校で話す",
    scenario: "日々の生活。",
    summary: [
        { type: "text", text: "まず考える。" },
        { type: "bullets", items: [{ label: "理由", text: "相手を守る。" }] }
    ],
    hints: ["何を選ぶ？"],
    detail: {
        text: "用語の説明。",
        sources: [{ title: "資料を見る", url: "https://example.test/" }]
    },
    terms: [{ term: "学校", definition: "学ぶ場所。" }]
};

const text = value => ({ text: value });
const ruby = (base, reading) => ({ ruby: base, reading });
const sidecar = {
    sample: {
        question: [ruby("学校", "がっこう"), text("で"), ruby("話", "はな"), text("す")],
        scenario: [ruby("日々", "ひび"), text("の"), ruby("生活", "せいかつ"), text("。")],
        "summary.0.text": [text("まず"), ruby("考", "かんが"), text("える。")],
        "summary.1.items.0.label": [ruby("理由", "りゆう")],
        "summary.1.items.0.text": [ruby("相手", "あいて"), text("を"), ruby("守", "まも"), text("る。")],
        "hints.0": [ruby("何", "なに"), text("を"), ruby("選", "えら"), text("ぶ？")],
        "detail.text": [ruby("用語", "ようご"), text("の"), ruby("説明", "せつめい"), text("。")],
        "terms.0.term": [ruby("学校", "がっこう")],
        "terms.0.definition": [ruby("学", "まな"), text("ぶ"), ruby("場所", "ばしょ"), text("。")],
        "detail.sources.0.title": [ruby("資料", "しりょう"), text("を"), ruby("見", "み"), text("る")]
    }
};

test("validates complete readings for all visible question text fields", () => {
    assert.deepEqual(validateFuriganaSidecar([question], sidecar), {
        annotatedFieldCount: 10,
        kanjiFieldCount: 10
    });
});

test("rejects a missing reading field", () => {
    const incomplete = structuredClone(sidecar);
    delete incomplete.sample["hints.0"];
    assert.throws(
        () => validateFuriganaSidecar([question], incomplete),
        /Missing furigana: sample\.hints\.0/
    );
});

test("rejects readings that alter source text or leave kanji unannotated", () => {
    const altered = structuredClone(sidecar);
    altered.sample.question[3].text = "し";
    assert.throws(
        () => validateFuriganaSidecar([question], altered),
        /does not match source/
    );

    const unannotated = structuredClone(sidecar);
    unannotated.sample.question[0] = { text: "学校" };
    assert.throws(
        () => validateFuriganaSidecar([question], unannotated),
        /Unannotated kanji/
    );
});
