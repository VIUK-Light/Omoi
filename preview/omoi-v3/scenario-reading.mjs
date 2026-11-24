// A reading experiment, separate from the source question and graph renderer.
const kinshipParts = Object.freeze([
    "血のつながった子だと思って育てたが、",
    "配偶者と別の人の子だと分かった。",
    "配偶者はそれを知って隠していた。"
]);

export function getScenarioSegments(question) {
    if (question?.id !== "l4-relationship-002" || question.scenario !== kinshipParts.join("")) return null;
    return [...kinshipParts];
}
