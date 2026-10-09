# 新規36問の概念適合レビュー

正本JSON・proposal.jsonへの変更はしていません。この資料は承認前の検討用です。

判定は **keep 30件、adjust 6件、hold 0件**。adjust 6件は論点を捨てる必要はなく、価値の違いが表れる形への修正が必要です。うちお金L3は、質問そのものより背景の対立の組み立てが必須修正です。keepのうち3件に任意の改善を記載しています。

## 判定の根拠

- [README.md](/workspace/Omoi/README.md:11)：社会や価値観について話し、「違う考えを知るために」。正解を決めず、「なぜそう思う？」まで話す。[追加ルール](/workspace/Omoi/README.md:112)は、片方の答えだけが明らかに正しく見える表現を避ける。
- [トップページ](/workspace/Omoi/index.html:134)：日常の価値観から、社会問題・制度・人生の選択までを扱う。
- [ガイド](/workspace/Omoi/guide.html:120)：同じ答えや正解を目的にしない。[Levelの案内](/workspace/Omoi/guide.html:142)ではL1の好み・日常の話も入口に含む。[会話の手順](/workspace/Omoi/guide.html:180)では答えを評価せず理由を話す。
- [スキーマ](/workspace/Omoi/QUESTION_DATA_SCHEMA.md:22)：L1は身近な経験からの入口、L2は日常・集団・境界線から違いを扱う橋渡し、L3は制度・社会・役割の判断。背景は結論を押し付けない。

**L1に意見対立や倫理的なジレンマを求めません。** 好きな場所、知りたいこと、試したい方法など、違う好みや経験を気軽に知る問いはOmoiの入口として成立します。反対にL2では、確認すべき正答を列挙することや、望ましいマナーを提案することだけに終わる問いを重点確認しました。

## 修正が必要な6件

### お金L3：背景の反対側が極端な案になっている

`clarity-money_consumption_and_tax-01-l3`

「表示をどこまで分かりやすくする責任」という論点はL3に適合します。ただし[背景](/workspace/Omoi/staging-clarity/new-questions.md:24)では、「必要な料金や解約方法を分かりやすく示す」ことの反対側を「すべての条件を同じ大きさで示す」としており、責任を限定する立場の理由が弱く見えます。

必須は背景の修正です。目立つ料金表示で十分と考える立場と、理解確認・通知まで求める立場にすると、事業者の責任範囲を実際に比べられます。質問文を変更する場合の案は次のとおりです。

> 月額サービスで、料金や解約方法は申込画面に書かれているが、利用者が見落とすこともある。事業者は目立つ表示に加えて、利用者が理解したことまで確認する責任を負うべきだと思う？

背景案は[機械可読版](/workspace/Omoi/staging-clarity/agent-reviews/additions.json)に記録しています。現行の質問文を残し、背景だけ直す選択も可能です。

### 市民参加L2-03：意見を聞く方だけが配慮ある答えに見える

`clarity-democracy_rights_and_participation-03-l2`

[現行案](/workspace/Omoi/staging-clarity/new-questions.md:74)の「よく使う人だけで決めていい？」「意見も聞くべき？」には、意見を聞く負担や期限の制約がありません。意見を広く聞くことと、早くルールを決めることの優先順を話せる条件を加えます。

> みんなで使う場所のルールを急いで決める必要がある。よく使う人は早く決めたいが、あまり使っていない人にも希望がある。意見を聞く範囲と、決める早さをどう考えたい？

### 市民参加L3：参加の集め方から、行政の判断へ

`clarity-democracy_rights_and_participation-01-l3`

[現行案](/workspace/Omoi/staging-clarity/new-questions.md:75)の「どのように集め、判断に反映」は、参加できない人への対応方法の相談に寄りやすい問いです。背景には費用・時間の論点があるので、これを質問にも出すと、行政にどこまで求めるかを話せます。L3の配置は適切です。

> 地域の計画を話し合う平日の昼の説明会に、参加できない人がいる。別の時間の開催や意見募集には追加の費用と時間がかかるなら、行政は参加機会と計画を進める早さをどう比べるべきだと思う？

### 国際L2-01：配慮ある連絡方法の相談に寄っている

`clarity-international_peace_and_cooperation-01-l2`

[現行案](/workspace/Omoi/staging-clarity/new-questions.md:91)は、相手だけがいつも深夜という不公平を先に置いており、「お互いを大切にする約束」を提案する方向に答えが集まりやすい形です。互いの負担と、会話を続ける価値が競合する場面へ変えます。

