from pathlib import Path
import json,re,collections,math
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
a=json.loads((BASE/'additions.json').read_text())
current=[c for i in range(1,5) for c in json.loads((ROOT/f'level{i}.json').read_text())]
def norm(s):return re.sub(r'[\s、。？！「」『』・：:（）()]+','',s)
def grams(s):
 s=norm(s);return collections.Counter(s[i:i+2] for i in range(len(s)-1))
all_cards=current+[x['card'] for x in a]
gs=[grams(c['question']) for c in all_cards]
df=collections.Counter(g for x in gs for g in x)
N=len(gs);idf={g:math.log((N+1)/(n+1))+1 for g,n in df.items()}
vs=[{g:(1+math.log(n))*idf[g] for g,n in x.items()} for x in gs]
lens=[math.sqrt(sum(v*v for v in x.values())) for x in vs]
inv=collections.defaultdict(list)
for i,v in enumerate(vs):
 for g,t in v.items():inv[g].append((i,t))
nearest=[]
for local,x in enumerate(a):
 i=len(current)+local;scores=collections.defaultdict(float)
 for g,t in vs[i].items():
  for j,u in inv[g]:
   if j!=i:scores[j]+=t*u
 existing=[(v/(lens[i]*lens[j]),j) for j,v in scores.items() if j<len(current)]
 new=[(v/(lens[i]*lens[j]),j) for j,v in scores.items() if j>=len(current)]
 existing.sort(reverse=True);new.sort(reverse=True)
 top=existing[:3]
 # Lexical neighbors are review suggestions, not semantic relationships.
 nearest.append({'id':x['card']['id'],'existing':[{'score':round(s,3),'id':all_cards[j]['id'],'question':all_cards[j]['question']} for s,j in top], 'new': [{'score':round(s,3),'id':all_cards[j]['id'],'question':all_cards[j]['question']} for s,j in new[:2]]})
(BASE/'nearest-neighbors.json').write_text(json.dumps(nearest,ensure_ascii=False,indent=2)+'\n')
for item in sorted(nearest,key=lambda x:x['existing'][0]['score'],reverse=True)[:25]:
 c=next(x['card'] for x in a if x['card']['id']==item['id'])
 n=item['existing'][0]
 print(f"{c['id']} L{c['level']} {n['score']}: {c['question']}\n  {n['id']}: {n['question']}")
print('Internal most similar')
seen=set()
for item in sorted(nearest,key=lambda x:x['new'][0]['score'],reverse=True):
 n=item['new'][0];pair=tuple(sorted((item['id'],n['id'])))
 if pair in seen:continue
 seen.add(pair)
 if len(seen)>20:break
 c=next(x['card'] for x in a if x['card']['id']==item['id'])
 print(f"{c['id']} L{c['level']} {n['score']}: {c['question']}\n  {n['id']}: {n['question']}")
