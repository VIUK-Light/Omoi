// Curated samples for the optional summary and reading comparisons.
export const SAMPLES = Object.freeze([
    Object.freeze({ id: "relationship-009", level: 4, title: "浮気したことを話すか" }),
    Object.freeze({ id: "l4-relationship-002", level: 4, title: "血のつながりと、育ててきた関係" }),
    Object.freeze({ id: "gender-l3-009", level: 3, title: "性別で被害の受け止め方は変わるか" }),
    Object.freeze({ id: "r6-08-02-l4", level: 4, title: "親密なAIの機能を増やすか" })
]);

export function getSample(id) {
    return SAMPLES.find(sample => sample.id === id);
}