> 別の国に住む友達との通話は、どの時間にしても片方の睡眠時間に重なる。交代で負担することと、通話を減らすことなら、どう決めたい？

### 科学L2-01：科学リテラシーの確認問題になっている

`clarity-science_research_and_uncertainty-01-l2`

[現行案](/workspace/Omoi/staging-clarity/new-questions.md:110)は、「一度成功したからいつでも使える」という明白な一般化に対して「何を確かめるか」を聞きます。確認項目には客観的に適切な答えがあり、違う考えを知るより正しく慎重に考える練習に寄っています。不確かな方法を試すか、慣れた方法を選ぶか、その理由を聞く形に変えます。

> 友達が一度試してうまくいった勉強法を勧めている。テストまで時間が少ないなら、まだ確かめられていない方法を試すことと、いつもの方法を続けることを、何で決めたい？

### 科学L2-03：失敗を伝えるべきという指導に寄っている

`clarity-science_research_and_uncertainty-03-l2`

[現行案](/workspace/Omoi/staging-clarity/new-questions.md:112)は、失敗を詳しく伝えない側の理由が示されていません。詳しさを限定することと、相手に誤解を与えないことの両方が考えられるよう、短い時間と伝わりやすさの条件を加えます。

> 自分たちが作った道具を短い時間で紹介する。成功した例を中心にすると分かりやすいが、失敗した条件まで話すと説明が複雑になる。何を必ず伝え、何を後から説明する形にしたい？

この変更は、重要な失敗を隠してよいかを聞くためではなく、相手に必要な条件をどの段階で伝えるかの優先順を話すためです。

## 36件の判定一覧

IDは `clarity-<分野>-<番号>-l<Level>`。materialは必須修正、minorは任意の改善、noneは概念上の問題なしです。

| 分野・番号 | Level | 判定 | 重要度 | 判断理由 |
| --- | --- | --- | --- | --- |
| money_consumption_and_tax-01 | 1 | keep | none | 値段に対する満足の経験差を話せる入口。 |
| money_consumption_and_tax-02 | 1 | keep | none | 今と将来にお金を使いたい好みの違い。 |
| money_consumption_and_tax-01 | 2 | keep | none | 使用頻度・費用と友達との参加機会が競合。 |
| money_consumption_and_tax-02 | 2 | keep | none | 今の予算と将来の修理可能性の優先順。 |
| money_consumption_and_tax-03 | 2 | keep | none | 同じ旅行経験と個別の予算・希望の両立。 |
| money_consumption_and_tax-01 | 3 | adjust | material | 説明責任の論点は成立。背景の反対案が極端。 |
| housing_community_and_transport-01 | 1 | keep | none | 住む場所の生活上の好み。 |
| housing_community_and_transport-02 | 1 | keep | none | 地域に新たにほしい場所の希望。 |
| housing_community_and_transport-01 | 2 | keep | none | 広場の遊びと静かな休息を両方明示。 |
| housing_community_and_transport-02 | 2 | keep | none | 外出の参加しやすさと行先への希望。 |
| housing_community_and_transport-03 | 2 | keep | none | 自分の出費と地域への支援。 |
| housing_community_and_transport-01 | 3 | keep | minor | 制度判断として成立。任意で建物を残す理由を質問にも示す。 |
| climate_environment_energy_and_disaster-01 | 1 | keep | none | 電気を使わない遊びの好み。 |
| climate_environment_energy_and_disaster-02 | 1 | keep | none | 身近な自然の好きな部分を聞く入口。 |
| climate_environment_energy_and_disaster-01 | 2 | keep | none | 不確かな消費量で安さと廃棄防止を比べる。 |
| climate_environment_energy_and_disaster-02 | 2 | keep | none | 自分の時間と環境への負担の優先順。 |
| climate_environment_energy_and_disaster-03 | 2 | keep | minor | 備えの共有配分として成立。任意で小さな集団に限定。 |
| climate_environment_energy_and_disaster-01 | 3 | keep | none | 地域の利益と負担、計画の意思決定。 |
| democracy_rights_and_participation-01 | 1 | keep | none | 自分が意見を話しやすい場の好み。 |
| democracy_rights_and_participation-02 | 1 | keep | none | 集団の中で好きな役割。 |
| democracy_rights_and_participation-01 | 2 | keep | none | 投票の透明性と自由に選べること。 |
| democracy_rights_and_participation-02 | 2 | keep | none | 話を聞くことと判断の早さが重要になる条件。 |
| democracy_rights_and_participation-03 | 2 | adjust | material | 意見を聞く側だけが正しく見えやすい。 |
| democracy_rights_and_participation-01 | 3 | adjust | material | 方法の相談に寄る。行政が比べる価値を質問へ。 |
| international_peace_and_cooperation-01 | 1 | keep | none | 他国の暮らしへの好奇心。 |
| international_peace_and_cooperation-02 | 1 | keep | none | 試したい伝え方の個人差。 |
| international_peace_and_cooperation-01 | 2 | adjust | material | 深夜の相手への配慮の方法に寄る。双方の負担を示す。 |
| international_peace_and_cooperation-02 | 2 | keep | none | 自宅の習慣と招いた相手の希望・境界線。 |
| international_peace_and_cooperation-03 | 2 | keep | none | 地理的な近さを支援先選びに重く見るか。 |
| international_peace_and_cooperation-01 | 3 | keep | none | 二国で資源を分ける社会的基準。 |
| science_research_and_uncertainty-01 | 1 | keep | none | 好奇心の違いを聞く入口。 |
| science_research_and_uncertainty-02 | 1 | keep | none | 試す・説明を読むという好み。 |
| science_research_and_uncertainty-01 | 2 | adjust | material | 確認項目の正答を挙げる科学リテラシー演習。 |
| science_research_and_uncertainty-02 | 2 | keep | none | 同じ趣味の評価は自分への当てはまりを示す利点もある。 |
| science_research_and_uncertainty-03 | 2 | adjust | material | 正直に詳しく伝える側に偏る。説明の制約を追加。 |
| science_research_and_uncertainty-01 | 3 | keep | minor | 研究公開の役割判断として成立。任意で公表先を分ける。 |

