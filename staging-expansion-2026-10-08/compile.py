"""Compile and compare pending additions. Never writes to the live dataset."""
from pathlib import Path
from collections import Counter
import csv, hashlib, json, re, unicodedata
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import numpy as np

FOLDER = Path(__file__).resolve().parent
REPO = FOLDER.parent

def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def normalize(question):
    return re.sub(r'[\W_]+', '', unicodedata.normalize('NFKC', question)).casefold()

def compile_proposal():
    assignment = json.loads((FOLDER / 'assignments.json').read_text())
    current_hashes = {f'level{i}.json': hashlib.sha256((REPO / f'level{i}.json').read_bytes()).hexdigest() for i in range(1, 5)}
    assert current_hashes == assignment['baseline_sha256'], 'Current dataset changed: review baseline before compiling.'
    live = sum([json.loads((REPO / f'level{i}.json').read_text()) for i in range(1, 5)], [])
    additions = []
    summaries = []
    for group, spec in assignment['groups'].items():
        path = FOLDER / 'shards' / group / 'additions.json'
        rows = json.loads(path.read_text())
        assert len(rows) == spec['total_additions'], (group, len(rows), spec['total_additions'])
        for category in spec['categories']:
            counts = [sum(r['card']['category'] == category['id'] and r['card']['level'] == level for r in rows) for level in range(1, 5)]
            assert counts == category['additional_levels'], (group, category['id'], counts, category['additional_levels'])
        assert all(r['reason'].strip() and r['card']['id'].startswith(f'exp26-{group}-') for r in rows), group
        additions.extend(rows)
        summaries.append({'group': group, 'additions': len(rows), 'levels': dict(Counter(str(r['card']['level']) for r in rows))})
    assert len(additions) == 3768 and len(live) + len(additions) == 4710
    all_cards = live + [r['card'] for r in additions]
    assert len({r['id'] for r in all_cards}) == len(all_cards), 'Duplicate card IDs.'
    exact_groups = {}
    for card in all_cards:
        exact_groups.setdefault(normalize(card['question']), []).append(card['id'])
    duplicate_groups = [ids for ids in exact_groups.values() if len(ids) > 1]
    proposal = {'version': 1, 'status': 'pending_approval', 'prepared_date': '2026-10-08', 'timezone': 'Asia/Tokyo', 'scope': '3,768 additions only. No changes or deletion to the current 942 cards. Final question approval is required before applying.', 'baseline_sha256': current_hashes, 'new_categories': [], 'revisions': [], 'category_moves': [], 'additions': additions}
    dump(FOLDER / 'proposal.json', proposal)
    dump(FOLDER / 'compilation-report.json', {'status': 'compiled_for_review', 'current_count': len(live), 'additions_count': len(additions), 'proposed_total': len(all_cards), 'author_groups': summaries, 'exact_normalized_duplicates': duplicate_groups, 'baseline_unchanged': True, 'production_files_written': 0})
    return live, additions

def compare(live, additions):
    cards = live + [r['card'] for r in additions]
    baseline_size = len(live)
    author_by_id = {r['card']['id']: r['editorial']['author_group'] for r in additions}
    corpus = [normalize(r['question']) for r in cards]
    vectors = TfidfVectorizer(analyzer='char', ngram_range=(2, 4), min_df=1, dtype=np.float32).fit_transform(corpus)
    comparisons = []
    pair_map = {}
    for start in range(baseline_size, len(cards), 128):
        stop = min(start + 128, len(cards))
        scores = linear_kernel(vectors[start:stop], vectors)
        for offset, line in enumerate(scores):
            index = start + offset
            line[index] = -1
            previous = np.argsort(line[:baseline_size])[-3:][::-1]
            other_new = np.argsort(line[baseline_size:])[-3:][::-1] + baseline_size
            neighbors = []
            for neighbor in list(previous) + list(other_new):
                score = float(line[neighbor])
                neighbors.append({'id': cards[neighbor]['id'], 'similarity': round(score, 4), 'current': int(neighbor) < baseline_size, 'question': cards[neighbor]['question']})
                if score >= .43:
                    key = tuple(sorted([cards[index]['id'], cards[neighbor]['id']]))
                    if key not in pair_map:
                        pair_map[key] = {'ids': list(key), 'similarity': round(score, 4), 'cards': [cards[index], cards[neighbor]], 'author_groups': sorted({author_by_id[card_id] for card_id in key if card_id in author_by_id})}
            comparisons.append({'id': cards[index]['id'], 'comparison_kind': 'character_ngram_candidates_not_semantic_verdict', 'neighbors': neighbors})
    pairs = sorted(pair_map.values(), key=lambda pair: pair['similarity'], reverse=True)
    dump(FOLDER / 'comparison-candidates.json', {'method': 'Character 2–4 gram TF-IDF cosine. This only proposes similar wording for human/agent comparison; it does not certify semantic uniqueness.', 'current_count': baseline_size, 'new_count': len(additions), 'per_addition': comparisons})
    dump(FOLDER / 'overlap-review-queue.json', {'method': 'Pairs with character ngram cosine >= 0.43. Review text and background before deciding.', 'pair_count': len(pairs), 'pairs': pairs})
    for group in json.loads((FOLDER / 'assignments.json').read_text())['groups']:
        dump(FOLDER / 'shards' / group / 'overlap-queue.json', [p for p in pairs if group in p['author_groups']])
    print(json.dumps({'comparison_candidates': len(comparisons), 'review_pairs': len(pairs), 'top_similarities': [p['similarity'] for p in pairs[:10]]}))

