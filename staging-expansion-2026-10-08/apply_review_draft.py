"""Apply a root-reviewed correction artifact to an unapproved staging shard only.

The complete original input and exact before/after rows stay in the review log.
This script cannot modify level*.json or apply the pending proposal to live data.
"""
from pathlib import Path
import hashlib
import json
import sys

FOLDER = Path(__file__).resolve().parent


def read(path):
    return json.loads(path.read_text())


def dump(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def change_reason(change):
    return change.get('reason') or change.get('rationale') or change.get('resolution_reason') or ''


def apply(group, draft_name):
    spec = read(FOLDER / 'assignments.json')['groups'][group]
    path = FOLDER / 'shards' / group / 'additions.json'
    draft_path = (FOLDER / draft_name).resolve()
    assert draft_path.is_relative_to(FOLDER / 'resolution-drafts')
    draft = read(draft_path)
    source_sha = hashlib.sha256(path.read_bytes()).hexdigest()
    assert draft['source_sha256'] == source_sha, 'Staging input changed since the correction draft was prepared.'
    rows = read(path)
    indices = {r['card']['id']: i for i, r in enumerate(rows)}
    ids = [c['id'] for c in draft['changes']]
    assert len(set(ids)) == len(ids)
    for change in draft['changes']:
        before, after = change['before'], change['after']
        assert rows[indices[change['id']]] == before
        assert before['card']['id'] == after['card']['id'] == change['id']
        assert before != after and change_reason(change).strip(), change['id']
        for field in ['level', 'category']:
            assert before['card'][field] == after['card'][field], field
        assert after['editorial']['author_group'] == group
        rows[indices[change['id']]] = after
    assert len(rows) == spec['total_additions']
    for category in spec['categories']:
        assert [sum(r['card']['category'] == category['id'] and r['card']['level'] == level for r in rows) for level in range(1, 5)] == category['additional_levels']
    log_folder = FOLDER / 'applied-review-drafts'
    log_folder.mkdir(exist_ok=True)
    log_path = log_folder / (group + '.json')
    previous_log = read(log_path) if log_path.exists() else None
    if previous_log:
        assert previous_log['final_sha256'] == source_sha
    dump(path, rows)
    final_sha = hashlib.sha256(path.read_bytes()).hexdigest()
    if previous_log:
        previous_log.setdefault('followup_drafts', []).append({'draft': str(draft_path.relative_to(FOLDER)), 'source_sha256': source_sha, 'final_sha256': final_sha, 'changes': draft['changes'], 'finding_resolutions': draft['finding_resolutions']})
        earlier = {c['id']: c for c in previous_log['changes']}
        for change in draft['changes']:
            if change['id'] in earlier:
                original_change = earlier[change['id']]
                assert original_change['after'] == change['before']
                original_change['after'] = change['after']
                original_change['followup_reason'] = change_reason(change)
            else:
                previous_log['changes'].append(change)
        previous_log['final_sha256'] = final_sha
        dump(log_path, previous_log)
    else:
        dump(log_path, {'status': 'corrected_staging_pending_user_approval', 'group': group, 'source_sha256': source_sha, 'final_sha256': final_sha, 'draft': str(draft_path.relative_to(FOLDER)), 'root_review': 'The root agent read the original and revised text before applying this draft to staging.', 'changes': draft['changes'], 'finding_resolutions': draft['finding_resolutions'], 'production_files_written': 0})
    print(json.dumps({'group': group, 'corrected_staging_cards': len(ids), 'production_files_written': 0}))


if __name__ == '__main__':
    apply(sys.argv[1], sys.argv[2])
