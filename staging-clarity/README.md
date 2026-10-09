# 問いのわかりやすさ・カテゴリー拡充（反映済み）

**2026-10-07に反映済みです。** ユーザーの「じゃあ変更するか」を受け、元の改善案へ概念レビューの優先修正を取り込んで正本を更新しました。

## 現在の結果

| 内容 | 反映内容 |
| --- | --- |
| 既存質問の修正 | 30問（L1: 4 / L2: 4 / L3: 12 / L4: 10） |
| 既存背景の修正 | 3件（刑事司法、統計の見出し、配信者の誤解への対応） |
| 新規質問 | 36問（L1: 12 / L2: 18 / L3: 6） |
| カテゴリー | 12 → 18 |
| 既存カードの分類変更 | 61件（元案63件から、雇用2件の移動を取りやめ） |
| 全問数 | 906 → 942（L1: 175 / L2: 98 / L3: 307 / L4: 362） |

既存ID・Level・感度・視点・警告タグ・topic・出典・順序を保持しています。既存カードの削除はありません。重い話・深い問いの利害や葛藤を残し、相手の感覚・考えと理由を知るための入口を広げました。

- [反映した全質問・背景・分類の変更前後](application.md)
- [反映した変更データ](application-proposal.json)（status: applied）
- [検証と整合性の記録](application-report.json)
- [正式な18カテゴリーのスキーマ](../QUESTION_DATA_SCHEMA.md)

## 検証

```sh
node tools/verify-question-dataset.mjs --enforce-quality-targets --summary
node --test tools/*.test.mjs
node tools/verify-seo.mjs
```

942問の構造エラー0、回帰テスト28件成功、JavaScript構文・SEO検証成功。出典なし解説の警告667件は残ります。追加したL3背景6件は仮の場面として明記しました。

画面でカテゴリーを選ぶ機能や、カテゴリー別の抽選は追加していません。会話で出会う話題の幅は追加カードで広げています。公開サイトへのデプロイは行っていません。

## 概念レビューの反映

優先した質問・背景9件と分類4件を調整しました。雇用2件を仕事・経済に残し、公的給付2件を社会政策へ移しました。任意改善は今回の反映へ加えていません。

- [既存6件の最終調整](application-question-adjustments.json)
- [新規2問と背景1件の最終調整](application-addition-adjustments.json)
- [分類4件と範囲説明の調整](application-category-adjustments.json)

## 反映前の履歴

以下は当時の案・評価を保持した履歴です。本文やJSONの「pending_approval」「未反映」「最終確認待ち」は当時の状態で、現在の反映状況を表しません。

- [元の提案JSON](proposal.json)
- [既存30問の元の修正案](question-revisions.md)
- [新規36問の元の追加案](new-questions.md)
- [元の63分類変更案](category-review.md)
- [元のスキーマ案](QUESTION_DATA_SCHEMA-proposed.md)
- [4エージェントの統合概念レビュー](concept-review.md) / [判定の記録](concept-review.json)
- [反映前の構造検証](verification-report.json)

元の提案はレビュー時のSHA-256を保つため変更していません。旧基準の提案を現在の正本へ再適用しないでください。新しい変更は、新しい基準と対象ID・変更前後を示して最終確認します。
