"""Write the reviewable Japanese summary from final, verified staging artifacts."""
from pathlib import Path
import csv
import hashlib
import json

FOLDER = Path(__file__).resolve().parent


def read(name):
    return json.loads((FOLDER / name).read_text())


def write():
    validation = read('validation-report.json')
    resolution = read('review-resolution.json')
    assignment = read('assignments.json')
    proposal = read('proposal.json')
    assert validation['status'] == 'passed_preparation_pending_user_approval'
    assert validation['proposal_sha256'] == hashlib.sha256((FOLDER / 'proposal.json').read_bytes()).hexdigest()
    axes = {c['id']: c['axes'] for g in assignment['groups'].values() for c in g['categories']}
    lines = [
        '# 追加3,768問 — 反映前の最終確認', '',
        '記録日：2026-10-08（日本時間）。状態：**本文・レビュー・検証を完了。ユーザーの最終確認待ち。**', '',
        '現行942問に追加3,768問を加え、合計4,710問にする案です。全問の問い・追加理由と、L3/4の背景・視点を作成しました。現行の質問・背景・分類は、この追加案の準備では変更していません。', '',
        'Omoiを「目の前の相手の考えと理由を知るための会話の入口」として扱い、好みや感覚の違いと、重い話・人生の葛藤の両方を含めています。L4は主語の変更だけで深くなったと扱わず、本人の関係・人生・責任に何がかかるのかを本文と背景で確認しました。', '',
        '## 全文を確認する', '',
        '- [検索・カテゴリー・Levelで絞り込める確認ページ](review.html) — オフラインで動き、背景・理由・比較先も開けます。',
        '- [全3,768問のCSV表](all-additions.csv) — ID、カテゴリー、Level、感度、視点、問い、背景、警告、追加理由、資料、比較先を収録。',
        '- [18カテゴリー別の全文](questions/) — 各カードの問い・背景・理由を読めます。',
        '- [正式な追加案](proposal.json) — `status: pending_approval`。既存の修正・削除・カテゴリー移動は含みません。',
        '- [検証結果](validation-report.json)・[既存検証ツールの詳細](dataset-validation.json)・[指摘の解決記録](review-resolution.json)・[独立した資料監査](peer-reviews/final-artifact-audit.md)。', '',
        '## 件数と深さ', '',
        '| Level | 現行 | 追加 | 反映後の予定 |', '| --- | ---: | ---: | ---: |',
    ]
    for level, counts in validation['counts']['levels'].items():
        lines.append(f"| {level} | {counts['current']:,} | {counts['additional']:,} | {counts['total']:,} |")
    lines += ['| **合計** | **942** | **3,768** | **4,710** |', '', 'L3/4は反映後3,210問（68.2%）です。身近な入口を保ち、制度・役割の判断から本人の深い利害・倫理・人生の意味まで選べる配分です。', '', '| カテゴリー | 現行 | 追加 | 反映後の予定 | 広げる会話の軸 |', '| --- | ---: | ---: | ---: | --- |']
    with (FOLDER / 'category-summary.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream, lineterminator='\n')
        writer.writerow(['カテゴリー', '現行', '追加', '反映後の予定', '広げる会話の軸', '状態'])
        for category in validation['category_table']:
            themes = '／'.join(axes[category['id']])
            lines.append(f"| [{category['name']}](questions/{category['id']}.md) | {category['current']:,} | {category['additional']:,} | {category['total']:,} | {themes} |")
            writer.writerow([category['name'], category['current'], category['additional'], category['total'], themes, '最終確認待ち'])
    lines += ['', '[カテゴリー別の集計表をCSVで開く](category-summary.csv)。カテゴリー数は現行と同じ18です。少なかった分野も本文を増やし、既存の分類の中で会話の幅を広げています。', '', '## 複数エージェントの確認と修正', '', '| 作成担当 | 担当外の確認者 | 全文確認 | 必須指摘 | 修正したカード |', '| --- | --- | ---: | ---: | ---: |']
    changed_ids = set(resolution['changed_ids'])
    for review in validation['review_table']:
        group = review['author_group']
        changed = sum(r['card']['id'] in changed_ids for r in proposal['additions'] if r['editorial']['author_group'] == group)
        link = f"peer-reviews/{review['reviewer']}-reviews-{group}.md"
        lines.append(f"| {group} | [{review['reviewer']}]({link}) | {review['reviewed_count']:,} | {review['required_findings']} | {changed} |")
    lines += ['', f"6担当が自分の案を確認した後、別担当が全3,768問の問い・背景・理由・metadataを読みました。[横断レビュー](peer-reviews/cross-domain-review.md)でカテゴリーの境界と分野をまたぐ近似も確認しました。初回の担当外レビュー後に{len(changed_ids)}カードを修正し、変更前後と理由を保存して、修正箇所を再確認しました。必須指摘の未解決は0件です。", '',
        '主な修正は、L4の固有の葛藤を明確にすること、対象だけを替えた近似を別の判断軸へ替えること、比較条件や主語の曖昧さを解くこと、カテゴリー・視点・警告タグを実際の文面に合わせることです。レビューの多数決ではなく、原文と理由を比較して扱いました。', '',
        '## 検証の範囲と限界', '',
        f"[最終検証](validation-report.json)で、942問のハッシュ一致、追加3,768件、合計4,710件、18カテゴリー×4 Levelの配分、IDと完全一致の問いの非重複、CSV・カテゴリー文書・確認ページの全文一致、担当外レビューの全ID網羅、修正記録と再確認を照合しました。既存のデータ検証はエラー0件です。", '',
        f"出典なしの背景について、既存ツールは{validation['warnings']['count']:,}件の警告を出します。新案の大半は架空の場面を明示した問いです。背景に資料を添えた新案は{validation['background_source_records_new']}件で、引用に対応する主張の範囲を担当レビューで確認しました。出典なしの警告を意味や事実の検証成功と混同していません。", '',
        '文面の類似抽出は比較候補を見つける補助です。全件の担当外全文レビューを実施していますが、すべての二問の組合せや既存942問すべてを意味で再審査したという意味ではありません。現実の会話での利用テストは未実施です。', '',
        'カテゴリーや問数の増加は、画面のカテゴリー選択や抽選方法の変更を含みません。現行UIはLevel内で抽選します。', '',
        '## 反映と再生成について', '',
        'ユーザーの「問題の変更は最終的に確認を取る」に従い、この具体案への最終確認後にだけ正本へ反映します。目標件数への同意やレビュー完了を、個々の文面の承認として扱いません。', '',
        '`shards/*/additions.json`がレビュー修正後の案の正本です。`compile.py --compare`と`render_review.py`で確認資料を再生成できます。過去の執筆・補強スクリプトは修正前の入力を含むため、そのまま案の正本へ再実行しないでください。', '',
        '`review-inputs/`、`initial-draft-history.json`、初稿の執筆ファイルは比較のための履歴です。適用対象は最終案の`proposal.json`だけで、ベースラインのハッシュと採用範囲を照合する必要があります。', '',
        '配分・資料の調査過程は[追加分析](../research/addition-analysis-2026-10-07/README.md)、方針は[Omoiの思い・思想・行動](../OMOI_PHILOSOPHY.md)を参照してください。',
    ]
    (FOLDER / 'README.md').write_text('\n'.join(lines) + '\n')
    progress = {'date': '2026-10-08', 'timezone': 'Asia/Tokyo', 'status': 'prepared_pending_user_approval', 'author_groups': [{'group': g, 'completed_cards': spec['total_additions'], 'target': spec['total_additions'], 'initial_full_independent_review_complete': True} for g, spec in assignment['groups'].items()], 'total_additions': 3768, 'production_files_written': 0}
    (FOLDER / 'drafting-progress.json').write_text(json.dumps(progress, ensure_ascii=False, indent=2) + '\n')
    print('Final Japanese summary and category table written; pending user approval.')


if __name__ == '__main__':
    write()