def export(live, additions):
    comparisons_path = FOLDER / 'comparison-candidates.json'
    neighbors = {r['id']: r['neighbors'] for r in json.loads(comparisons_path.read_text())['per_addition']} if comparisons_path.exists() else {}
    labels = {c['id']: c['name'] for g in json.loads((FOLDER / 'assignments.json').read_text())['groups'].values() for c in g['categories']}
    with (FOLDER / 'all-additions.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream, lineterminator='\n')
        writer.writerow(['ID', 'カテゴリー', 'Level', '感度', '視点', '小分類', '問い', '背景', '警告タグ', '追加理由', '出典URL', '作成時の比較先ID', '文面比較候補の既存ID（意味の判定ではない）', '状態'])
        for row in additions:
            c = row['card']
            writer.writerow([c['id'], labels[c['category']], c['level'], c['sensitivity'], c.get('perspective', ''), c['topic'], c['question'], c.get('detail', {}).get('text', ''), ' / '.join(c.get('content_warning', [])), row['reason'], ' / '.join(s['url'] for s in c.get('detail', {}).get('sources', [])), ' / '.join(row.get('editorial', {}).get('related_existing_ids', [])), ' / '.join(n['id'] for n in neighbors.get(c['id'], []) if n['current'] and n['similarity'] >= .18), '最終確認待ち'])
    review_folder = FOLDER / 'questions'
    review_folder.mkdir(exist_ok=True)
    for category, label in labels.items():
        chosen = [r for r in additions if r['card']['category'] == category]
        lines = [f'# {label} — 追加{len(chosen)}問', '', '状態：未承認。個々の文面・背景・metadataを確認するための一覧。正本は変更していない。', '']
        for row in chosen:
            c = row['card']
            lines += [f"## {c['id']}", '', f"L{c['level']} / 感度{c['sensitivity']} / topic `{c['topic']}`" + (f" / 視点 `{c['perspective']}`" if 'perspective' in c else ''), '', c['question'], '']
            if c.get('detail'):
                lines += ['背景：' + c['detail']['text'], '']
            lines += ['追加理由：' + row['reason'], '']
            if c.get('content_warning'):
                lines += ['警告タグ：' + '、'.join(c['content_warning']), '']
            sources = c.get('detail', {}).get('sources', [])
            if sources:
                lines += ['確認資料：' + ' / '.join(f"[{s['title']}]({s['url']})" for s in sources), '']
            authored_refs = row.get('editorial', {}).get('related_existing_ids', [])
            if authored_refs:
                lines += ['作成時の比較先：' + '、'.join('`' + card_id + '`' for card_id in authored_refs) + '。比較範囲は担当のレビュー記録を参照。', '']
            found = [n for n in neighbors.get(c['id'], []) if n['current'] and n['similarity'] >= .18]
            if found:
                lines += ['既存との機械比較候補：' + '、'.join('`' + n['id'] + '`' for n in found) + '。意味の同一性を判定した一覧ではない。', '']
        (review_folder / f'{category}.md').write_text('\n'.join(lines).rstrip() + '\n')

if __name__ == '__main__':
    import sys
    live, additions = compile_proposal()
    if '--compare' in sys.argv:
        compare(live, additions)
    export(live, additions)
    print('Compiled 3,768 pending additions; production files written: 0.')
