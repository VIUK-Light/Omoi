// Preview-only summaries. Match the source wording before displaying a summary
// so that a revised question never receives an explanation for an older one.
// Clear, self-contained questions need no summary; do not fill every card.
const summaries = new Map([
    ["l4-relationship-002", {
        level: 4,
        question: "それでも、その子を育て続けたい？",
        scenario: "血のつながった子だと思って育てたが、配偶者と別の人の子だと分かった。配偶者はそれを知って隠していた。",
        summary: "育ててきた子と血がつながっていないと分かっても、その子を育て続けたいか。"
    }],
    ["gender-l3-009", {
        level: 3,
        question: "被害を受けた人が男性か女性かで、「被害者らしさ」の感じ方は変わると思う？",
        scenario: "交際相手に殴られ、同じけがを負った二人がいる。被害を受けた人の性別以外の条件は同じとする。",
        summary: "同じ被害・同じけがでも、男性か女性かで「被害者らしく見えるか」という印象が変わるか。"
    }],
    ["r6-08-02-l4", {
        level: 4,
        question: "利用者が友人との約束よりAIとの会話を優先することがあっても、恋人のように話しかける機能を増やす？",
        scenario: "あなたは会話AIの開発責任者。AIから「会えなくて寂しかった」と通知し、恋人のように話しかける機能を増やす案がある。利用者が愛着を持つほど課金が増えるが、一部の利用者は友人との約束を断ってAIとの会話を優先するようになっている。",
        summary: "開発責任者として、恋人のように話しかける機能を増やすか。AIとの親密な会話、事業の利益、友人関係への影響を考える問い。",
        content: [{
            type: "bullets",
            items: [
                { label: "決めること", text: "開発責任者として、恋人のように話しかける機能を増やすか。" },
                { label: "考える論点", text: "AIとの親密な会話、事業の利益、友人関係への影響。" }
            ]
        }]
    }]
]);

function matchingEntry(question) {
    if (!question || typeof question !== "object" || Array.isArray(question)) return null;
    const entry = summaries.get(question.id);
    if (!entry || question.level !== entry.level ||
        question.question !== entry.question || question.scenario !== entry.scenario) return null;
    return entry;
}

// A plain-text view remains available for existing callers and availability checks.
export function getQuestionSummary(question) {
    return matchingEntry(question)?.summary ?? null;
}

// Content is authored per question; the renderer chooses no facts or conclusions.
// Return an owned copy so one view cannot alter the next question's explanation.
export function getQuestionSummaryContent(question) {
    const entry = matchingEntry(question);
    if (!entry) return null;
    return structuredClone(entry.content ?? [{ type: "text", text: entry.summary }]);
}
