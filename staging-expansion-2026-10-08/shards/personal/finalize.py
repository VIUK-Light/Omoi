"""Attach reviewed editorial links; does not generate card prose."""
import json
from pathlib import Path
from collections import Counter

HERE = Path(__file__).resolve().parent
path = HERE / 'additions.json'
items = json.loads(path.read_text())
links = [
    ('何年も目指した目標を達成したが', ['relationship-144', 'bridge-035'], 'TP-06'),
    ('大切にしてきた信念が今の自分には', ['bridge-035'], None),
    ('人生のある道を選ばなかったことに', ['relationship-111'], None),
    ('自分をよく理解してくれた友達が', ['relationship-140'], None),
    ('長いすれ違いを話して関係を再開したら', ['relationship-116', 'relationship-152'], None),
    ('自分がしたことを相手はもう責めないが', ['relationship-152'], None),
    ('二人とも、もう一度関係を作りたいが', ['relationship-116'], None),
    ('自分の大きな迷いを話したが', ['bridge-004'], None),
    ('自分の人生の決断を、親しい相手が', ['relationship-104'], None),
    ('他者に役立つ活動へ参加する理由として', ['ethics-009'], None),
    ('長く貢献した人に、今後も続けるのが', ['ethics-009'], None),
    ('助けられる人が大勢いる場で', ['ethics-009'], None),
    ('よかれと思ってした行動が', ['ethics-007', 'bridge-031'], None),
    ('強く断言した意見を、今は少し変えたい', ['bridge-035'], None),
    ('他人には認めなかった例外が', ['ethics-002'], None),
    ('長く支えてきた仲間の行為に', ['relationship-139', 'r6-19-01-l4'], None),
    ('自分ができる限りを尽くしても', ['ethics-009'], None),
    ('自分は手を貸さなかった活動が', ['ethics-009'], None),
]
for prefix, ids, representative in links:
    matched = [x for x in items if x['card']['question'].startswith(prefix)]
    assert len(matched) == 1, prefix
    matched[0]['editorial']['related_existing_ids'] = ids
    if representative:
        matched[0]['editorial']['representative_analysis_id'] = representative

path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n')
report = {
    'date': '2026-10-08', 'status': 'author_reviewed_unapproved',
    'count': len(items),
    'by_category_level': dict(Counter(f"{x['card']['category']}/L{x['card']['level']}" for x in items)),
    'l4_perspectives': dict(Counter(x['card']['perspective'] for x in items if x['card']['level'] == 4)),
    'reviewed_ids': [x['card']['id'] for x in items],
    'fact_status': dict(Counter(x['editorial']['fact_status'] for x in items)),
    'scope': 'Author reread of all card texts and backgrounds; independent review remains separate.',
}
(HERE / 'author-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(report['count'], report['l4_perspectives'])
