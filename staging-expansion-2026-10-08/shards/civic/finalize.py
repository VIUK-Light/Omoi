"""Attach specifically reviewed source and comparison metadata to authored cards."""
from pathlib import Path
import json,collections,re,hashlib
BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[2]
a=json.loads((BASE/'additions.json').read_text())
current=[c for l in range(1,5) for c in json.loads((ROOT/f'level{l}.json').read_text())]
current_ids={c['id'] for c in current}
links={
'exp26-civic-0030':['sexual-crime-014'],
'exp26-civic-0038':['justice-004'],
'exp26-civic-0040':['sexual-crime-007'],
'exp26-civic-0041':['sexual-crime-014'],
'exp26-civic-0042':['sexual-crime-014'],
'exp26-civic-0044':['justice-004'],
'exp26-civic-0049':['justice-003','sexual-crime-008'],
'exp26-civic-0050':['sexual-crime-012'],
'exp26-civic-0054':['sexual-crime-012'],
'exp26-civic-0058':['r6-12-02-l3'],
'exp26-civic-0059':['sexual-crime-009'],
'exp26-civic-0061':['sexual-crime-011'],
'exp26-civic-0065':['sexual-crime-009'],
'exp26-civic-0066':['sexual-crime-014'],
'exp26-civic-0074':['r6-01-02-l3'],
'exp26-civic-0079':['justice-004'],
'exp26-civic-0081':['justice-001'],
'exp26-civic-0102':['sexual-crime-014'],
'exp26-civic-0105':['justice-004'],
'exp26-civic-0111':['justice-003','sexual-crime-008'],
'exp26-civic-0131':['r6-01-02-l4'],
'exp26-civic-0142':['justice-004'],
'exp26-civic-0201':['economy-001'],
'exp26-civic-0208':['economy-001'],
'exp26-civic-0213':['public-support-001'],
'exp26-civic-0218':['economy-002'],
'exp26-civic-0220':['economy-001'],
'exp26-civic-0231':['immigration-003'],
'exp26-civic-0235':['immigration-003'],
'exp26-civic-0245':['r6-04-01-l3'],
'exp26-civic-0248':['r6-04-07-l4'],
'exp26-civic-0266':['r6-04-04-l4'],
'exp26-civic-0275':['economy-001'],
'exp26-civic-0296':['r6-04-05-l4'],
'exp26-civic-0300':['r6-04-05-l4'],
'exp26-civic-0331':['immigration-003'],
'exp26-civic-0343':['r6-04-07-l4'],
'exp26-civic-0352':['r6-04-01-l4'],
'exp26-civic-0424':['clarity-democracy_rights_and_participation-03-l2'],
'exp26-civic-0429':['politics-001'],
'exp26-civic-0446':['clarity-democracy_rights_and_participation-03-l2'],
'exp26-civic-0457':['r6-04-05-l4'],
'exp26-civic-0483':['r6-14-04-l4'],
'exp26-civic-0487':['clarity-democracy_rights_and_participation-03-l2'],
'exp26-civic-0522':['r6-04-05-l4'],
'exp26-civic-0549':['r6-14-04-l4'],
}
# Discard thematic-only comparisons that do not share a useful decision axis.
for key in ['exp26-civic-0038','exp26-civic-0042','exp26-civic-0058','exp26-civic-0061','exp26-civic-0065','exp26-civic-0081','exp26-civic-0131','exp26-civic-0218','exp26-civic-0231','exp26-civic-0245','exp26-civic-0275','exp26-civic-0331','exp26-civic-0446']:
 links.pop(key,None)
links['exp26-civic-0040']=['sexual-crime-014']
links['exp26-civic-0066']=['sexual-crime-009']
links['exp26-civic-0111']=['justice-004']
links['exp26-civic-0429']=['clarity-democracy_rights_and_participation-03-l2']
links['exp26-civic-0352']=['r6-04-07-l4']
for x in a:
 x['editorial'].pop('related_existing_ids',None)
 if x['card']['id'] in links:
  ids=links[x['card']['id']];assert set(ids)<=current_ids
  x['editorial']['related_existing_ids']=ids
 x['editorial']['self_review_status']='author_reviewed_unapproved'
for rep in json.loads((ROOT/'research/addition-analysis-2026-10-07/candidate-catalog.json').read_text())['candidates']:
 if rep['analysis_id'] not in ('CIV-01','CIV-02'):continue
 x=next(x for x in a if x['card']['question']==rep['question_draft'])
 x['editorial']['representative_analysis_id']=rep['analysis_id']
 x['editorial']['related_existing_ids']=rep['related_existing_ids']
 x['editorial']['fact_status']='sourced'
 # Source titles and URLs are copied from the verified analysis ledger.
 if rep['analysis_id']=='CIV-01':
  title='OECD (2020), Good practice principles for deliberative processes'
 else:title='障害者権利委員会 (2018), General comment No. 7'
 x['card']['detail']['sources']=[{'title':title,'url':rep['primary_source_urls'][0]}]
 x['editorial']['source_scope']='2026-10-07の分析で確認済み本文。一般原則を参照し、仮の制度の合法性や特定の答えを証明しない。'
assert len(a)==558
counts=collections.Counter((x['card']['category'],x['card']['level']) for x in a)
manifest=json.loads((ROOT/'staging-expansion-2026-10-08/assignments.json').read_text())['groups']['civic']
for cat in manifest['categories']:
 for level,n in enumerate(cat['additional_levels'],1):assert counts[(cat['id'],level)]==n
norm=lambda s:re.sub(r'[\s、。？！「」『』・：:（）()]+','',s)
assert len(set(x['card']['id'] for x in a))==558
assert len(set(norm(x['card']['question']) for x in a))==558
assert not(set(norm(x['card']['question']) for x in a)&set(norm(c['question']) for c in current))
allowed={'sexual_violence','pregnancy_and_reproduction','infidelity','family_conflict','abuse_and_coercion','self_harm','medical_and_end_of_life','crime_and_punishment','discrimination_and_hate','privacy_and_surveillance'}
for x in a:
 c=x['card'];assert c['sensitivity'] in (1,2,3,4)
 assert set(c.get('content_warning',[]))<=allowed
 if c['level']>=3:assert c['detail']['text'] and c['perspective'] in ('affected','actor','decision_maker','observer')
 else:assert 'detail' not in c and 'perspective' not in c
views=collections.Counter(x['card'].get('perspective') for x in a if x['card']['level']==4)
for v in ('affected','actor','decision_maker'):assert views[v]>=249*0.2
(BASE/'additions.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
checks={'status':'author_self_reviewed_unapproved','total':558,'levels':dict(collections.Counter(x['card']['level'] for x in a)),'l4_views':dict(views),'topics':len(set(x['card']['topic'] for x in a)),'reviewed_current_comparison_ids':sorted({i for x in a for i in x['editorial'].get('related_existing_ids',[])}),'sourced_cards':2,'hypothetical_cards':556,'exact_duplicates':0,'category_level_counts':[{'category':k[0],'level':k[1],'count':n} for k,n in counts.items()],'scope_note':'構造と完全一致確認は全件。語彙の近さは意味の重複を証明しない。全558件の自己レビューに担当外レビューはまだ含まれない。'}
(BASE/'validation.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'total':558,'views':dict(views),'topics':checks['topics'],'sourced':2},ensure_ascii=False))
