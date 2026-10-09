import json,re,collections,hashlib
from pathlib import Path
P=Path(__file__).parent
xs=json.loads((P/'additions.json').read_text());idx={x['card']['id']:x for x in xs}
reps={
'exp26-care-0156':('CS-F1',['caregiving-001','caregiving-002','bridge-011']),
'exp26-care-0170':('CS-F2',['r6-10-06-l4']),
'exp26-care-0424':('CS-H1',['bridge-032','disability-003']),
'exp26-care-0553':('CS-H2',['healthcare-012','life-002']),
'exp26-care-0559':('CS-H3',['elderly-003','life-002'])}
for i,(aid,rel) in reps.items():
 idx[i]['editorial']['representative_analysis_id']=aid
 idx[i]['editorial']['related_existing_ids']=rel
sources={
'exp26-care-0170':('NHS: Grief after bereavement or loss','https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/grief-bereavement-loss/'),
'exp26-care-0553':('National Cancer Institute: Cancer Prognosis','https://www.cancer.gov/about-cancer/diagnosis-staging/prognosis'),
'exp26-care-0559':('厚生労働省：人生会議とは','https://www.mhlw.go.jp/acp-jinseikaigi/about/')}
for i,(title,url) in sources.items():
 idx[i]['card']['detail']['sources']=[{'title':title,'url':url}]
 idx[i]['editorial']['fact_status']='sourced'
comparisons={
'exp26-care-0081':['elderly-003'],
'exp26-care-0149':['caregiving-005'],
'exp26-care-0161':['caregiving-002','caregiving-003'],
'exp26-care-0163':['caregiving-006'],
'exp26-care-0203':['caregiving-002'],
'exp26-care-0214':['caregiving-005'],
'exp26-care-0219':['family-001'],
'exp26-care-0222':['family-001'],
'exp26-care-0241':['elderly-003'],
'exp26-care-0454':['disability-006'],
'exp26-care-0498':['disability-003'],
'exp26-care-0589':['disability-003'],
'exp26-care-0598':['disability-006'],
'exp26-care-0601':['disability-010'],
'exp26-care-0619':['healthcare-012']}
# The pairs are selected review references; they do not mean these are semantic matches.
for x in xs:
 if 'representative_analysis_id' not in x['editorial']:x['editorial']['related_existing_ids']=[]
for i,rel in comparisons.items(): idx[i]['editorial']['related_existing_ids']=rel
base=[c for n in range(1,5) for c in json.load(open(f'level{n}.json'))];bid={c['id'] for c in base}
for x in xs:
 for rid in x['editorial']['related_existing_ids']:assert rid in bid,rid
norm=lambda q:re.sub(r'[\W_]','',q)
assert len({norm(x['card']['question']) for x in xs})==670
assert not ({norm(x['card']['question']) for x in xs}&{norm(c['question']) for c in base})
expected=json.load(open('staging-expansion-2026-10-08/assignments.json'))['groups']['care']['categories']
cnt=collections.Counter((x['card']['category'],x['card']['level']) for x in xs)
for cat in expected:
 for lv,n in enumerate(cat['additional_levels'],1):assert cnt[(cat['id'],lv)]==n,(cat['id'],lv)
for x in xs:
 c=x['card'];assert c['question'] and x['reason'] and c['topic'];assert 1<=c['sensitivity']<=4
 if c['level']<3:assert 'detail' not in c and 'perspective' not in c
 else:assert c['detail']['text'] and c['perspective'] in ('affected','actor','decision_maker','observer')
(P/'additions.json').write_text(json.dumps(xs,ensure_ascii=False,indent=2)+'\n')
r={'status':'author_checks_complete_unapproved','count':670,'category_level_counts':{f'{a}/L{b}':n for (a,b),n in cnt.items()},'l4_perspectives':dict(collections.Counter(x['card']['perspective'] for x in xs if x['card']['level']==4)),'topics':len({x['card']['topic'] for x in xs}),'exact_normalized_duplicates_current':0,'exact_normalized_duplicates_internal':0,'source_cards':list(sources),'representative_cards':{i:a for i,(a,_) in reps.items()},'limitations':['Counts and exact text checks do not prove absence of semantic duplicates.','Sourced background statements reuse the 2026-10-07 research reading; clinical effects and legal rights are not asserted.','Independent full-text peer review is pending.']}
(P/'author-checks.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(r,ensure_ascii=False))
