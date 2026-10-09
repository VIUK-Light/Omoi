import json,re,collections
from pathlib import Path
P=Path(__file__).parent
xs=json.loads((P/'additions.json').read_text());bs=[c for n in range(1,5) for c in json.load(open(f'level{n}.json'))]
norm=lambda s:re.sub(r'[\W_]','',s)
def grams(s):
 s=norm(s);return {s[i:i+3] for i in range(len(s)-2)}
bg=[grams(c['question']) for c in bs];xg=[grams(x['card']['question']) for x in xs]
def sim(a,b): return len(a&b)/len(a|b) if a|b else 0
near=[]
for x,g in zip(xs,xg):
 ss=[sim(g,b) for b in bg];i=max(range(len(ss)),key=ss.__getitem__)
 if ss[i]>.17:near.append({'score':round(ss[i],3),'draft_id':x['card']['id'],'existing_id':bs[i]['id'],'draft':x['card']['question'],'existing':bs[i]['question']})
inside=[]
for i,g in enumerate(xg):
 for j in range(i):
  score=sim(g,xg[j])
  if score>.36:inside.append({'score':round(score,3),'a':xs[i]['card']['id'],'b':xs[j]['card']['id'],'question_a':xs[i]['card']['question'],'question_b':xs[j]['card']['question']})
report={'count':len(xs),'existing_candidates':sorted(near,key=lambda a:-a['score']),'internal_candidates':sorted(inside,key=lambda a:-a['score']),'metric':'normalized character trigram Jaccard; editorial leads, not semantic proof'}
(P/'similarity-review-input.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'counts':len(xs),'existing_candidates':len(near),'internal_candidates':len(inside)},ensure_ascii=False))
for c in report['existing_candidates'][:20]: print(c)
for c in report['internal_candidates'][:20]: print(c)
