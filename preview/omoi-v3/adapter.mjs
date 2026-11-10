// Omoi-specific content stays outside the reusable diagram renderer.
export const SAMPLES = Object.freeze([
    Object.freeze({ id: "relationship-009", level: 4, title: "浮気したことを話すか" }),
    Object.freeze({ id: "l4-relationship-002", level: 4, title: "血のつながりと、育ててきた関係" }),
    Object.freeze({ id: "gender-l3-009", level: 3, title: "性別で被害の受け止め方は変わるか" }),
    Object.freeze({ id: "r6-08-02-l4", level: 4, title: "親密なAIの機能を増やすか", diagram: false })
]);

const graphs = {
    "relationship-009": {
        nodes: [
            { id: "self", title: "自分", body: "一度だけ\n浮気した", kind: "person" },
            { id: "partner", title: "浮気された相手", kind: "person" }
        ],
        edges: [
            { id: "disclosure", source: "self", target: "partner", label: "話す？", directed: true, lineStyle: "dashed" }
        ]
    },
    "l4-relationship-002": {
        rootId: "self",
        nodes: [
            { id: "spouse", title: "配偶者", body: "血縁なしを隠した", kind: "person" },
            { id: "self", title: "自分", kind: "person" },
            { id: "child", title: "子ども", body: "配偶者と\n別の人の子", kind: "person" }
        ],
        edges: [
            { id: "concealment", source: "spouse", target: "self" },
            { id: "upbringing", source: "self", target: "child", label: "育ててきた\n血縁なし" }
        ]
    },
    "gender-l3-009": {
        note: "同じけが・性別以外は同じ条件",
        nodes: [
            { id: "male-partner", title: "交際相手", kind: "person" },
            { id: "male-victim", title: "男性", kind: "person" },
            { id: "female-partner", title: "交際相手", kind: "person" },
            { id: "female-victim", title: "女性", kind: "person" }
        ],
        edges: [
            { id: "male-violence", source: "male-partner", target: "male-victim", label: "殴る", directed: true },
            { id: "female-violence", source: "female-partner", target: "female-victim", label: "殴る", directed: true }
        ]
    }
};

export function getSample(id) {
    return SAMPLES.find(sample => sample.id === id);
}

export function getRelationDiagram(question) {
    const sample = getSample(question?.id);
    if (!sample || !graphs[question.id]) return null;
    if (question.level !== sample.level) {
        throw new TypeError("関係図のサンプルと質問のLevelが一致しません。");
    }
    // Each render receives its own data; the source question is never modified.
    const data = JSON.parse(JSON.stringify(graphs[question.id]));
    for (const node of data.nodes) node.kind ??= node.id === data.rootId ? "context" : "view";
    return data;
}

export function getRelationDiagramOptions(question) {
    if (!getSample(question?.id) || !graphs[question.id]) return null;
    return question.id === "l4-relationship-002"
        ? { layout: "branches", direction: "right", interactive: false }
        : { layout: "pairs", interactive: false };
}

export function getRelationSequence(question) {
    const data = getRelationDiagram(question);
    if (!data) return null;
    const options = getRelationDiagramOptions(question);
    const copy = value => JSON.parse(JSON.stringify(value));
    if (question.id === "relationship-009") {
        return {
            kind: "timeline",
            frames: [
                {
                    label: "浮気したあと",
                    data: { rootId: "self", nodes: [copy(data.nodes.find(node => node.id === "self"))], edges: [] },
                    options: { layout: "branches", direction: "right", interactive: false }
                },
                { label: "相手に伝えるか", data, options }
            ]
        };
    }
    if (question.id === "l4-relationship-002") {
        const raised = copy(data);
        for (const node of raised.nodes) delete node.body;
        raised.edges.find(edge => edge.id === "upbringing").label = "血縁があると\n思っていた";
        const discovered = copy(data);
        delete discovered.nodes.find(node => node.id === "spouse").body;
        return {
            kind: "timeline",
            frames: [
                { label: "育ててきた", data: raised, options },
                { label: "血縁がないと分かった", data: discovered, options },
                { label: "配偶者は前から知っていた", data, options }
            ]
        };
    }
    return {
        kind: "comparison",
        frames: [["male", "男性の場合"], ["female", "女性の場合"]].map(([prefix, label]) => ({
            label,
            data: {
                note: data.note,
                nodes: data.nodes.filter(node => node.id.startsWith(`${prefix}-`)),
                edges: data.edges.filter(edge => edge.id.startsWith(`${prefix}-`))
            },
            options
        }))
    };
}
