# Omoi 質問データのスキーマ

この文書は `level2.json`・`level3.json`・`level4.json`の質問カードに共通する編集ルールです。カードは年齢、関係性、パックで出し分けません。どのカードも利用者が飛ばせます。

## 共通フィールド

| フィールド | 必須 | 意味 |
| --- | --- | --- |
| `id` | はい | 全Levelで重複しない固定ID |
| `level` | はい | 配置ファイルと一致する2・3・4のいずれかの整数 |
| `sensitivity` | はい | 難しさではなく、話す前に配慮が必要な度合い（1〜4） |
| `category` | はい | 下記12分類のいずれか |
| `topic` | はい | 具体的な論点。細かな分類や検索・編集用の軸 |
| `question` | はい | 画面に表示する問い |

`sensitivity` が高いことは、特定の答えが正しいことや、利用者を年齢で制限することを意味しません。話したくない問いは、どのLevelでも飛ばせます。

## 質問文・状況説明の書き方

カードはランダムに1枚ずつ表示されるため、ほかのカードや背景解説を読まなくても状況と問いが分かるようにします。

- 判断が出来事の内容や影響によって変わる問いでは、「重大な秘密」「ある事情」「大きな問題」だけで済ませず、誰に何が起き、何に困っているかを書きます。たとえば「恋人のスマホで重大な秘密を知った」なら、「恋人のスマホを無断で開き、別の人とも交際していたと分かるメッセージを見つけた」とします。
- 希望の対立を前提にした場面では、双方が求める選択を明記します。「親の希望と自分の希望が違う」だけで済ませず、「親は進学を望み、本人は就職を望んでいる」のように書きます。「結論を求められる」「責任を負う」なども、何についての結論や行動なのかを示します。
- `question` と `scenario` を読み、「誰が、何を望み、何を判断する場面か」を言い直せるか確認します。不明なこと自体が論点なら、「確認できていない」「本人もまだ迷っている」と書き、説明の欠落と区別します。
- 「必要な配慮」「生活が変わる」なども、音声教材が必要、通院で欠席が増えるなど、判断に必要な内容や生活への影響を示します。実例を置いた仮定の場面として書き、集団全体の特徴だと断言しないようにします。
- 「それ」「どっち」「本人」などが何を指すかは、そのカードの `question` と `scenario` だけで分かるようにします。自分の経験や考えを自由に話す問いは、必要以上に場面を限定しません。元の問いにない「恋人」などの前提を加えないようにします。
- 具体化しても一つの答えに誘導せず、元の論点と視点を保ちます。判断に不要な属性や、まだ決めていない将来の選択を前提にしないようにします。倫理的な葛藤自体が主題のときは、特定の実在制度の是非へ論点を移さず、必要なら架空の場面を使います。性別などを比較する問いでは、比較対象以外の条件をそろえます。
- `question` や `scenario` を変えたら、`summary`・`hints`・`detail.text`・`terms` も読み合わせ、前提や指示する対象が食い違わないか確認します。

## Levelの意味

| Level | 役割 |
| --- | --- |
| 2 | 日常・集団・境界線を通して、意見の違いを安全に扱う橋渡し |
| 3 | 制度・社会・役割の判断を考える問い |
| 4 | 個人的な利害または倫理的なトレードオフを自分に置き換える問い |

v3ではLevel 1を廃止し、Level 2・3・4の番号と既存カードを維持します。`level1.json` は同梱しません。

Levelは対象者の属性ではありません。Level変更は、編集レビューで一覧を示し、承認を得てから行います。

## 12の上位カテゴリ

`self_and_values`、`relationships_and_communication`、`family_and_care`、`school_and_youth`、`work_and_economy`、`gender_sexuality_and_identity`、`health_and_disability`、`technology_media_and_privacy`、`justice_safety_and_crime`、`society_public_policy_and_environment`、`culture_religion_and_history`、`ethics_and_decision_making`。

## Level 3・4の追加フィールド

Level 3とLevel 4では `perspective` を必須にします。補助は必要な場合だけ用意し、全問に3種類をそろえません。Level 2には `summary`・`hints`・`detail`・`terms` を追加しません。

| フィールド | 意味 |
| --- | --- |
| `perspective` | 問いの主な立場。`affected`、`actor`、`decision_maker`、`observer`のみ |
| `summary` | 任意。状況や判断対象を整理する文章／箇条書きブロックの配列。単なる言い換えになる問いには設けない |
| `detail` | 任意。確認できた知識や事実を説明する `text` と、その記述に対応する `sources` |
| `scenario` | 任意。その問いを考える状況や前提。質問文の前に表示 |
| `hints` | 任意。会話を深める問いかけの配列。カードの「会話のヒント」から表示 |
| `terms` | 任意。`term` と `definition` を持つ用語の配列。「問いの背景」内に表示 |

具体的な立場が必要な場合は、主視点を増やさず任意の `role` に `parent`、`teacher`、`friend` などを記録します。Level 4では、`affected`・`actor`・`decision_maker`をそれぞれ20%以上に保ちます。

### 補助の形式と掲載条件

