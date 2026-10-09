"""Assemble final traceability from reviewed corrections and independent rechecks.

The recorded semantic decisions come from the agents and root's reading, not
from automatic similarity scores. Refuse to produce a final record until all
changed cards have a matching completed independent recheck.
"""
from pathlib import Path
import hashlib
import json

FOLDER = Path(__file__).resolve().parent


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def reason(change):
    original = change.get('reason') or change.get('rationale') or change.get('resolution_reason')
    return '／'.join(dict.fromkeys(value for value in [original, change.get('followup_reason')] if value))


def assemble():
    assignment = read(FOLDER / 'assignments.json')
    logs = {group: read(FOLDER / 'applied-review-drafts' / (group + '.json')) for group in assignment['groups']}
    changes = {c['id']: c for log in logs.values() for c in log['changes']}
    rechecks = {}
    final_hashes = {}
    recheck_findings = []
    for group, log in logs.items():
        shard = FOLDER / 'shards' / group / 'additions.json'
        final_hashes[group] = sha(shard)
        final_rows = {r['card']['id']: r for r in read(shard)}
        original_rows = {r['card']['id']: r for r in read(FOLDER / 'review-inputs' / (group + '.json'))}
        actual_changed = {cid for cid, before in original_rows.items() if before != final_rows[cid]}
        logged_changed = {c['id'] for c in log['changes']}
        assert actual_changed == logged_changed and log['final_sha256'] == final_hashes[group]
        assert all(c['before'] == original_rows[c['id']] and c['after'] == final_rows[c['id']] for c in log['changes'])
        report = read(FOLDER / 'peer-reviews' / ('recheck-' + group + '.json'))
        assert report['status'] in ['passed_staging_not_approved', 'reviewed_not_approved', 'rechecked_not_approved', 'rechecked_required_findings_resolved_not_approved'], (group, report['status'])
        assert report['final_shard_sha256'] == final_hashes[group]
        assert set(report['reviewed_ids']) == actual_changed and len(report['reviewed_ids']) == len(actual_changed)
        assert not report.get('open_findings'), group
        assert all(finding.get('status', '').startswith('resolved') for finding in report.get('findings', []) if finding.get('priority') == 'required'), group
        rechecks[group] = {'file': 'peer-reviews/recheck-' + group + '.json', 'status': report['status'], 'reviewed_ids': report['reviewed_ids'], 'final_shard_sha256': final_hashes[group], 'scope': report['scope']}
        recheck_findings.extend({'group': group, 'review_file': rechecks[group]['file'], 'record': finding} for finding in report.get('findings', []))

    required = []
    optional = []
    adjudication_path = FOLDER / 'peer-reviews' / 'remaining-optional-adjudication.json'
    adjudication = read(adjudication_path)
    assert len(adjudication['adjudications']) == adjudication['requested_count'] == 18
    individual_decisions = {(a['source_review'], a['id']): a for a in adjudication['adjudications']}
    assert len(individual_decisions) == 18
    matched_individual_decisions = set()
    tasks = read(FOLDER / 'peer-review-assignments.json')['assignments']
    sources = [FOLDER / 'peer-reviews' / f'{t["reviewer"]}-reviews-{t["author_group"]}.json' for t in tasks]
    sources.append(FOLDER / 'peer-reviews' / 'cross-domain-review.json')
    for path in sources:
        report = read(path)
        for index, finding in enumerate(report['findings']):
            cid = finding['id']
            correction_ids = [cid] if cid in changes else ['exp26-learning-0093'] if cid == 'exp26-personal-0206' else []
            item = {'review_file': str(path.relative_to(FOLDER)), 'finding_index_zero_based': index, 'id': cid, 'priority': finding['priority'], 'field': finding.get('field'), 'original_issue': finding['issue']}
            if finding['priority'] == 'required':
                assert correction_ids, ('Required finding has no correction', path, cid)
                item.update({'action': 'card_revised_and_rechecked' if cid in changes else 'overlap_counterpart_revised_and_rechecked', 'correction_ids': correction_ids, 'rationale': '／'.join(reason(changes[x]) for x in correction_ids)})
                required.append(item)
            else:
                decision = individual_decisions.get((path.name, cid))
                if decision:
                    assert decision['original_issue'] == finding['issue']
                    matched_individual_decisions.add((path.name, cid))
                    revised = decision['decision'] == 'recommend_fix'
                    assert revised == (cid in changes)
                    item.update({'action': 'individual_revision_applied_and_rechecked' if revised else 'retained_after_original_text_comparison', 'correction_ids': correction_ids, 'rationale': decision['analysis'] + ' ' + decision['preserved_difference'], 'individual_decision_file': str(adjudication_path.relative_to(FOLDER)), 'individual_decision_id': decision['adjudication_id'], 'final_priority': decision['priority']})
                else:
                    assert cid in changes, ('An unchanged optional finding needs an individual retention reason', path, cid)
                    item.update({'action': 'card_has_revisions_see_before_after', 'correction_ids': correction_ids, 'rationale': reason(changes[cid]), 'scope_note': 'A revised card can have several findings. This flag is traceability, not an automatic assertion that every optional suggestion was adopted.'})
                optional.append(item)
    assert matched_individual_decisions == set(individual_decisions)
    additional_required = []
    for decision in adjudication['adjudications']:
        if decision['priority'] != 'required':
            continue
        cid = decision['id']
        assert cid in changes
        group = changes[cid]['after']['editorial']['author_group']
        assert cid in rechecks[group]['reviewed_ids']
        additional_required.append({'id': cid, 'finding_id': decision['adjudication_id'], 'review_file': str(adjudication_path.relative_to(FOLDER)), 'original_priority': decision['original_priority'], 'priority': 'required', 'status': 'resolved_in_staging_and_independently_rechecked', 'issue': decision['analysis'], 'correction_ids': [cid], 'rationale': reason(changes[cid]), 'recheck_file': rechecks[group]['file']})
    supplemental_path = FOLDER / 'peer-reviews' / 'recheck-civic-last-two.json'
    supplemental = read(supplemental_path)
    assert supplemental['status'] == 'passed_staging_not_approved'
    assert supplemental['final_shard_sha256'] == final_hashes['civic']
    assert set(supplemental['reviewed_ids']) == {'exp26-civic-0021', 'exp26-civic-0284'}
    assert {r['card']['id']: r for r in supplemental['reviewed_additions']} == {cid: changes[cid]['after'] for cid in supplemental['reviewed_ids']}
    assert not supplemental['open_findings']
    assert all(f.get('status', '').startswith('resolved') for f in supplemental.get('findings', []) if f.get('priority') == 'required')
    result = {'status': 'root_reviewed_and_independently_rechecked_staging_pending_user_approval', 'date': '2026-10-08', 'timezone': 'Asia/Tokyo', 'production_files_written': 0, 'decision_method': '原文・背景・理由で判断した。初回全3,768件を担当外で読んだ後、rootが採用する変更前後を実読し、さらに別担当が変更した全文を再確認した。文字列や意見数だけで決めていない。', 'required_resolutions': required, 'optional_dispositions': optional, 'recheck_finding_resolutions': recheck_findings, 'unresolved_required_findings': [], 'changed_ids': sorted(changes), 'targeted_recheck_ids': sorted(cid for r in rechecks.values() for cid in r['reviewed_ids']), 'independent_rechecks': rechecks, 'final_shard_sha256': final_hashes, 'correction_logs': {g: 'applied-review-drafts/' + g + '.json' for g in logs}, 'followup_scope': '再確認で生じた修正は各logのfollowup_draftsと各recheckの履歴・解決記録に保存。初回の全件読了と追記部分の実読を区別した。', 'limitations': ['全二問の意味の組合せ比較を証明する記録ではない。', '実際の会話での使いやすさを試験した記録ではない。', 'レビューはユーザーによる個々の問題変更の最終承認ではない。']}
    result['individual_remaining_optional_adjudication'] = {'file': str(adjudication_path.relative_to(FOLDER)), 'record': adjudication}
    result['additional_required_resolutions'] = additional_required
    result['supplemental_independent_rechecks'] = {'file': str(supplemental_path.relative_to(FOLDER)), 'record': supplemental}
    assert len(result['changed_ids']) == len(set(result['targeted_recheck_ids']))
    (FOLDER / 'review-resolution.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'initial_and_cross_required_findings_resolved': len(required), 'additional_required_findings_resolved': len(additional_required), 'optional_findings_recorded': len(optional), 'changed_cards': len(changes), 'unresolved_required': 0}))


if __name__ == '__main__':
    assemble()
