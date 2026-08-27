# Omoi 将来追加のための調査ロードマップ

## この文書の役割

この文書は、将来の質問追加に必要な**調査順序・根拠・確認基準**を固定するためのものです。

このブランチでは、質問文を作らず、新規質問も追加しません。Level 2に誤って複製されていたLevel 3の19件だけを構造修正として削除し、既存質問の文面・意味・Level 3正本は変えていません。ここにある数値は将来の調査容量であり、追加済みの質問数ではありません。

基準コミットは `e2c0d73` です。修正前は578カード、現在は重複を除いた559カードです。335件の出典未接続解説、恋愛・若者・ジェンダーへの偏りは残っているため、追加の前に根拠管理を先に完成させます。

## 追加前の必須ゲート

将来、JSONに1問でも追加する前に、次を満たします。

1. Level 2に混入した19件のLevel 3重複を、Level 3正本を残す形で解消する（このブランチで完了）
2. 表示側が `levelN.json` だけでなく内部 `record.level` も検証する
3. カテゴリ、`topic`、`perspective`、`sensitivity` の意味を文書化する
4. 事実・法律・制度・統計を扱う候補にClaim Ledgerを付ける
5. Level 3・4の高リスク候補に、対象者・危機度・支援先・スキップ方針を付ける
6. 同じテーマについて、支持側・反対側・当事者側の資料を最低1系統ずつ確認する

これらは今回の実装対象ではなく、後続の質問追加を安全に始めるための停止条件です。

## 今回作る研究順序

### Phase R0 — 共通基盤

すべてのテーマの前に、以下を整えます。

- 修正前578カードと、現在559カードのテーマ・Level・感度・出典不足・重複候補を基準表にする
- 主張を「法律・制度」「統計・観察」「研究上の説明」「価値判断」「当事者経験」に分ける
- 調査の対象地域、時点、対象者、定義、母数、地理的範囲を記録する
- 政府の政策文書を、中立な事実ではなく「政府の立場・施策」として扱う
- SNS投稿は当事者の実感として分け、制度や統計の根拠に使わない

### Phase R1 — Level 2を最優先にする六領域

現在のLevel 2正本は39件です。将来の追加計画では、まず日常から社会制度へ話を広げられるLevel 2を厚くします。

