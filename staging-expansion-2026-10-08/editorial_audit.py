"""Find editorial review candidates; no automatic judgments or card edits."""
from pathlib import Path
from collections import Counter, defaultdict
import json, re

folder = Path(__file__).resolve().parent
proposal = json.loads((folder / 'proposal.json').read_text())
additions = proposal['additions']
live = sum([json.loads((folder.parent / f'level{i}.json').read_text()) for i in range(1, 5)], [])
existing_ids = {c['id'] for c in live}
issues = []

def flag(row, code, note):
    c = row['card']
    issues.append({'id': c['id'], 'author_group': row['editorial']['author_group'], 'code': code, 'note': note, 'question': c['question'], 'detail': c.get('detail', {}).get('text', '')})

detail_groups = defaultdict(list)
reason_groups = defaultdict(list)
for row in additions:
    c = row['card']
    detail = c.get('detail', {}).get('text', '')
    if detail:
        detail_groups[re.sub(r'\s+', '', detail)].append(row)
    reason_groups[re.sub(r'\s+', '', row['reason'])].append(row)
    if len(c['question']) > 240:
        flag(row, 'long_question', '240字超。場面・比較条件を保ちつつ読める長さか確認。')
    if c['level'] >= 3 and len(detail) < 30:
        flag(row, 'short_background', '背景30字未満。問い固有の価値や不確実性を補助できるか確認。')
    if c['level'] == 4 and len(c['question']) < 45:
        flag(row, 'short_level4', '45字未満。本人の利害・倫理・意味の深さが文面にあるか確認。長さだけでは不合格にしない。')
    if row.get('editorial', {}).get('fact_status') == 'sourced' and not c.get('detail', {}).get('sources'):
        flag(row, 'source_status_without_source', 'sourced状態だが背景に出典なし。事実主張と根拠を確認。')
    if set(row.get('editorial', {}).get('related_existing_ids', [])) - existing_ids:
        flag(row, 'unknown_existing_reference', '比較先として存在しない既存IDがある。')
    if re.search(r'法律では|法的に義務|日本では|必ず治|治療効果|研究によると|調査では|統計では|法律上は', c['question'] + detail) and not c.get('detail', {}).get('sources'):
        flag(row, 'possible_unsourced_fact', '制度・医療・調査の事実断定に見える語句。仮の条件か、確認済み資料が必要かを読む。')

for groups, code in [(detail_groups, 'identical_background'), (reason_groups, 'identical_addition_reason')]:
    for text, rows in groups.items():
        if len(rows) > 1:
            for row in rows:
                flag(row, code, f"同じ文面が{len(rows)}件。主題固有の説明になっているか確認。")

report = {'status': 'review_candidates_only', 'scope': 'Automated flags identify text to inspect. They do not measure Omoi fit, semantic uniqueness, correctness or approval.', 'additions_inspected': len(additions), 'issue_count': len(issues), 'codes': dict(Counter(i['code'] for i in issues)), 'issues': issues}
(folder / 'editorial-review-queue.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
for group in json.loads((folder / 'assignments.json').read_text())['groups']:
    (folder / 'shards' / group / 'editorial-queue.json').write_text(json.dumps([i for i in issues if i['author_group'] == group], ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'issue_count': len(issues), 'codes': report['codes']}, ensure_ascii=False))
