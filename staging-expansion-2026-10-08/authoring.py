"""Assemble individually authored rows. No question or detail text generation."""
from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parent

def assemble(group):
    manifest = json.loads((ROOT / 'assignments.json').read_text())
    assignment = manifest['groups'][group]
    folder = ROOT / 'shards' / group
    additions = []
    for category in assignment['categories']:
        for level, required in enumerate(category['additional_levels'], 1):
            source = folder / f"{category['id']}__l{level}.txt"
            rows = []
            for line_no, line in enumerate(source.read_text().splitlines(), 1):
                if not line.strip() or line.startswith('#'):
                    continue
                values = [v.strip() for v in line.split('|')]
                assert len(values) == 7, (source.name, line_no, 'Expected topic | question | detail | perspective | sensitivity | warnings | reason')
                topic, question, detail, perspective, sensitivity, warnings, reason = values
                assert question and reason and re.fullmatch(r'[a-z][a-z0-9_]*', topic), (source.name, line_no)
                card = {'id': f'exp26-{group}-{len(additions) + len(rows) + 1:04}', 'level': level, 'sensitivity': int(sensitivity), 'category': category['id'], 'topic': topic, 'question': question}
                if level >= 3:
                    assert detail not in ('', '-') and perspective in ('affected', 'actor', 'decision_maker', 'observer'), (source.name, line_no)
                    card['perspective'] = perspective
                    card['detail'] = {'text': detail}
                if warnings not in ('', '-'):
                    card['content_warning'] = [w.strip() for w in warnings.split(',')]
                rows.append({'card': card, 'reason': reason, 'editorial': {'author_group': group, 'fact_status': 'hypothetical', 'source_row': f'{source.name}:{line_no}'}})
            assert len(rows) == required, (source.name, len(rows), required)
            additions.extend(rows)
    assert len(additions) == assignment['total_additions']
    (folder / 'additions.json').write_text(json.dumps(additions, ensure_ascii=False, indent=2) + '\n')
    return additions

if __name__ == '__main__':
    import sys
    result = assemble(sys.argv[1])
    print(f'{sys.argv[1]}: {len(result)} individually authored additions assembled.')
