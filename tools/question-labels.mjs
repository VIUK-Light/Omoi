// 質問カードの表示用ラベル。labels配列はこの定義のIDだけを使う。
// student はモード判定用、topic は custom の細分類用。
export const labelDefinitions = Object.freeze([
    { id: "student", name: "学校・若者向け", kind: "audience", order: 0 },
    { id: "school", name: "学校", kind: "topic", order: 10 },
    { id: "bullying", name: "いじめ", kind: "topic", order: 20 },
    { id: "friendship", name: "友人関係", kind: "topic", order: 30 },
    { id: "family", name: "家族", kind: "topic", order: 40 },
    { id: "care", name: "介護・福祉", kind: "topic", order: 50 },
    { id: "romance", name: "恋愛・結婚", kind: "topic", order: 60 },
    { id: "work", name: "仕事", kind: "topic", order: 70 },
    { id: "money", name: "お金・経済", kind: "topic", order: 80 },
    { id: "health", name: "健康・医療", kind: "topic", order: 90 },
    { id: "disability", name: "障害", kind: "topic", order: 100 },
    { id: "gender", name: "ジェンダー", kind: "topic", order: 110 },
    { id: "sexuality", name: "性", kind: "topic", order: 120 },
    { id: "technology", name: "テクノロジー", kind: "topic", order: 130 },
    { id: "privacy", name: "プライバシー", kind: "topic", order: 140 },
    { id: "media", name: "メディア・情報", kind: "topic", order: 150 },
    { id: "crime", name: "犯罪・司法", kind: "topic", order: 160 },
    { id: "politics", name: "政治・制度", kind: "topic", order: 170 },
    { id: "environment", name: "環境・災害", kind: "topic", order: 180 },
    { id: "culture", name: "文化・宗教・歴史", kind: "topic", order: 190 },
    { id: "ethics", name: "倫理・判断", kind: "topic", order: 200 },
    { id: "values", name: "自分・価値観", kind: "topic", order: 210 }
]);

export const audienceLabelIds = Object.freeze(
    labelDefinitions.filter(label => label.kind === "audience").map(label => label.id)
);
export const topicLabelIds = Object.freeze(
    labelDefinitions.filter(label => label.kind === "topic").map(label => label.id)
);
const knownLabelIds = new Set(labelDefinitions.map(label => label.id));
const topicLabelIdSet = new Set(topicLabelIds);
const orderById = new Map(labelDefinitions.map(label => [label.id, label.order]));

const categoryDefaults = Object.freeze({
    self_and_values: ["values"],
    relationships_and_communication: ["friendship"],
    family_and_care: ["family"],
    school_and_youth: ["school"],
    work_and_economy: ["work"],
    gender_sexuality_and_identity: ["gender"],
    health_and_disability: ["health"],
    technology_media_and_privacy: ["technology"],
    justice_safety_and_crime: ["crime"],
    society_public_policy_and_environment: ["politics"],
    culture_religion_and_history: ["culture"],
    ethics_and_decision_making: ["ethics"]
});

// topicの語から細分類を補う。categoryの既定ラベルは必ず残す。
const topicRules = Object.freeze([
    { test: /jealousy|infidelity|romance|marriage|oshi_|dating|falling_for|betrayal|remarriage/, labels: ["romance"] },
    { test: /family|parent|parenthood|divorce|child|sibling/, labels: ["family"] },
    { test: /values|changing_your_mind|self_label/, labels: ["values"] },
    { test: /secret|conflicting_confidences|trust|apology|lie|past_|confession/, labels: ["friendship"] },

    { test: /bully|rumor|gossip|exclusion|harassment|stigma/, labels: ["bullying"] },
    { test: /support|care|poverty|young_carer|accommodation|welfare/, labels: ["care"] },
    { test: /friend|peer|relationship|newcomer|group_work|classmate|welcoming|boundaries/, labels: ["friendship"] },
    { test: /sex|pregnan|contraception|menstruation|consent|reproductive|body/, labels: ["sexuality"] },

    { test: /care|caregiving|elderly|dementia|home_care|young_carer|child_support/, labels: ["care"] },
    { test: /disab|accommodation/, labels: ["disability"] },
    { test: /poverty|money|debt|financial/, labels: ["money"] },
    { test: /privacy|surveillance|location|tracking/, labels: ["privacy"] },

    { test: /economy|price|debt|tax|social_security|minimum_wage|wage|money|expenses|lending|poverty/, labels: ["money"] },
    { test: /ai_|technology/, labels: ["technology"] },

    { test: /sex|reproductive|menstruation|pregnan|contraception|consent|body|sex_education/, labels: ["sexuality"] },

    { test: /disab|accommodation|dementia/, labels: ["disability"] },
    { test: /mental|medicine|medical|health|prenatal|genetic|icu/, labels: ["health"] },
    { test: /social_security|money/, labels: ["money"] },
    { test: /ai_|medical_ai/, labels: ["technology"] },

    { test: /privacy|surveillance|location|tracking|photo_consent|account_privacy|facial|predictive/, labels: ["privacy"] },
    { test: /media|misinformation|viral|rumor|screenshot|online/, labels: ["media"] },
    { test: /ai_/, labels: ["technology"] },

    { test: /immigration/, labels: ["politics"] },
    { test: /traffic|safety/, labels: ["crime"] },

    { test: /immigration|politics|social_security|tax|public_support|public_space|depopulation|tourism|housing|transport|driver/, labels: ["politics"] },
    { test: /environment|climate|disaster|animal|generator|evacuation|shelter|overtourism|pets/, labels: ["environment"] },

    { test: /oshi_/, labels: ["romance"] },
    { test: /religion|history|politics_culture/, labels: ["culture"] },

    { test: /punishment|crime|justice/, labels: ["crime"] },
    { test: /tax|public_services/, labels: ["politics"] },
    { test: /unpaid|work/, labels: ["work"] },
    { test: /uniform|school/, labels: ["school"] }
]);

function sortLabels(labels) {
    return [...new Set(labels)].sort((left, right) =>
        (orderById.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (orderById.get(right) ?? Number.MAX_SAFE_INTEGER)
    );
}

export function assignQuestionLabels(record, options = {}) {
    const category = typeof record.category === "string" ? record.category : "";
    const topic = typeof record.topic === "string" ? record.topic.toLowerCase() : "";
    const labels = [...(categoryDefaults[category] ?? ["values"])];

    if (options.student === undefined || options.student === true) {
        if (category === "school_and_youth") labels.push("student");
    }

    for (const rule of topicRules) {
        if (rule.test.test(topic)) labels.push(...rule.labels);
    }

    return sortLabels(labels.filter(label => knownLabelIds.has(label)));
}

export function isKnownLabel(label) {
    return knownLabelIds.has(label);
}

export function isTopicLabel(label) {
    return topicLabelIdSet.has(label);
}

export function validateLabelList(labels, { requireTopic = true } = {}) {
    const errors = [];
    if (!Array.isArray(labels) || labels.length === 0) {
        errors.push("labels must be a non-empty array.");
        return errors;
    }
    const seen = new Set();
    for (const label of labels) {
        if (typeof label !== "string" || label.trim() === "") {
            errors.push("labels must contain non-empty strings.");
            continue;
        }
        if (!knownLabelIds.has(label)) errors.push(`Unknown label: ${label}`);
        if (seen.has(label)) errors.push(`Duplicate label: ${label}`);
        seen.add(label);
    }
    if (requireTopic && !labels.some(label => topicLabelIdSet.has(label))) {
        errors.push("labels must include at least one topic label.");
    }
    return errors;
}
