import fs from "node:fs";
import { validateFuriganaSidecar } from "./furigana-schema.mjs";

let questionCount = 0;
let annotatedFieldCount = 0;
let kanjiFieldCount = 0;

for (const level of [2, 3, 4]) {
    const questions = JSON.parse(fs.readFileSync(`level${level}.json`, "utf8"));
    const sidecar = JSON.parse(fs.readFileSync(`level${level}-furigana.json`, "utf8"));
    const result = validateFuriganaSidecar(questions, sidecar);
    questionCount += questions.length;
    annotatedFieldCount += result.annotatedFieldCount;
    kanjiFieldCount += result.kanjiFieldCount;
    console.log(`Level ${level}: ${questions.length} questions, ${result.kanjiFieldCount} kanji fields`);
}

console.log(`Validated ${questionCount} questions and ${kanjiFieldCount} kanji-bearing fields (${annotatedFieldCount} annotated fields).`);
