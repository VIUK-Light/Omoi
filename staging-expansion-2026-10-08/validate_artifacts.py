"""Check final review artifacts against the pending proposal; never change live data.

This validates records, counts, review coverage and exported text. Semantic review
and factual source checks remain the separate reviewers' documented work.
"""
from pathlib import Path
from collections import Counter
import csv
import hashlib
import json
import re
import unicodedata

FOLDER = Path(__file__).resolve().parent
REPO = FOLDER.parent


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate():
    assignment = read(FOLDER / 'assignments.json')
    proposal = read(FOLDER / 'proposal.json')
    checks = []

    def check(name, condition, evidence=None):
        assert condition, (name, evidence)
        checks.append({'check': name, 'status': 'passed', 'evidence': evidence})

    check('proposal_requires_final_approval', proposal['status'] == 'pending_approval')
    check('addition_only_scope', not any(proposal[k] for k in ['new_categories', 'revisions', 'category_moves']))
    hashes = {f'level{i}.json': sha(REPO / f'level{i}.json') for i in range(1, 5)}
    check('live_942_cards_unchanged', hashes == assignment['baseline_sha256'] == proposal['baseline_sha256'], hashes)
    baseline = sum([read(REPO / f'level{i}.json') for i in range(1, 5)], [])
    rows = proposal['additions']
    cards = [r['card'] for r in rows]
    check('exact_total', len(baseline) == 942 and len(rows) == 3768 and len(baseline + cards) == 4710)
    check('unique_ids', len({c['id'] for c in baseline + cards}) == 4710)
    normalize = lambda s: re.sub(r'[\W_]+', '', unicodedata.normalize('NFKC', s)).casefold()
    check('no_exact_normalized_question_duplicates', len({normalize(c['question']) for c in baseline + cards}) == 4710)
    check('all_individual_reasons_present', all(r['reason'].strip() for r in rows))
    live_ids = {c['id'] for c in baseline}
    check('authored_existing_references_resolve', all(ref in live_ids for r in rows for ref in r.get('editorial', {}).get('related_existing_ids', [])))
    check('factual_status_and_source_scope_explicit', all(
        r['editorial']['fact_status'] in ['hypothetical', 'sourced']
        and (r['editorial']['fact_status'] != 'sourced' or bool(r['card'].get('detail', {}).get('sources')))
        and (r['editorial']['fact_status'] != 'hypothetical' or not r['card'].get('detail', {}).get('sources') or (
            bool(r['editorial'].get('source_review_scope', '').strip())
            and any(marker in r['card']['detail']['text'] for marker in ['仮', '架空'])
        ))
        for r in rows
    ))

    category_table = []
    for group, spec in assignment['groups'].items():
        shard = read(FOLDER / 'shards' / group / 'additions.json')
        check(f'shard_matches_proposal_{group}', shard == [r for r in rows if r['editorial']['author_group'] == group])
        for category in spec['categories']:
            cid = category['id']
            added_levels = [sum(c['category'] == cid and c['level'] == level for c in cards) for level in range(1, 5)]
            total_levels = [sum(c['category'] == cid and c['level'] == level for c in baseline + cards) for level in range(1, 5)]
            check(f'category_level_allocation_{cid}', added_levels == category['additional_levels'] and total_levels == category['target_levels'])
            category_table.append({'id': cid, 'name': category['name'], 'current': sum(category['current_levels']), 'additional': sum(added_levels), 'total': sum(total_levels)})
    levels = {str(level): {'current': sum(c['level'] == level for c in baseline), 'additional': sum(c['level'] == level for c in cards), 'total': sum(c['level'] == level for c in baseline + cards)} for level in range(1, 5)}
    check('level_targets', [v['total'] for v in levels.values()] == [700, 800, 1360, 1850])

    exported = list(csv.DictReader((FOLDER / 'all-additions.csv').open(encoding='utf-8-sig', newline='')))
    check('csv_exact_full_text_round_trip', len(exported) == len(rows) and all(e['ID'] == r['card']['id'] and e['問い'] == r['card']['question'] and e['背景'] == r['card'].get('detail', {}).get('text', '') and e['追加理由'] == r['reason'] and e['状態'] == '最終確認待ち' for e, r in zip(exported, rows)))
    for category in category_table:
        text = (FOLDER / 'questions' / (category['id'] + '.md')).read_text()
        chosen = [r for r in rows if r['card']['category'] == category['id']]
        check(f'category_document_{category["id"]}', re.findall(r'^## (exp26-\S+)$', text, re.M) == [r['card']['id'] for r in chosen] and all(r['card']['question'] in text and r['reason'] in text and r['card'].get('detail', {}).get('text', '') in text for r in chosen))
    html = (FOLDER / 'review.html').read_text()
    payload = json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S)[1])
    check('offline_review_exact_final_content', payload['additions'] == rows and payload['baseline'] == baseline and len(payload['categories']) == 18)
    comparisons = read(FOLDER / 'comparison-candidates.json')['per_addition']
    check('comparison_candidates_cover_all_additions', {r['id'] for r in comparisons} == {c['id'] for c in cards})
    questions_by_id = {c['id']: c['question'] for c in baseline + cards}
    check('comparison_candidate_original_questions_match', all(n['question'] == questions_by_id[n['id']] for r in comparisons for n in r['neighbors']))

    review_assignments = read(FOLDER / 'peer-review-assignments.json')['assignments']
    snapshots = read(FOLDER / 'review-inputs' / 'manifest.json')['groups']
    covered = []
    review_table = []
    for task in review_assignments:
        group = task['author_group']
        path = FOLDER / 'peer-reviews' / f'{task["reviewer"]}-reviews-{group}.json'
        report = read(path)
        source = snapshots[group]
        original = read(FOLDER / source['file'])
        reported_hash = next((report[k] for k in ['reviewed_shard_sha256', 'shard_sha256_at_completion', 'shard_sha256', 'input_sha256', 'source_sha256', 'snapshot_sha256'] if report.get(k)), None)
        check(f'independent_full_review_{group}', report['reviewed_count'] == task['expected_count'] and len(report['reviewed_ids']) == task['expected_count'] and set(report['reviewed_ids']) == {r['card']['id'] for r in original} and reported_hash == source['sha256'] == sha(FOLDER / source['file']) and 'in_progress' not in report['status'])
        covered.extend(report['reviewed_ids'])
        review_table.append({'reviewer': task['reviewer'], 'author_group': group, 'reviewed_count': report['reviewed_count'], 'required_findings': sum(f['priority'] == 'required' for f in report['findings']), 'optional_findings': sum(f['priority'] == 'optional' for f in report['findings']), 'input_sha256': reported_hash})
    check('initial_independent_review_covers_every_addition_once', Counter(covered) == Counter(c['id'] for c in cards))

    resolutions = read(FOLDER / 'review-resolution.json')
    check('no_unresolved_required_findings', resolutions['unresolved_required_findings'] == [])
    final_hashes = {g: sha(FOLDER / 'shards' / g / 'additions.json') for g in assignment['groups']}
    check('resolution_matches_final_shards', resolutions['final_shard_sha256'] == final_hashes)
    changed = []
    final_by_id = {r['card']['id']: r for r in rows}
    for group in assignment['groups']:
        original = read(FOLDER / snapshots[group]['file'])
        changed.extend(r['card']['id'] for r in original if r != final_by_id[r['card']['id']])
    check('changed_cards_recorded_and_rechecked', set(changed) == set(resolutions['changed_ids']) == set(resolutions['targeted_recheck_ids']))
    dataset = read(FOLDER / 'dataset-validation.json')
    dataset_run = read(FOLDER / 'dataset-validation-run.json')
    check('dataset_validator_matches_final_input', dataset_run['status'] == 'passed' and dataset_run['exit_code'] == 0 and dataset_run['proposal_sha256'] == sha(FOLDER / 'proposal.json') and dataset_run['baseline_sha256'] == hashes and dataset_run['report_sha256'] == sha(FOLDER / 'dataset-validation.json'))
    check('existing_dataset_validator', dataset['totalRecords'] == 4710 and dataset['errors'] == [], {'errors': 0, 'warnings': len(dataset['warnings']), 'finding_codes': dataset['findingCodeCounts']})
    browser = read(FOLDER / 'review-ui-check.json')
    check('review_browser_check_passed_on_final_artifact', browser['status'] == 'passed' and browser.get('proposal_sha256') == sha(FOLDER / 'proposal.json') and browser.get('review_html_sha256') == sha(FOLDER / 'review.html'))

    result = {'status': 'passed_preparation_pending_user_approval', 'prepared_date': '2026-10-08', 'timezone': 'Asia/Tokyo', 'production_files_written': 0, 'baseline_sha256': hashes, 'proposal_sha256': sha(FOLDER / 'proposal.json'), 'checks': checks, 'counts': {'current': 942, 'additional': 3768, 'proposed_total': 4710, 'categories': 18, 'levels': levels}, 'category_table': category_table, 'review_table': review_table, 'changed_after_initial_peer_review': len(changed), 'level4_perspectives_new': dict(Counter(c['perspective'] for c in cards if c['level'] == 4)), 'background_source_records_new': sum(bool(c.get('detail', {}).get('sources')) for c in cards), 'warnings': {'count': len(dataset['warnings']), 'codes': dataset['findingCodeCounts'], 'interpretation': 'Most new backgrounds explicitly describe fictional scenarios. The existing validator warns about backgrounds without sources regardless of this distinction. See source and editorial reviews for their factual scope.'}, 'limitations': ['String and character comparisons do not prove semantic uniqueness.', 'All 3,768 additions had independent full reading; this does not imply every possible pair or all 942 baseline cards had full semantic review.', 'Changed cards were rechecked against the stated findings; no real conversation usability trial was performed.', 'Source checks cover the specific factual statements cited, not all related medical, legal or social literature.', 'The live application and random selection UI have not changed. The target size is a pending proposal.']}
    (FOLDER / 'validation-report.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': result['status'], 'checks_passed': len(checks), 'counts': result['counts'], 'changed_cards': len(changed), 'warnings': len(dataset['warnings'])}, ensure_ascii=False))


if __name__ == '__main__':
    validate()
