import json,sys
from pathlib import Path
p=Path('staging-expansion-2026-10-08/shards/livelihood/additions.json');a=json.loads(p.read_text())
s,e=map(int,sys.argv[1:]);
for x in a[s-1:e]:
 c=x['card'];ed=x['editorial'];print(c['id'],f"L{c['level']} S{c['sensitivity']}",c['category'],c['topic'],c.get('perspective',''),','.join(c.get('content_warning',[])),ed.get('fact_status',''),','.join(ed.get('related_existing_ids',[])))
 print('Q:',c['question']);
 if 'detail' in c:
  print('B:',c['detail']['text'])
  if c['detail'].get('sources'):print('Sources:',json.dumps(c['detail']['sources'],ensure_ascii=False))
 print('R:',x['reason'])