- `summary` は空でない配列です。文章は `{ "type": "text", "text": "…" }`、箇条書きは `{ "type": "bullets", "items": [{ "label": "任意の見出し", "text": "…" }] }` で指定します。項目の `label` は省略できます。通常画面ではこの2形式を使い、文字数や項目数を一律の品質基準にはしません。
- `hints` は空でない文字列の配列です。要点の再掲ではなく、異なる見方や相手の理由を聞く問い返しにします。
- `detail` がある場合は空でない `text` と、1件以上の `sources` が必要です。出典には空でない `title` と `http`／`https` の `url` を記録します。URLの形式だけでなく、説明との対応を読み合わせで確かめます。未確認の外部事実を含む説明は掲載しません。
- `terms` は必要な用語だけを、空でない `term` と `definition` で指定します。用語だけを載せる場合は `detail` を設けず、`terms` だけを指定できます。
- 不要な補助はフィールドを省略します。空白・空配列や定型文で埋めません。補助が一つもないカードも正常な編集結果です。
- 判断や原文にない事実・需要・感情を補わず、要点を読まなくても回答・対話・スキップできる状態を保ちます。自動検証は中立性や理解しやすさを判定しないため、文案とは独立した読み合わせを行います。

## フリガナ

質問画面右上の読みやすさ設定パネルにある「ふりがなを表示」ボタンで切り替えます。初期状態は非表示です。質問・場面文・要点・ヒント・背景・用語・出典名の読みは、原文を変更せず `level2-furigana.json`・`level3-furigana.json`・`level4-furigana.json` に記録します。ルビの文字サイズ・太さは `question.css` の `--furigana-font-size` と `--furigana-font-weight` で調整できます。

各サイドカーは質問IDをキーにし、その値に表示項目のパスと分割配列を記録します。`text` セグメントは通常の文字列、`ruby` セグメントは漢字を含む本文とひらがなの読みです。

```json
{
  "question-id": {
    "question": [
      { "ruby": "学校", "reading": "がっこう" },
      { "text": "で" },
      { "ruby": "話", "reading": "はな" },
      { "text": "す？" }
    ],
    "scenario": [
      { "text": "まず" },
      { "ruby": "状況", "reading": "じょうきょう" },
      { "text": "を" },
      { "ruby": "考", "reading": "かんが" },
      { "text": "える。" }
    ]
  }
}
```

使用できるパスは `question`、`scenario`、`summary.N.text`、`summary.N.items.N.label`、`summary.N.items.N.text`、`hints.N`、`detail.text`、`terms.N.term`、`terms.N.definition`、`detail.sources.N.title` です。分割をつなげた本文は元の表示文字列と完全一致させます。漢字を含む表示項目は全て読みを付け、読みは文脈に合うひらがなで記述します。ID、分類、URLなど利用者に表示しないデータは対象外です。

## フリガナ検証

```sh
node tools/verify-question-furigana.mjs
node --test tools/furigana-schema.test.mjs tools/question-flow.test.mjs
```

検証は全質問の表示項目を収集し、読みデータの不足、元の表示文との不一致、漢字の読み漏れ、形式不正を検出します。

v3プレビューではLevel 3・4の全663問を対象に、採用／省略理由と文面の指紋を `docs/v3-content-review.json` に記録します。版は `version: 1`、有効Levelは `activeLevels: [2, 3, 4]`、起点は `baseCommit`、各記録には `id`、`level`、`fingerprint`、4補助の `decisions`、`reviewer`、別の読み手の `independentReviewer` を持たせます。指紋は現在のカード全体を `JSON.stringify()` したUTF-8文字列のSHA-256です。補助文を変更した場合も再確認が必要です。

## 高リスクの内容

必要なカードだけに、任意の `content_warning` 配列を付けます。使える値は次の10種類です。

`sexual_violence`、`pregnancy_and_reproduction`、`infidelity`、`family_conflict`、`abuse_and_coercion`、`self_harm`、`medical_and_end_of_life`、`crime_and_punishment`、`discrimination_and_hate`、`privacy_and_surveillance`。

このタグは編集・検証用の情報です。個別の確認画面は追加せず、既存のLevel警告とスキップ操作を維持します。

## 検証

次を実行します。

```sh
node tools/verify-question-dataset.mjs --enforce-quality-targets
node tools/verify-v3-review.mjs --summary
```

データ検証は、JSON構文、ID一意性、重複質問、Levelと配置の一致、必須metadata、補助の形式と掲載Level、カテゴリ・警告値、L2の80件以上、L4の視点比率を確認します。旧 `--strict-details` 指定は互換性のため受け付けますが、v3で背景を必須に戻す効果はありません。

レビュー検証は全663問の確認記録と指紋、独立した読み手、起点からの有効な全743問（Level 2・3・4）の保持と、Level 1の廃止を確認します。変更できるカード項目は `summary`・`hints`・`detail`・`terms` だけです。質問・場面文・ID・Level・分類・順序を保持し、Level 2のファイルはバイト単位で保持します。Level 1のデータファイルや現行レコードが存在する場合は検証に失敗します。未確認や文面不一致があれば反映を止めます。
