# staging-r6 — Omoi 246問 審査結果取り込み（ステージング確認用）

本ディレクトリは `level3.json` / `level4.json` 本体を変更せず、レビュー結果の取り込み案を隔離確認するためのものです。
ユーザー回答: ステージングで確認 / レベル入替は指示通り / 20.05-L4は補強 / 厳密ゲート適用しない（軽量検証のみ）。

## 入力
- `/Users/hikumasoutosabu/Downloads/omoi-review-results (4).md`（246セクション）
- `/Users/hikumasoutosabu/Downloads/omoi-review-decisions.json`（allow 239 / conditional 7 / reject 0）

## 出力
- `review-parsed.json`: 246件の enriched 中間表（reviewId, origLevel, finalLevel, decision, questionOriginal/Final, reason, background, proposal）
- `level3-proposed.json`: 最終Level=3 の提案 125件（JSON投入可能形）
- `level4-proposed.json`: 最終Level=4 の提案 121件
- `conditional-fixes.md`: 条件付き7件の修正前後
- `verification-report.json`: 件数・重複・L4比率レポート
- `README.md`: 本ファイル

## 件数
- 元: L3 123 / L4 123（計246）
- 最終: L3 125（+3 -1）/ L4 121（+1 -3）。入替は 13.03-L3→L4、20.01-L4→L3、20.02-L4→L3、20.03-L4→L3。
- 既存と合算すると L3 168+125=293、L4 232+121=353、全体 643+246=889になる見込み。

## 変換ルール（軽量版）
- `question`: 候補をそのまま使用。7件のみ `conditional-fixes.md` どおり修正。
- `detail.text`: 背景・対立する点 ＋ `\n\n問いの狙い: `＋候補理由。結論押し付けなし。
- `id`: `r6-<reviewId小文字>`（例 `r6-01-01-l3`）。レベル変更分は最終Levelを反映し `-conv` 付与（例 `r6-13-03-l4-conv`、`r6-20-01-l3-conv`）で既存・対 counterpart と衝突回避。既存ID重複0確認済み。
- `category`: prefix対応（01社会政策/01.02司法/01.06文化、02社会政策、03労働経済、04社会政策＋04.02/04.06健康、05/06社会政策、07/08/09技術メディア、10司法、11労働経済、12家族・学校、13健康、14.01/14.02文化・他社会政策、15/16ジェンダー、17家族・ジェンダー、18/19関係、20文化）。分布は verification-report の categoryProposed 参照。
- `topic`: `<領域slug>_<reviewId>`（例 `immigration_01-01-l3`）。空文字なし。
- `sensitivity`: L4=4、L3=3 baseline。L3で discrimination/sexual/self_harm を含むものは4。
- `perspective`: L3は observer中心（国・行政への政策問いは decision_maker）。L4は affected/actor/decision_maker に分散。初期案で decision_maker が20%割れ（16.1%）したため、運営・予算・編集など他者決定を伴う16件（01.05-L4, 02.01-L4, 02.04-L4, 05.02-L4, 06.02-L4, 06.04-L4, 07.03-L4, 08.02-L4, 09.01-L4, 09.02-L4, 11.02-L4, 11.05-L4, 13.05-L4, 16.01-L4, 20.09-L4, 20.10-L4）を decision_maker に補正。最終比率 affected 47.6% / actor 23.8% / decision_maker 20.7% で `--enforce-quality-targets` の20%条件を満たす。
- `role`: 今回は最小限（保護者のみ等）。必要なら追加。
- `content_warning`: 精緻化済み（不倫→infidelity 20、犯罪→crime 23、差別→discrimination 21、性暴力→sexual 11、虐待→abuse 10、家族→family 10、privacy 7、medical 6、self_harm 4、pregnancy 3、なし146）。介護のみ・汎用AI/SNSのみでは付与しない。

## 軽量検証結果（厳密ゲート skip）
- 構造: 提案246件すべて category/perspective/sensitivity/detail.text 正常、levelとファイル対応正常。
- ID重複: 既存643＋提案246で重複0。
- 質問文重複（正規化後）: 既存との重複0、ステージング内重複0。
- L4比率: 上記の通り3視点とも20%以上。
- 未実施（ユーザー選択）: Claim Ledger更新、一次資料確認。`detail_without_sources` warning は既存同様に残る想定。

## 注意・要レビュー
- 13.03-L3→L4 は既存13.03-L4とテーマ近接。両立／片方除外を要判断。
- 20.01/02/03 のL3降格分は既存同番号L3と切分け済みだが、意味近接のため文言最終確認推奨。
- content_warning は広めに付与しているため、本反映前に絞り込み推奨。
- 本反映手順（承認後）: `level3-proposed.json` を `level3.json` へ追記、`level4-proposed.json` を `level4.json` へ追記し、`node tools/verify-question-dataset.mjs --enforce-quality-targets --summary` と `node --test tools/question-flow.test.mjs` を実行。

## 再生成方法
- `node /tmp/build-staging.mjs` → `node /tmp/fix-persp.mjs` → `node /tmp/light-verify.mjs`
- 元MD・decisions.json を更新したら再実行。
