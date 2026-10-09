from pathlib import Path
import json
root=Path(__file__).parent
xs=json.loads((root/'additions.json').read_text());by_id={int(x['card']['id'].rsplit('-',1)[-1]):x for x in xs}
seen=set()
for row in (root/'l4-depth-revisions.tsv').read_text().splitlines():
 if not row:continue
 num,q,bg,reason=row.split('|');num=int(num);assert num not in seen;seen.add(num)
 z=by_id[num];assert z['card']['level']==4
 fn,ln=z['editorial']['source_row'].split(':');p=root/fn;lines=p.read_text().splitlines();v=lines[int(ln)-1].split('|')
 v[1]=q;v[2]='仮の場面です。'+bg;v[-1]=reason
 # Appropriate to these heavier conditions, without equating depth to sensitivity.
 v[4]=str(max(int(v[4]),3))
 lines[int(ln)-1]='|'.join(v);p.write_text('\n'.join(lines)+'\n')
print('Individually revised L4 rows:',len(seen))
