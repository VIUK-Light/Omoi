import json,collections,re
from pathlib import Path
P=Path(__file__).parent
out=[]
for f in sorted(P.glob('*.txt')):
 cat='';lv=0;topic=''
 for line in f.read_text().splitlines():
  line=line.strip()
  if not line:continue
  if line.startswith('# '):
   _,cat,l=line.split();lv=int(l);continue
  if line.startswith('@ '):topic=line[2:];continue
  a=line.split('|')
  if lv<3:
   assert len(a)==2,(f,line)
   q,r=a;d=p=w=''
  else:
   assert len(a) in (4,5),(f,line)
   q,d,r,p=a[:4];w=a[4] if len(a)>4 else ''
  c={'id':f'exp26-care-{len(out)+1:04d}','level':lv,'sensitivity':1 if lv==1 else (3 if lv==4 else 2),'category':cat,'topic':topic,'question':q}
  if lv>=3:
   c['perspective']={'a':'affected','t':'actor','d':'decision_maker','o':'observer'}[p]
   c['detail']={'text':'仮の場面です。'+d}
  if w:
   c['content_warning']=w.split(',')
   c['sensitivity']=max(c['sensitivity'],3)
   if 'abuse_and_coercion' in c['content_warning']: c['sensitivity']=4
  assert cat and topic
  out.append({'card':c,'reason':r,'editorial':{'author_group':'care','fact_status':'hypothetical','related_existing_ids':[]}})
(P/'additions.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('count',len(out),dict(collections.Counter((x['card']['category'],x['card']['level']) for x in out)))