## 任意の改善3件

- 住まいL3：建物を残す理由は背景にあります。質問だけでも地域の記憶や親しみが伝わるようにする案は、必須ではありません。
- 防災L2-03：準備段階の小さな集団での備えとして読む限りL2です。自治体や緊急時の生命配分へ読み替えるならL3・4相当になるので、集団の範囲を明示する案を出しています。現行案のLevel変更は求めません。
- 科学L3：背景では公表時期・相手・不確実性の示し方を分けており、現行案で成立します。質問にも研究者間共有と一般向け発表を出す案は任意です。

## 意味の近さの確認

既存906問を読み込み、関連するテーマ語で候補を検索しました。L1・L2全243問も通読し、関連候補の軸を比較しています。正規化した質問文の完全一致は0件です。この確認は、意味重複が一切ないことの自動的な証明ではありません。

| 新規案 | 関連する既存ID | 同一と判定しない理由 |
| --- | --- | --- |
| お金L1-02 | relationship-134 | 自分の使い方の好みと、恋人の将来観を結婚後も受け入れるかは異なる。 |
| お金L2-03 | bridge-001, bridge-013 | 旅行を一緒にする価値と個別予算を扱う。決定後の少数者への同調や割り勘とは異なる。 |
| お金L3 | r6-10-02-l3, r6-10-06-l3 | 申込時の説明責任。詐欺広告の損害補償や品物の価値の伝達義務とは異なる。 |
| 住まいL1-02 | daily-010 | 現在落ち着く場所の紹介と、地域に新たにほしい場所の希望。 |
| 環境L2-02 | bridge-023, environment-001 | 自分の外出で時間を使う条件。他人への要求や一般的な受容義務とは異なる。 |
| 防災L2-03 | ethics-008, disaster-010 | 共有する備えの配置。自治体予算の配分や、避難所での実際の救命判断とは異なる。 |
| 市民参加L1-01 | bridge-028 | 自分が話しやすい場と、他人の発言機会を作る方法は異なる。 |
| 市民参加L2-03 | bridge-001, bridge-028 | ルール決定前の参加範囲。決定後の同調や声が大きい人への対応とは異なる。 |
| 国際L2-01 | contact-003, contact-016, bridge-016 | 連絡頻度の好みや遅刻への対応ではなく、時差が作る両者の負担の分配。 |
| 国際L2-03 | ethics-001 | 親しい人への義務と、地理的な近さによる連帯には違いがある。 |
| 科学L2-02 | bridge-027 | 評判の自分への当てはまりと、集団の同調圧力は異なる。 |
| 科学L2-03 | bridge-017, bridge-015 | 試験条件の説明。役割への評価や未確認のうわさの責任とは異なる。 |

36件の原文・判定・根拠・必要な候補文・関連既存IDは[additions.json](/workspace/Omoi/staging-clarity/agent-reviews/additions.json)に記録しています。
