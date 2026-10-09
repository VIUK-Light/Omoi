import collections, hashlib, json, pathlib, re, unicodedata
b=pathlib.Path('staging-expansion-2026-10-08'); p=b/'peer-reviews/world-reviews-civic.json'; dpath=b/'resolution-drafts/world-fixes-civic.json'; v=json.loads(p.read_text());d=json.loads(dpath.read_text());s=b/'peer-reviews/world-civic-source-snapshot.json';r=json.loads(s.read_text());changes={x['id']:x for x in d['changes']};byid={x['card']['id']:x for x in r};outcome=[changes.get(x['card']['id'],{}).get('after',x) for x in r]
allowed={'sexual_violence','pregnancy_and_reproduction','infidelity','family_conflict','abuse_and_coercion','self_harm','medical_and_end_of_life','crime_and_punishment','discrimination_and_hate','privacy_and_surveillance'}
def norm(s):return re.sub(r'[\W_]+','',unicodedata.normalize('NFKC',s)).lower()
existing=[x for n in range(1,5) for x in json.loads(pathlib.Path(f'level{n}.json').read_text())];oldq={norm(x['question']) for x in existing}
assert v['reviewed_count']==558==len(set(v['reviewed_ids']))
assert set(v['reviewed_ids'])==set(byid)
assert hashlib.sha256(s.read_bytes()).hexdigest()==v['source_sha256']==d['source_sha256']
assert hashlib.sha256((b/'shards/civic/additions.json').read_bytes()).hexdigest()==v['source_sha256']
assert set(changes)=={x['id'] for x in v['findings'] if x['priority']=='required'}
assert all(x['before']==byid[x['id']] for x in d['changes'])
assert all(x['before']['card'][k]==x['after']['card'][k] for x in d['changes'] for k in ('id','level','category','sensitivity'))
assert all(set(x['card'].get('content_warning',[]))<=allowed for x in outcome)
assert all(re.fullmatch('[a-z][a-z0-9_]*',x['card']['topic']) for x in outcome)
assert all(x['card'].get('perspective') in {'actor','affected','observer','decision_maker'} for x in outcome if x['card']['level']>=3)
assert all(isinstance(x['card']['detail']['text'],str) and x['card']['detail']['text'].strip() for x in outcome if x['card']['level']>=3)
assert all(not re.search(r'\b0\d{3}\b|exp26-|shards/',x['after']['card'].get('detail',{}).get('text','')) for x in d['changes'])
assert len({norm(x['card']['question']) for x in outcome})==558
assert not any(norm(x['card']['question']) in oldq for x in outcome)
assert collections.Counter((x['card']['category'],x['card']['level']) for x in outcome)==collections.Counter((x['card']['category'],x['card']['level']) for x in r)
for f in v['findings']:
 if f['priority']=='required':
  a=changes[f['id']]['after'];f['suggested_resolution']=('perspectiveをactorへ変更する。本文と背景は維持する。' if f['id']=='exp26-civic-0371' else a['card']['question']+' 背景: '+a['card']['detail']['text']+' 理由: '+a['reason']);f['resolution_draft_path']='resolution-drafts/world-fixes-civic.json'
v['cross_shard_originals_reviewed_ids']=['exp26-care-0083','exp26-world-0250','exp26-personal-0404','exp26-learning-0238']
v['scope']=v['scope'].replace('care-0083/world-0250も原文を確認。','care-0083/world-0250/personal-0404/learning-0238も原文を確認。')
v['resolution_draft']['schema_warning_values_valid']=True
v['resolution_draft']['author_advice']='civic担当が32件のbeforeの問いとafter全additionを読み、個別葛藤/L3差分を確認。許可外タグを指摘したため削除。0101は対話の発言と責任判断の葛藤、0155は横断レビューの捜査広報の案を推奨。これはユーザー承認ではない。'
p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
d['validation'].update({'self_reread_status':'completed_full_text_all_32_after_objects_and_revised_pass','remaining_limits':'32件の変更後本文・背景・理由・metadataを全て再読し、修正で生じた誘導と背景への内部ID混入を修正。civic担当の助言で許可外の警告タグ2件を除去。全意味組合せの照合、リンク資料全文の独立再取得、会話の実地検証、ユーザー承認は含まない。','source_shard_unchanged':True,'drafted_change_count':32,'allowed_warning_values_valid':True,'candidate_internal_ids_in_product_backgrounds':0,'category_level_cells':{f'{cat}:L{lev}':n for (cat,lev),n in sorted(collections.Counter((x['card']['category'],x['card']['level']) for x in outcome).items())},'l4_perspectives':dict(collections.Counter(x['card']['perspective'] for x in outcome if x['card']['level']==4)),'live_sha256':{f'level{n}.json':hashlib.sha256(pathlib.Path(f'level{n}.json').read_bytes()).hexdigest() for n in range(1,5)}})
d['merge_decisions']=[{'id':'exp26-civic-0101','selected':'world_peer_draft','reason':'返還後の公の事実確認の横断案も司法固有の差分が成立するが、現draftの対話での説明と責任判断に使われる資料の葛藤の方が、本人が説明を背負う意味が具体的。civic担当の助言を受け、この一つのafterを残した。両方の条件を一問へ詰め込まない。'},{'id':'exp26-civic-0155','selected':'cross_domain_draft','reason':'捜査機関で自分の発表から疑いを広めた責任、訂正の到達と本人の再特定回避が、地域の誤通報記録の案より司法固有の判断として明確。横断案を採用し、0120の証言訂正と分けた。'},{'id':'exp26-civic-0207','selected':'shared_gap_question_world_background','reason':'問いは主担当・横断案と共通。終了後の再申請、本人の了解、過去の記録で現在の人を決めつけない条件を背景へまとめ、topicを横断案に合わせた。'}]
dpath.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
mp=b/'peer-reviews/world-reviews-civic.md';md=mp.read_text();md=md.replace('care-0083/world-0250も原文を確認。','care-0083/world-0250/personal-0404/learning-0238も原文を確認。').replace('犯罪・監視・喪失タグを追加した。','犯罪・監視タグを追加し、全558件で許可10種類内であることを確認した。死別や寿命だけの0354/0520に、新しい警告タグは付けていない。').replace('0155は誤通報の記録訂正と本人が望まない再公開。','0155は自分の捜査広報の訂正と本人が望まない再特定。')
lines=md.splitlines()
for j,line in enumerate(lines):
 if line.startswith('| exp26-civic-0155 |'):
  f=next(x for x in v['findings'] if x['id']=='exp26-civic-0155');lines[j]='| exp26-civic-0155 | '+f['issue'].replace('|','／')+' | '+changes[f['id']]['after']['reason'].replace('|','／')+' |'
md='\n'.join(lines)+'\n';md+='\n0101/0155/0207の横断案との選択はdraftの`merge_decisions`へ記録した。civic担当の助言を受けた後も、レビューと候補は未承認のまま。\n';mp.write_text(md)
print(json.dumps({'read':558,'existing_read':v['existing_reference_reviewed_count'],'required':32,'optional':16,'draft_sha256':hashlib.sha256(dpath.read_bytes()).hexdigest(),'l4_perspectives':d['validation']['l4_perspectives'],'source_shard_unchanged':True,'warning_values_valid':True},ensure_ascii=False,indent=2))
