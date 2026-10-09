from pathlib import Path
import json
F=Path(__file__).parent
P=F/'additions.json'
A=json.loads(P.read_text())
old={x['id']:x for n in range(1,5) for x in json.loads((F.parents[2]/f'level{n}.json').read_text())}
comparisons={
'休暇を取ると、親しい同僚':['work-policy-002','stigma-002'],
'引継ぎ不足の責任':['work-002'],
'努力して':['ethics-006'],
'職場の連絡に':['r6-11-03-l3'],
'収入と時間が同じなら':['work-003'],
'昇進すると専門':['work-002'],
'休暇の理由を聞かずに':['r6-18-04-l3'],
'自分の会社に合わない人':['work-004'],
'家族のように働く会社':['gender-relations-001'],
'会社の方針に共感しなくても':['r6-20-10-l4'],
'勤務中の休憩では':['school-013'],
'分からないことをすぐ質問':['study-018'],
'会社が客の感想を':['ethics-006'],
'同じ成果でも難しい担当':['ethics-006'],
'長い職歴の空白':['bridge-029'],
'生活に欠かせないが希望者':['r6-05-02-l3'],
'親しくしてきた取引先':['r6-11-02-l3'],
'同じ仕事の報酬が下がる':['r6-03-04-l3'],
'一生使えると思って':['clarity-money_consumption_and_tax-01-l3'],
'お祝いのお金を':['bridge-025'],
'高額な物の下見':['clarity-money_consumption_and_tax-01-l2'],
'返せなくなった友人へ':['bridge-024'],
'お金を貸した友人へ':['bridge-024'],
'借りた時より暮らし':['finance-002'],
'返済を続けると家族':['finance-002','r6-13-05-l4'],
'返済不能になった理由':['r6-13-05-l4'],
'返済を待つ代わりに':['r6-13-05-l3'],
'行動履歴で価格':['r6-15-04-l3'],
'購入履歴で値段':['r6-15-04-l3'],
'財産を残す相手へ':['elderly-009'],
'親から受け継ぐ財産':['economy-004'],
'財産を残すより今':['relationship-134'],
'人へすすめた買い物':['r6-10-01-l4'],
'金銭を':['finance-001'],
'家族の支出を管理':['elderly-005'],
'家計簿を共有するなら':['r6-19-05-l3'],
'将来のための貯金を':['relationship-134'],
'増税で自分の余裕':['economy-003'],
'財産を現物で持ち':['r6-03-04-l4'],
'共同で買った道具':['bridge-013'],
'共同で物を買う集まり':['bridge-013'],
'同居人が個室へ':['clarity-housing_community_and_transport-01-l2'],
'住居探しが難しく':['r6-13-05-l3','disability-006'],
'見守りを伴う住宅':['r6-13-05-l3'],
'暮らしの支援を受ける住宅':['disability-006'],
'移動のため人に頼む':['elderly-001'],
'一人で出かけにくく':['elderly-001'],
'便利な送迎を受ける住まい':['transport-001'],
'古い家の不便':['clarity-housing_community_and_transport-01-l3'],
'家を残すための手間':['clarity-housing_community_and_transport-01-l3'],
'町をよく知る人':['clarity-housing_community_and_transport-02-l1'],
'通りを歩行者中心':['community-001'],
'町の人が増える':['community-001'],
'大切な人と住むため':['relationship-104'],
'同居人を支えるため住む':['relationship-104'],
'長く住んだ家を離れれば':['r6-05-03-l4'],
'遠い地域の交通を支える':['r6-05-03-l3'],
'住居を貸す時':['stigma-006'],
'地域の送迎を善意':['r6-02-04-l3'],
'公共交通の料金を家族':['r6-02-03-l3'],
'自分が管理する家を支援':['r6-02-03-l4'],
'自分の空き部屋を困って':['r6-02-03-l4'],
}
representatives={
'exp26-livelihood-0021':('EH-W1','受け取る本人の休日の感覚を短くした。'),
'exp26-livelihood-0022':('EH-W2','興味と人に頼られる意義の比較を保持。'),
'exp26-livelihood-0400':('EH-M2','返済と本人・家族の生活再建を保持。'),
'exp26-livelihood-0401':('EH-M1','自分が安くなる側と他者が高くなる側を明示。'),
'exp26-livelihood-0516':('EH-H2','同じ家賃・実害なし・本人の落ち着かなさを保持。'),
'exp26-livelihood-0627':('EH-H1','住宅を得る条件と継続訪問を保持し、相談できる条件を追加。'),
'exp26-livelihood-0336':('ENV-01','家計と動物への配慮について、確認したい情報を尋ねるL2案。'),
}
# Stable IDs arise from category/Level row order; verify associations before tagging.
check_prefix={
'exp26-livelihood-0021':'職場の連絡に',
'exp26-livelihood-0022':'収入と働く時間が同じなら',
'exp26-livelihood-0400':'返済を続けると家族',
'exp26-livelihood-0401':'行動履歴で価格',
'exp26-livelihood-0516':'同じ家賃で暮らす同居人',
'exp26-livelihood-0627':'住居探しが難しく',
'exp26-livelihood-0336':'動物の飼育環境に',
}
catalog=json.loads((F.parents[2]/'research/addition-analysis-2026-10-07/candidate-catalog.json').read_text())
C={x['analysis_id']:x for x in catalog['candidates']}
for x in A:
 card=x['card']; q=card['question']; ed=x['editorial']; related=[]
 for cue,ids in comparisons.items():
  if cue in q:related.extend(ids)
 ed['related_existing_ids']=list(dict.fromkeys(related))
 assert all(i in old for i in ed['related_existing_ids'])
 if card['id'] in representatives:
  assert q.startswith(check_prefix[card['id']]),(card['id'],q)
  aid,adapt=representatives[card['id']]
  ed['representative_analysis_id']=aid
  ed['adaptation_note']=adapt
  ed['related_existing_ids']=list(dict.fromkeys(ed['related_existing_ids']+C[aid]['related_existing_ids']))
  ed['analysis_source_checked_date']='2026-10-07'
  ed['analysis_reference']='research/addition-analysis-2026-10-07/economy-housing.md' if aid.startswith('EH') else 'research/addition-analysis-2026-10-07/environment-animals.md'
 if card['id']=='exp26-livelihood-0400':
  card['detail']['text']='架空の本人に利用可能な手続きを仮定する。破産だけで借金が消えるわけではなく、免責されない債務もある。貸し手の事情と、法律上の責任・本人が感じる責任を分けて考える。'
  card['detail']['sources']=[{'title':'大阪地方裁判所 第6民事部・破産手続のQ&A（Q7・Q8）','url':'https://www.courts.go.jp/osaka/saiban/minjibu6/index.html'}]
  ed['fact_status']='sourced'
  ed['source_scope']='2026-10-07に確認したQ7・Q8。手続きの適用と本人の事情は架空。助言ではない。'
 if card['id']=='exp26-livelihood-0627':
  card['detail']['text']='国交省は居住サポート住宅の制度を、安否確認・訪問等の見守りや福祉への接続を伴う住宅として説明する。本人の住居探しと抵抗感は架空。訪問を相談できるという条件で、住居の安心と私的な場所を比べる。'
  card['detail']['sources']=[{'title':'国土交通省 居住サポート住宅の認定制度がスタートします！（2025-09-30）','url':'https://www.mlit.go.jp/report/press/house07_hh_000306.html'}]
  ed['fact_status']='sourced'
  ed['source_scope']='2026-10-07に本文確認。制度の存在を背景にし、住人すべての抵抗感や一律の監視を示すものではない。'
P.write_text(json.dumps(A,ensure_ascii=False,indent=2)+'\n')
print('editorial finalized',len(A),'representatives',sum('representative_analysis_id' in x['editorial'] for x in A),'with comparisons',sum(bool(x['editorial']['related_existing_ids']) for x in A))
