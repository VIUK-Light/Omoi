# Omoi 質問データのスキーマ

この文書は `level1.json` から `level4.json` までの質問カードに共通する編集ルールです。カードは年齢、関係性、パックで出し分けません。どのカードも利用者が飛ばせます。

## 共通フィールド

| フィールド | 必須 | 意味 |
| --- | --- | --- |
| `id` | はい | 全Levelで重複しない固定ID |
| `level` | はい | 配置ファイルと一致する1〜4の整数 |
| `sensitivity` | はい | 難しさではなく、話す前に配慮が必要な度合い（1〜4） |
| `category` | はい | 下記12分類のいずれか |
| `topic` | はい | 具体的な論点。細かな分類や検索・編集用の軸 |
| `question` | はい | 画面に表示する問い |

`sensitivity` が高いことは、特定の答えが正しいことや、利用者を年齢で制限することを意味しません。話したくない問いは、どのLevelでも飛ばせます。

## 質問文・状況説明の書き方

カードはランダムに1枚ずつ表示されるため、ほかのカードや背景解説を読まなくても状況と問いが分かるようにします。

- 判断が出来事の内容や影響によって変わる問いでは、「重大な秘密」「ある事情」「大きな問題」だけで済ませず、誰に何が起き、何に困っているかを書きます。たとえば「恋人のスマホで重大な秘密を知った」なら、「恋人のスマホを無断で開き、別の人とも交際していたと分かるメッセージを見つけた」とします。
- 「必要な配慮」「生活が変わる」なども、音声教材が必要、通院で欠席が増えるなど、判断に必要な内容や生活への影響を示します。実例を置いた仮定の場面として書き、集団全体の特徴だと断言しないようにします。
- 「それ」「どっち」「本人」などが何を指すかは、そのカードの `question` と `scenario` だけで分かるようにします。自分の経験や考えを自由に話す問いは、必要以上に場面を限定しません。特にLevel 1では、元の問いにない「恋人」などの前提を加えないようにします。
- 具体化しても一つの答えに誘導せず、元の論点と視点を保ちます。判断に不要な属性や、まだ決めていない将来の選択を前提にしないようにします。倫理的な葛藤自体が主題のときは、特定の実在制度の是非へ論点を移さず、必要なら架空の場面を使います。性別などを比較する問いでは、比較対象以外の条件をそろえます。
- `question` や `scenario` を変えたら、`hints`・`detail.text`・`terms` も読み合わせ、前提や指示する対象が食い違わないか確認します。

## Levelの意味

| Level | 役割 |
| --- | --- |
| 1 | 身近な経験から始められる短い入口 |
| 2 | 日常・集団・境界線を通して、意見の違いを安全に扱う橋渡し |
| 3 | 制度・社会・役割の判断を考える問い |
| 4 | 個人的な利害または倫理的なトレードオフを自分に置き換える問い |

Levelは対象者の属性ではありません。Level変更は、編集レビューで一覧を示し、承認を得てから行います。

## 12の上位カテゴリ

`self_and_values`、`relationships_and_communication`、`family_and_care`、`school_and_youth`、`work_and_economy`、`gender_sexuality_and_identity`、`health_and_disability`、`technology_media_and_privacy`、`justice_safety_and_crime`、`society_public_policy_and_environment`、`culture_religion_and_history`、`ethics_and_decision_making`。

## Level 3・4の追加フィールド

Level 3とLevel 4では、共通フィールドに加えて次を必須にします。

| フィールド | 意味 |
| --- | --- |
| `perspective` | 問いの主な立場。`affected`、`actor`、`decision_maker`、`observer`のみ |
| `detail.text` | 結論を押し付けず、考えるための背景・対立・条件を説明する文章 |
| `scenario` | 任意。その問いを考える状況や前提。質問文の前に表示 |
| `hints` | 任意。会話を深める問いかけの配列。カードの「会話のヒント」から表示 |
| `terms` | 任意。`term` と `definition` を持つ用語の配列。「問いの背景」内に表示 |

具体的な立場が必要な場合は、主視点を増やさず任意の `role` に `parent`、`teacher`、`friend` などを記録します。Level 4では、`affected`・`actor`・`decision_maker`をそれぞれ20%以上に保ちます。

## 高リスクの内容

必要なカードだけに、任意の `content_warning` 配列を付けます。使える値は次の10種類です。

`sexual_violence`、`pregnancy_and_reproduction`、`infidelity`、`family_conflict`、`abuse_and_coercion`、`self_harm`、`medical_and_end_of_life`、`crime_and_punishment`、`discrimination_and_hate`、`privacy_and_surveillance`。

このタグは編集・検証用の情報です。個別の確認画面は追加せず、既存のLevel警告とスキップ操作を維持します。

## 検証

次を実行します。

```sh
node tools/verify-question-dataset.mjs --enforce-quality-targets
```

この検証は、JSON構文、ID一意性、重複質問、Levelと配置の一致、必須metadata、カテゴリ・警告値、L2の80件以上、L4の視点比率を確認します。
