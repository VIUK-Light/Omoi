import collections,hashlib,json,pathlib,re,unicodedata
b=pathlib.Path('staging-expansion-2026-10-08');p=b/'shards/personal/additions.json';r=json.loads(p.read_text());by={x['card']['id']:x for x in r};ap=json.loads((b/'applied-review-drafts/personal.json').read_text());fix=json.loads((b/'resolution-drafts/recheck-fixes-personal.json').read_text());refs=json.loads(pathlib.Path('/tmp/world-personal-recheck-refs.json').read_text());cross=json.loads(pathlib.Path('/tmp/world-personal-recheck-cross-refs.json').read_text());current_hash=hashlib.sha256(p.read_bytes()).hexdigest();ids=[x['id'] for x in ap['changes']];assert len(ids)==len(set(ids))==21
assert len(r)==593
assert all(x['before']['card'][k]==by[x['id']]['card'][k] for x in ap['changes'] for k in ['id','level','category','sensitivity'])
final_fix_applied=by['exp26-personal-0542']==fix['changes'][0]['after']
for x in ap['changes']:
 if x['id']!='exp26-personal-0542': assert by[x['id']]==x['after']
assert by['exp26-personal-0542'] in [fix['changes'][0]['before'],fix['changes'][0]['after']]
restored={x['id']:x['before'] for x in ap['changes']};rr=[restored.get(x['card']['id'],x) for x in r];source_reconstructed=hashlib.sha256((json.dumps(rr,ensure_ascii=False,indent=2)+'\n').encode()).hexdigest();assert source_reconstructed==ap['source_sha256']
learning_path=b/'shards/learning/additions.json';learning=json.loads(learning_path.read_text());lby={x['card']['id']:x for x in learning};res206=next(x for x in ap['finding_resolutions'] if x['id']=='exp26-personal-0206');assert lby['exp26-learning-0093']==res206['resolved_related_addition']
allowed={'sexual_violence','pregnancy_and_reproduction','infidelity','family_conflict','abuse_and_coercion','self_harm','medical_and_end_of_life','crime_and_punishment','discrimination_and_hate','privacy_and_surveillance'}
assert all(set(by[i]['card'].get('content_warning',[]))<=allowed for i in ids)
assert all(by[i]['card']['sensitivity'] in [1,2,3,4] for i in ids)
assert all(by[i]['card'].get('perspective') in ['actor','affected','decision_maker','observer'] and by[i]['card'].get('detail',{}).get('text') for i in ids if by[i]['card']['level']>=3)
def norm(q):return re.sub(r'[\W_]+','',unicodedata.normalize('NFKC',q)).lower()
all_items=[x for n in range(1,5) for x in json.loads(pathlib.Path(f'level{n}.json').read_text())]
for path in sorted((b/'shards').glob('*/additions.json')):all_items.extend(x['card'] for x in json.loads(path.read_text()))
qmap=collections.defaultdict(list)
for x in all_items:qmap[norm(x['question'])].append(x['id'])
assert all(qmap[norm(by[i]['card']['question'])]==[i] for i in ids)
notes={
'0141':'上達のために今の活動を続ける/楽しめる別を試すという二つの行動が明示され、曖昧な「どちらを続ける」が解消。',
'0196':'人物の変化を性格と環境/関係のどちらから説明するかという紹介者の責任へ。0181の成功物語、0183の自己分類、0489の情報順序とは比較するものが異なる。',
'0205':'本人の幸福と観客の生活条件への受け止めが異なる対話へ。0184/0201の掲載価値と分離し、0236の本人の充足とは立場と問い返す責任が違う。',
'0227':'望みは今も大切で実現可能性もあるが、追う道を離れた本人の年月。0219は場所への帰属、0226は欲求の消失、0230は実現の見通しが乏しくても望みを持つ意味で分かれる。',
'0230':'人生の軸を失うかもしれない自己の望みが置かれ、単なる希望と現実の一般論からL4の意味へ。医学的効果を期待する設定と混ぜていない。',
'0234':'両方の話を残せないという制約へ揃い、どちらも保存不能とも読めた背景の曖昧さが解消。',
'0315':'思い出を持つのは昔の友人と自分の知らない人たちと明示。自分との共有記憶を知らないという読みは消えた。',
'0318':'「初めて出会ったつもり」として知り直す比喩が明確。別人へ変身する設定とは読まれにくい。',
'0386':'共同の始まりを一つの日へ決めるか、二人が置く意味を残すかへ。0359の期間限定の友情の価値と、learning0482の記念日の頻度とは異なる。',
'0410':'今後の自己像を確定したくない本人の未来へ深まった。0183の紹介上の分類、learning0428の習慣の説明、civic0311の過去を語らない所属とは対象が異なる。',
'0413':'長い関係で別の生き方を選びたいと話した後も役目を頼られる条件。0220の役に立たない自分にも居る意味とは、理解を行動で確かめる関係の問題で分かれる。',
'0417':'共に生きる相手の未来を委ねられた自分の責任が明示。relationship-104の自分のキャリアの犠牲、civic0268の助言を選ばない利用者とは異なる。',
'0423':'二人とも終えると決めた関係で共有年月を確かめる望み。0379の修復結果の定義、0388の継続年数の価値とは本人が今何を終えるかが違う。',
'0424':'人生の道が分かれ次の再会を決められない場の意味。0316の通常の再会の情報更新、0423の関係終了、learning0144の学習集団を代表する区切りとは異なる。',
'0530':'幸福への見返りを望んで続けた倫理を、生き方の基準として見直す本人の時間へ。0545の正しい結果から決め方を一般化する判断、0524の承認動機を誇ることとは異なる。',
'0542':'共に暮らした人が仕事/居場所を手放す将来への重大な説明責任。0518の通常の判断説明、0551の将来の選び直しを閉じる約束とは異なる。共同の道の主語は任意指摘でrootが明確化を選択。',
'0543':'生涯取り組みたい道へ進む機会と、共に進む人の生活に未知を残す本人の責任。0585の既に使った準備、0584の利益/損失の非対称とは異なる。',
'0550':'一方を選んでも失われない倫理の理由をその後の人生へ持つこと。0224の結論を出さない過去、relationship-104の現在の犠牲、0566の約束の撤回とは異なる。',
'0551':'今後方向を変えない約束をこれからするかという人生の自由と協力者の時間。0542の不安の共有、0566の既にした約束を撤回、0570の価値観が変わった後の同意とは異なる。',
'0556':'例外で人生を立て直した人が今は判断を担う。ethics-002の共通ルール、0558の共感できない事情、0565の関係網による功績評価とは異なる。',
'0565':'人生の大半を共同の仕事へ費やした人の今後を、自分の知る関係網で推薦する重大な責任。0553の例外の情報収集への偏り、0556の確かめられない申請の責任とは異なる。'
}
finding={'id':'exp26-personal-0542','priority':'optional','field':'question','issue':'冒頭の「あなたが進む道」は本人だけの道か、共に暮らした人たちと進む道かが少し読み分かれる。後半/背景で共同性は伝わるため必須ではない。','reviewed_question':fix['changes'][0]['before']['card']['question'],'suggested_resolution':fix['changes'][0]['after']['card']['question'],'status':'resolved_by_root_staging_clarification' if final_fix_applied else 'root_selected_pending_apply','resolution_draft':'resolution-drafts/recheck-fixes-personal.json'}
scope='applied-review-drafts/personal.jsonで指定された修正21件（personal内の必須19件と任意2件）について、実際の最終shardの全本文・全背景・理由・metadataと適用before/afterを読んだ。指定の近いpersonal26件と現行2件の全本文・存在する背景、横断6件、保持されたpersonal0206と差替え後learning0093/0100を選択して原文で比較。personal0206は26件の中に含む。21件以外の全593件の全文レビュー、4710件の意味の全組合せ比較、会話の実地検証は行っていない。'
out={'reviewer':'world','author_group':'personal','reviewed_ids':ids,'reviewed_count':21,'final_shard_sha256':current_hash,'final_shard_path':'shards/personal/additions.json','scope':scope,'findings':[finding],'status':'rechecked_not_approved' if final_fix_applied else 'rechecked_pending_root_optional_clarification_not_approved','required_unresolved_count':0,'optional_unresolved_count':0 if final_fix_applied else 1,'comparison_reviewed_ids':[x['card']['id'] for x in refs]+[x['card']['id'] for x in cross]+['exp26-learning-0093','exp26-learning-0100'],'comparison_count':len(refs)+len(cross)+2,'card_checks':[{'id':i,'finding_resolved':True,'note':notes[i[-4:]]} for i in ids],'retained_0206_and_rewritten_0093':{'personal_0206_full_addition_preserved_by_source_reconstruction':True,'reconstructed_pre_apply_source_sha256':source_reconstructed,'expected_pre_apply_source_sha256':ap['source_sha256'],'personal_0206_judgment':'長年の目標を達成した後の充足と費やした時間の受け止め。','learning_0093_judgment':'学校で必要な資格のための学びと、生涯深めたい本人の問いが違う時の学ぶ自律。','learning_0093_matches_applied_resolution_full_addition':True,'learning_shard_sha256_at_read':hashlib.sha256(learning_path.read_bytes()).hexdigest(),'learning_0100_difference':'0093は資格も生涯の問いも大切な二つの学びをつなぐ。0100は卒業目前で別の場所が合うと感じ、残る意味を問う。'},'verification':{'all_21_read':True,'all_final_objects_match_applied_draft_except_root_clarification':True,'root_clarification_applied':final_fix_applied,'allowed_warning_values_valid':True,'changed_21_normalized_exact_duplicates_against_4710':0,'personal_quantity_and_cells_preserved':True,'production_files_written':0}}
(b/'peer-reviews/recheck-personal.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
lines=['# personal修正21件の独立再確認','',f"最終shard SHA256：`{current_hash}`",'',scope,'','必須の未解消指摘は0。0542の共同の道の主語について任意の明確化1件を記録し、rootは指定文を採用すると指示した。'+('実際の最終原稿の0542を再読して解消を確認した。' if final_fix_applied else 'rootのstaging適用後、0542の全文を再読して最終hashを更新する。'),'','| ID | 原文による解消確認 |','| --- | --- |']
lines.extend(f'| {i} | {notes[i[-4:]]} |' for i in ids)
lines+=['','personal0206を含む全593件に対し、適用21件をbeforeへ戻したJSONのSHA256は適用前sourceと一致した。0206の全additionが保持されていることを構造的にも確認した。learning0093の全additionは適用記録の解消案と一致し、現在の学校内での資格と生涯の問いの不一致へ差し替わっている。達成後の充足を聞く0206とは異なる。','','21件のID/Level/カテゴリー/感度/数量を維持し、許可10種類の警告、視点、背景の存在を検証。21件について正規化完全一致は現行942件＋追加3768件を通して0。これを意味の全組合せ比較や全4710件の承認とは扱わない。','', '正本・shardはこの再確認担当では編集していない。候補は最終ユーザー確認前の状態。','']
(b/'peer-reviews/recheck-personal.md').write_text('\n'.join(lines));print(json.dumps({'read':21,'compared':out['comparison_count'],'required_unresolved':0,'final_sha256':current_hash,'root_clarification_applied':final_fix_applied,'status':out['status']},ensure_ascii=False))
