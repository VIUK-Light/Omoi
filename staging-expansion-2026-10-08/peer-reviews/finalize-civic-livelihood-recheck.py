import copy
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

B = Path(__file__).resolve().parents[1]
P = B / 'peer-reviews'
source = P / 'civic-livelihood-recheck-input.json'
rows = json.loads(source.read_text())
initial_hash = hashlib.sha256(source.read_bytes()).hexdigest()
assert initial_hash == '4c48f2b3b1ba1537b3541afc390b77963c6f26bfe7e8723514da27e55f1fdc21'
by = {x['card']['id']: x for x in rows}
applied = json.loads((B/'applied-review-drafts/livelihood.json').read_text())
ids = [x['id'] for x in applied['changes']]
assert len(ids) == 32
assert all(x['after'] == by[x['id']] for x in applied['changes'])
notes = {
    25:'職場の成果の評価を明示し、仕事の入口になった。理由の「順序」についてだけ任意補正を記録。',
    39:'職場の失敗と周囲の目を明示。日常一般の指摘から仕事の関係へ。',
    60:'頼む側から頼まれる側へ主語を修正し、裁量を受け取る比較が成立。',
    62:'勤務中の進捗と休息の感覚を明示。',
    171:'生活を支えた職業で人物像を固定されることと、別の夢を持つ自分の意味。紹介する動機だけの問いから変わった。',
    181:'0042の転職後の肩書き紹介から、職業を終えた自分の価値の継承へ。働き続ける0171と親を見てきた0266とも区別。',
    183:'確認の時期と条件の曖昧さを解消し、自分の成果として評価を受け取れる条件を聞く。',
    196:'本業という名称だけでなく、居場所を作った複数の仕事の一つを残す人生の選択へ。',
    215:'会社への信頼と本人の専門性が重なる自己の発信へ。失われる可能性は仮定で法的断定もない。',
    226:'0190の教える役割の喪失から、育てた相手の独立が自分の生業と競う責任へ独立。',
    231:'好きだと話す雑談から、職場の共同行動と本人を支える仕事の関係へ。実在の争議行為の法的断定を避けている。',
    266:'親の職業像で自分の道も決めてきた条件を置き、退職した親を見る本人の人生との関係を聞ける。',
    267:'別家計の相手の職業選択を見て、自分が信じて生きた安定の基準を問い直すobserverの意味がある。',
    268:'互いに認め合うことで保ってきた職業の自信と対等さを置き、一般の成功の予想から深めた。',
    270:'信頼する人を守る一般論から、自分の専門性の基準を学んだ師の仕事への批評に変わった。批評の正否は未確定。',
    349:'納税額による発言の重みを外し、未回収売上を収入へ算入する時点へ。0341の分割納付、0344の現物の支払い方、0347の現物の価値とは判断対象が違う。',
    410:'「何が失敗」の助詞と先取りを修正。人生の望みが変わった後の購入の意味として比較できる。',
    414:'通常の話題選びから、生活を立て直す貸借で対等な友情をどう受け止めるかへ。',
    415:'高い物の短い満足の見直しから、所有が長く自分の価値を支えてきた本人の自己評価へ。依存の診断はしていない。',
    427:'0408の買い手同士の有利な価格から、作り手の生活と買い手の生活を支える楽しみへ独立。0456は店側の商いの関係をどう残すか。',
    441:'返済の事情確認の段取りから、生活の備えを失った貸し手の信頼と暮らしの意味へ。借りる側の0414と異なる責任を聞く。',
    450:'人生の備えを使う本人の現在の願いと将来の自分への約束を置く。0460の共同資金の権限と区別。',
    454:'予算案の根拠の調整から、自分の節約判断で家族の一回の機会を狭めた責任へ。家族の同意という条件も背景へ。',
    456:'誰を残すのかの曖昧さを、店を誰の場所として続けるかへ直した。長い顧客との関係も保持。',
    472:'管理を再開できる家族が望む自律と、長く預かってきた本人の安心の役の引継ぎへ。elderly-005の能力低下への保護と区別。',
    475:'一般の祝い方から、援助を断って守った自分の暮らしと、友人の再出発を見る過去の意味へ。',
    476:'0267の安定した職業基準の見直しから、財産差で共有した老後の予定がずれる本人へ深めた。本文に合う視点の再修正を記録。',
    562:'個人の広さと時間の好みから、住宅支援の成果へ用いる自治体の評価基準へ。L3の制度的な判断対象がある。',
    614:'変更を続けたいか、確認まで保留したいかの曖昧さを、変更前の確認へ解消。',
    654:'0525の快適さと記憶から、共有の家で家族の部屋は残り自分の場所が失われる記憶の選ばれ方へ。本人の帰属が明確。',
    676:'0669の自分の外出のため終了する場面から、送迎が生きがいの本人が自分の役目が不要な未来を望む意味へ。代替が育たない理由は断定しない。',
    710:'交流の頻度の予想から、人生を支える再会と互いの住居・仕事を変えられない条件へ。直接影響を受けるaffectedへ整えた。',
}
reviewed = [dict(id=id_, assessment=notes[int(id_.split('-')[-1])]) for id_ in ids]
near_nums = [42,172,180,190,191,225,242,244,269,299,408,428,525,630,653,669,675,709,346,348,350,368,374,460,339,341,344,347]
near_ids = [f'exp26-livelihood-{n:04d}' for n in near_nums]
existing_ids = ['work-001','work-002','work-003','work-004','work-005','workplace-001','workplace-002','workplace-003','workplace-004','finance-001','finance-002','elderly-005','r6-03-04-l3','r6-03-04-l4','r6-11-03-l3','r6-11-03-l4','r6-02-02-l4','clarity-housing_community_and_transport-01-l3','bridge-023','bridge-024','r6-20-10-l4','transport-001','consumer-001','community-001']
findings = [
    dict(id='exp26-livelihood-0476',priority='required',field='perspective',issue='改稿後は「老後を一緒に楽しむ予定を…描いてきた」「相手は…先に仕事を離れ、自分は働き続ける」「二人の未来をどう描き直す」と、本人も共有の人生の予定の変化を受ける。別家計の相手を見て自分の安定の基準を見直す0267のobserverとは違い、affectedが主な立場に合う。',suggested_resolution='本文・背景・理由を保持し、perspectiveのみobserverからaffectedへ変更。',status='required_revision_proposed_not_applied'),
    dict(id='exp26-livelihood-0025',priority='optional',field='reason',issue='二つの条件は「褒めてから改善」と「改善だけ」で、肯定の有無も違う。「受け取る順序の違い」という理由だけでは純粋な順序比較と誤読する。問いの仕事の条件は解消済み。',suggested_resolution='理由を「仕事の成果の評価について、肯定も受けてから改善点を聞くことと、改善点だけを受け取ることの感覚の違いを聞く。」へ。本文は保持。',status='optional_open'),
]
normalize=lambda s: re.sub(r'[\s。、？！?！「」『』\u3000]','',s)
existing=[x for n in range(1,5) for x in json.loads((B.parent/f'level{n}.json').read_text())]
norm_existing={normalize(x['question']):x['id'] for x in existing}
collisions=[(id_,norm_existing[normalize(by[id_]['card']['question'])]) for id_ in ids if normalize(by[id_]['card']['question']) in norm_existing]
allowed={'sexual_violence','pregnancy_and_reproduction','infidelity','family_conflict','abuse_and_coercion','self_harm','medical_and_end_of_life','crime_and_punishment','discrimination_and_hate','privacy_and_surveillance'}
assert all(set(by[id_]['card'].get('content_warning',[])) <= allowed for id_ in ids)
record=dict(
    reviewer='civic',author_group='livelihood',date='2026-10-08',
    initial_final_shard_sha256=initial_hash,final_shard_sha256=initial_hash,
    initial_reviewed_ids=ids,reviewed_ids=ids,reviewed_count=32,
    input_snapshot=str(source),
    scope='適用記録の修正32件についてbefore全additionと、適用後shardの問い・L3/4背景・追加理由・Level/視点/感度/警告/topic/editorialを16件ずつ全文確認。元careレビュー33指摘と横断XDR-08（0181）の原文・根拠も確認。近い担当内28件の全文と、既存24件の原文・背景を追加比較した。担当全710件を再度全文読んだレビューではなく、修正32件の独立再確認。全二問の組合せ比較・新規外部検索・現実の会話テストはしていない。全32修正はhypotheticalで、新たな現実の制度事実の断定はない。',
    compared_addition_ids=near_ids,compared_existing_ids=existing_ids,
    per_card_assessments=reviewed,findings=findings,
    structural_checks=dict(applied_after_matches_final_all_32=True,normalized_exact_existing_collisions=collisions,all_32_warning_tags_allowed=True,total_shard_count=710),
    deferred_prior_optional_ids=['exp26-livelihood-0244','exp26-livelihood-0269'],
    deferred_note='この2件は前レビューで任意保留となり、今回の修正32件には含まれない。比較原文は読んだが解消済みとはしていない。',
    status='reviewed_required_revision_pending_not_approved',
)
(P/'recheck-livelihood.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
md=['# civic による livelihood 修正の独立再確認','',f'初回入力の最終shard SHA256: `{initial_hash}`。修正32件を全文確認。状態：0476の視点の再修正を提案、未承認。','',record['scope'],'','元の明瞭さ、分類、L4の固有の意味、指摘された近似は32件で解消されている。0476は新しい本文で共有した老後の予定の変化を本人も受けるため、observerからaffectedへ再修正が必要。0025の追加理由は肯定の有無も変わる比較であることを任意で補正できる。','', '| ID | 再確認で読める差分と根拠 |','|---|---|']
for x in reviewed:md.append('| '+x['id']+' | '+x['assessment']+' |')
md += ['', '前レビューの任意保留0244/0269の扱いはこの32件の再確認とは別。構造一致やこのレビューを、ユーザーの問題変更の承認として扱わない。','']
(P/'recheck-livelihood.md').write_text('\n'.join(md))

id_='exp26-livelihood-0476'
after=copy.deepcopy(by[id_]);after['card']['perspective']='affected'
change=dict(id=id_,before=by[id_],after=after,reason='共有した老後の予定が相手の相続によって変化し、本人も二人の未来を描き直す当事者なのでaffectedへ。問い・背景・理由・他metadataは保持。')
reason_id='exp26-livelihood-0025'
reason_after=copy.deepcopy(by[reason_id]);reason_after['reason']='仕事の成果の評価について、肯定を添えることと改善点だけを受け取ることの違いを聞く。'
reason_change=dict(id=reason_id,before=by[reason_id],after=reason_after,reason='二つの条件は肯定を添えてから改善点を聞くことと改善点だけを聞くことで、順序だけの違いではない。追加理由だけを比較の条件へ合わせる。')
draft=dict(status='draft_not_applied_not_approved',author_group='livelihood',reviewer='civic',source_sha256=initial_hash,source_path=str(B/'shards/livelihood/additions.json'),changes=[reason_change,change],finding_resolutions=[dict(id=reason_id,field='reason',priority='optional',status='proposed_not_applied',reason=reason_change['reason']),dict(id=id_,field='perspective',priority='required',status='proposed_not_applied',reason=change['reason'])])
after_views=Counter(x['card']['perspective'] if x['card']['id']!=id_ else 'affected' for x in rows if x['card']['level']==4)
draft['validation']=dict(change_count=2,level_and_category_preserved=True,perspective_only_change_0476=True,reason_only_change_0025=True,after_level4_perspective_counts=dict(after_views),all_major_perspectives_at_least_twenty_percent=all(after_views[k]/sum(after_views.values())>=.20 for k in ('affected','actor','decision_maker')))
(B/'resolution-drafts/recheck-fixes-livelihood.json').write_text(json.dumps(draft,ensure_ascii=False,indent=2)+'\n')
print('reviewed32 compared28 existing24 required1 optional1',initial_hash)
