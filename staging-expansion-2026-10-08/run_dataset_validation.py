"""Run the existing validator once and bind its result to the exact pending input."""
from pathlib import Path
import hashlib
import json
import subprocess

FOLDER = Path(__file__).resolve().parent
REPO = FOLDER.parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run():
    proposal = FOLDER / 'proposal.json'
    before = {'proposal_sha256': sha(proposal), 'baseline_sha256': {f'level{i}.json': sha(REPO / f'level{i}.json') for i in range(1, 5)}}
    assert json.loads(proposal.read_text())['status'] == 'pending_approval'
    command = ['node', 'tools/verify-question-dataset.mjs', '--proposal', str(proposal.relative_to(REPO)), '--enforce-quality-targets', '--json']
    result = subprocess.run(command, cwd=REPO, text=True, capture_output=True, check=False)
    report = json.loads(result.stdout)
    assert before['proposal_sha256'] == sha(proposal)
    assert before['baseline_sha256'] == {f'level{i}.json': sha(REPO / f'level{i}.json') for i in range(1, 5)}
    path = FOLDER / 'dataset-validation.json'
    path.write_text(result.stdout)
    metadata = {'status': 'passed' if result.returncode == 0 and report['errors'] == [] else 'failed', 'command': command, 'cwd': str(REPO), 'exit_code': result.returncode, **before, 'report_sha256': sha(path), 'production_files_written': 0}
    (FOLDER / 'dataset-validation-run.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': metadata['status'], 'total_records': report['totalRecords'], 'errors': len(report['errors']), 'warnings': len(report['warnings'])}))
    assert metadata['status'] == 'passed', result.stderr


if __name__ == '__main__':
    run()