| 研究領域 | 現在の不足 | 最初に確認する一次資料 | 事実リスク |
| --- | --- | --- | --- |
| 経済・労働・住宅・社会保障 | 住宅、非正規、賃金、労組、年金、介護財政、地域格差が薄い | [統計局 労働力調査](https://www.stat.go.jp/data/roudou/index.html)、[住宅・土地統計調査](https://www.stat.go.jp/data/jyutaku/index.html)、[国立社会保障・人口問題研究所](https://www.ipss.go.jp/ss-cost/j/fsss-R05/fsss_R05.html) | 名目・実質、世帯・個人、年度・暦年、給付範囲を混同しない |
| 気候・エネルギー・食料・防災 | 環境3件、災害1件。適応、電力、食料供給、避難、復旧が不足 | [気象庁 気候変動監視](https://www.data.jma.go.jp/cpdinfo/monitor/)、[資源エネルギー庁 エネルギー白書](https://www.enecho.meti.go.jp/about/whitepaper/2025/)、[内閣府 防災白書](https://www.bousai.go.jp/kaigirep/hakusho/) | 観測、予測、因果帰属、政策目標を同一視しない |
| データ・プライバシー・情報リテラシー | データ、情報検証、統計、研究倫理の独立カテゴリがない | [個人情報保護委員会](https://www.ppc.go.jp/personalinfo/)、[統計局 統計リテラシー](https://www.stat.go.jp/training/)、[文科省 情報モラル](https://www.mext.go.jp/zyoukatsu/moral/) | 同意、利用目的、第三者提供、匿名化、再識別、相関と因果を分ける |
| AI・デジタル社会 | AIの是非に偏り、著作権、雇用、採用、公平性、データ入力の範囲が混ざる | [文化庁 AIと著作権](https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html)、[経産省 AI事業者ガイドライン](https://www.meti.go.jp/shingikai/mono_info_service/ai_shakai_jisso/20260331_report.html)、[IPA 情報セキュリティ10大脅威](https://www.ipa.go.jp/security/10threats/10threats2026.html) | 技術的可能性、法律、契約、倫理、サービス規約を分ける |
| 健康・医療・公衆衛生 | メンタルヘルス、医療アクセス、ACP、健康格差、危機時支援が薄い | [厚労省 まもろうよ こころ](https://www.mhlw.go.jp/mamorouyokokoro/soudan/)、[人生会議](https://www.mhlw.go.jp/acp-jinseikaigi/about/)、[健康日本21](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/kenkou/kenkounippon21_00006.html) | 医学的助言、制度、本人の価値判断、緊急支援を分ける |
| 家族・介護・高齢化 | 家族責任の問いは多いが、ヤングケアラー、意思決定支援、地域支援、虐待防止が薄い | [こども家庭庁 ヤングケアラー](https://www.cfa.go.jp/policies/young-carer)、[厚労省 仕事と介護の両立](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/ryouritsu/index.html)、[認知症の意思決定支援](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000212395.html) | 家族責任と公的支援、本人意思と安全確保、地域差を分ける |

### Phase R2 — 公共制度と権利の基盤

| 研究領域 | 現在の不足 | 最初に確認する一次資料 | 事実リスク |
| --- | --- | --- | --- |
| 民主主義・市民参加・司法 | 個別の賛否はあるが、選挙、地方自治、請願、司法アクセス、適正手続が薄い | [日本国憲法](https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/shiryo/dl-constitution.htm)、[裁判所の制度概要](https://www.courts.go.jp/about/sosiki/gaiyo/index.html)、[公職選挙法](https://laws.e-gov.go.jp/law/325AC1000000100) | 法律、実務、政策、政治的評価を分ける |
| 人権・多文化・宗教・差別 | ジェンダー・障害・若年妊娠に集中。言語、信仰、難民、複合差別が薄い | [法務省 外国人の人権](https://www.moj.go.jp/JINKEN/jinken04_00101.html)、[OHCHR 人権規約](https://2covenants.ohchr.org/About-The-Covenants.html)、[UNHCR 1951年難民条約](https://www.unhcr.org/about-unhcr/overview/1951-refugee-convention) | 「外国人」「宗教者」「障害者」を一枚岩にしない |
| 地域・交通・公共空間・インフラ | 交通2件、公共空間1件。人口減少、交通空白、維持更新、アクセシビリティが薄い | [国土交通省 統計](https://www.mlit.go.jp/statistics/)、[交通政策白書](https://www.mlit.go.jp/sogoseisaku/transport/sosei_transport_fr_000222.html) | 利用者数、運行頻度、地理的到達性、補助額を混同しない |
| 国際・平和・安全保障・開発 | 専用カバレッジがほぼない | [国連憲章](https://www.un.org/en/about-us/un-charter/full-text)、[国家安全保障戦略](https://www.cas.go.jp/jp/siryou/221216anzenhoshou.html)、[外交青書](https://www.mofa.go.jp/mofaj/gaiko/bluebook/2025/html/index.html) | 法的評価、政府発表、戦況、政治的評価を分ける |

### Phase R3 — 文化・科学・教育の基盤

| 研究領域 | 現在の不足 | 最初に確認する一次資料 | 事実リスク |
| --- | --- | --- | --- |
| 教育・生成AI・学術的誠実性 | スマホ、制服、奨学金中心。生成AI、評価、引用、研究不正が薄い | [文科省 学校現場の生成AI](https://www.mext.go.jp/zyoukatsu/ai/index.html)、[文科省 研究不正への対応](https://www.mext.go.jp/a_menu/jinzai/fusei/) | 学校規則、国の指針、大学方針、個別教員判断を混同しない |
| 科学・統計・研究倫理 | 科学カテゴリがない | [内閣府 研究DX・オープンサイエンス](https://www8.cao.go.jp/cstp/kenkyudx.html)、[統計局](https://www.stat.go.jp/training/) | 査読、再現性、相関、因果、確率を別の概念として扱う |
| 文化・歴史・芸術・スポーツ | 文化・歴史・芸術がほぼなく、スポーツ1件が高対立テーマに偏る | [文化庁 統計・調査](https://www.bunka.go.jp/tokei_hakusho_shuppan/)、[スポーツ庁 統計](https://www.mext.go.jp/sports/b_menu/toukei/main_b8.htm)、[国立公文書館](https://www.digital.archives.go.jp/) | 公式記録と歴史的事実、保存とアクセス、競技規則と価値判断を分ける |

## 研究の実施単位

各テーマで質問カードを作る前に、次の順で1件の「調査ドシエ」を完成させます。

1. **R0 — スコープ確定:** テーマ、地域、対象者、基準日、目的を決める
2. **R1 — 独立発見:** Grok・Geminiに同一の調査依頼を渡す。互いの回答は見せない
3. **R2 — 一次資料確認:** 人が原典を開き、発行元、版、更新日、該当箇所、対象範囲を確認する
4. **R3 — Claim分解:** 一つの文に複数の事実を混ぜず、個別Claimとして台帳化する
5. **R4 — 反証探索:** 古い資料、例外、反対側の一次資料、定義の違いを確認する
6. **R5 — 当事者の確認:** 本人、家族、支援者、制度運用者、費用負担者などを分ける
7. **R6 — 昇格判定:** 事実、対立、当事者、不確実性がそろった候補だけを将来の質問化候補にする
8. **R7 — 公開直前確認:** 法律・統計・支援先・URLを再確認する

## 将来の容量計画（質問は追加しない）

Solの配分案を、質問追加ではなく**調査容量の上限**として保存します。

| Level | 将来の最大検討枠 | 位置付け |
| --- | ---: | --- |
| Level 1 | 160 | 日常的な入口。後回しでよい |
| Level 2 | 300 | 最優先。社会制度と日常をつなぐ |
| Level 3 | 243 | 根拠・反証・解説を伴うテーマ |
| Level 4 | 97 | 高リスクを抑え、安全設計を先行 |
| 合計 | 800 | 上限。根拠不足なら未使用のままにする |

段階は次のとおりです。

- **調査パイロット:** 12テーマの各1ドシエ、計12件。質問は作らない
- **根拠パイロット:** 12テーマで計60件までのClaim記録。質問は作らない
- **候補レビュー:** 200件までの調査済み候補を比較。ここでもJSONは変更しない
- **将来の別タスク:** 承認済みの候補だけを質問化・安全レビュー・重複検査・公開へ進める

## Claim Ledgerの必須列

`research/claim-ledger.csv` では、最低限以下を残します。

- `claim_id`
- `status`
- `linked_cards`
- `theme`
- `atomic_claim`
- `claim_type`
- `jurisdiction`
- `valid_at`
- `source_owner`
- `source_title`
- `source_url`
- `source_date`
- `locator`
- `counter_source_url`
- `affected_parties`
- `uncertainty`
- `editor_decision`
- `last_verified`

`status` は `planned`、`source_identified`、`source_verified`、`mixed`、`outdated`、`hold`、`ready_for_future_review` に限定します。

## 絶対にしないこと

- AIの出力だけから質問を作る
- 一つの統計値を対象・時点・定義なしで使う
- 当事者集団を一種類の意見で代表させる
- 被害者・弱い立場の人に負担を押し付ける構図を「中立」と誤認する
- 法律・医療・科学・国際紛争を単純な二択にする
- 「800問」に合わせるためだけの水増し

今回の成果は、将来追加のための調査設計です。質問データには一切追加しません。
