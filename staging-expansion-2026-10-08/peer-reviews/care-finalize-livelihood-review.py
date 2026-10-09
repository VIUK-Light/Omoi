import json, hashlib
from collections import Counter
from pathlib import Path

root = Path('/workspace/Omoi/staging-expansion-2026-10-08')
src = root / 'shards/livelihood/additions.json'
cards = json.loads(src.read_text())
p = root / 'peer-reviews/care-reviews-livelihood.json'
r = json.loads(p.read_text())
assert hashlib.sha256(src.read_bytes()).hexdigest() == r['input_sha256']

def finding(n, priority, field, issue, resolution, related=None):
    d = {'id': f'exp26-livelihood-{n:04d}', 'priority': priority, 'field': field,
         'issue': issue, 'suggested_resolution': resolution}
    if related: d['related_ids'] = [f'exp26-livelihood-{x:04d}' for x in related]
    r['findings'].append(d)

finding(410,'required','question','「費やした時間と財産を、何が失敗だと思う？」は助詞と疑問語が接続せず、何を評価する問いか取りにくい。失敗と捉えることも先取りしている。','将来の暮らしのため大きな買い物をしたが、人生の望みが変わり使えない。費やした時間と財産を、今の自分は何として受け止めたい？')
finding(414,'required','question','「返済を待ってもらう間、何を話していたい？」では日常の話題選びに寄り、L4で失う対等さや関係の意味が本文に薄い。','暮らしを立て直すため長年の友人から借り、まだ返せない。会うたび借金の話だけになり、対等だった自分を見失う時、お金の約束と友情をどう続けたい？')
finding(415,'required','question','高い物の満足が短い時の買い方の見直しだけではL2の消費習慣に近い。自信を得るという一回の効用以上の自己像や生活上の意味が弱い。','長く高い物を買うことで自分の価値を確かめてきたが、満足は続かず生活の備えも減った。買わない自分の何を大切にしたい？')
finding(427,'required','novelty','0408も、自分は有利な値段で買えるが同じように必要な他者は買えない場面で、自分の所有・利益を受け止める。0427の安く買えた/欲しい人という差では聞ける軸が近い。','作り手の生活を守る値上げで、自分が暮らしの支えにしてきた楽しみを続けにくくなる場面へ変更する。比較を有利な買い手同士から、作り手の暮らしと自分の消費の意味へ移し、背景・理由も作り直す。',[408])
finding(441,'required','question','貸した相手の買い物を見て事情を確かめる通常の貸借調整で、L4の貸し手本人の人生・利害の条件が薄い。','友人を信じて貸したお金が返らず、自分の暮らしの備えも足りなくなった。相手が楽しそうに買い物する姿だけを見た時、信頼した自分と返してほしい気持ちをどう扱いたい？')
finding(450,'required','question','望む支出と将来の不安だけでは一般的な家計の選び方に近い。何を失う/何の人生の意味を選ぶ場面かが本文にない。','生涯をかけて貯めたお金を望んだ経験に使うと、働けなくなった時の備えがほとんど残らない。今の願いと将来の自分に、どんな約束をして選びたい？')
finding(454,'required','question','共同家計の不安にどんな根拠で節約案を出すかでは、通常の管理の方法・L3の役割の判断に近い。管理した本人が背負う意味や失われる機会が薄い。','家計を守ることを自分の役目にしてきた。将来の不安から家族の楽しみを減らし、二度と戻らない機会を断らせたと知った時、自分は何を守っていたと思う？')
finding(472,'required','question','管理者が見たい範囲を決め本人へ任せる通常の境界の設定に留まり、L4の本人が担ってきた役と手放す意味が弱い。','家族の家計を長く引き受け、支出の内訳を知ることで安心してきた。本人が今は自分で管理したいと言う時、失敗する不安があっても、どこまで管理する役を手放したい？背景に本人が管理を再開できる仮の条件を置き、elderly-005の能力低下に対する保護と区別する。')
finding(475,'required','question','再出発した友人の何を祝えるかは普通の受け止めや労いに近く、L4の観察する本人の重大な意味・倫理の条件が不足。','借金で困った友人への援助を、かつて自分の生活を守るために断った。今、友人が再出発したと聞いた時、過去の自分の選択と相手の喜びをどう受け止めたい？')
finding(476,'required','question','近い人との財産差に応援と比較が混じる時どう話すかでは、日常の感情共有に近い。自分が生きてきた基準や関係の意味を条件にする。','自分で稼いで暮らせることを、人生の支えにしてきた。近い仲間が相続したお金で働き方を自由に選ぶ時、相手への喜びと自分を支えた基準をどう受け止めたい？')
finding(562,'required','level','高い家のため長く働くか狭い家で時間を得るかという個人の生活条件の比較で、背景にも社会・制度・役割の判断がないためL2に近い。','L3の枠を維持するなら、自治体が住みやすい住宅を評価する基準として、広さと家で過ごせる時間を比べる問いにする。単に「住宅政策」を付けるだけでなく、評価を何へ用いるかを背景に残す。')
finding(614,'required','question','「何が確認できるまで変更したい？」では確認を待つのか変更を続けるのか分かりにくい。','駅員に尋ねる窓口を減らし案内板を増やすなら、変更する前に何を確かめたい？')
finding(654,'required','novelty','0525も古い家の思い出がある部分を直して快適にする受け止めを問う。0654の親しい人の部屋・記憶をつなぐという語尾だけでは、新しい判断対象とL4の重さが不足。','改修で家族の記憶のある部屋は残るが、自分が生きた場所は残らないという条件へ移す。快適さとの一般的比較ではなく、共同の家に残る記憶の選ばれ方と本人の帰属を問い、背景・理由も改稿する。',[525])
finding(676,'required','novelty','0669も送迎で自分の外出ができず、支える役を続けるか/終える意味を問う。0676は外出を減らす条件と継続理由の語尾へ言い換えた近似に見える。','自分が送迎を担うことが生きがいになり、頼られる一方で別の移動手段が育たないと感じる場面へ移す。自分の時間不足による終了から、支える自分が不要になる未来への意味と倫理へ変える。',[669])
finding(710,'required','question','会う頻度が減って関係がどう変わるかだけではL2の付き合い方に近い。本人の人生の支えと、互いの住む場所を変えられない条件を明示したい。','離れて暮らす大切な人との再会を、人生の支えにしてきた。互いに今の町を離れられず、今後も会う見通しがない時、自分は何を関係の支えとして残したい？本人も移動の制約を受けるので、改稿後はaffectedを検討する。')
finding(456,'optional','question','「商いの誰を残すために続けたい」は、誰の雇用・誰との関係・誰の買い物の機会のどれを残すか取りにくい。','自分の店を続けるには、長く支えてくれた客が通えなくなる値上げが必要だとする。値上げして続ける店を、誰のための場所にしたい？')

baseline=[]
for l in range(1,5): baseline.extend(json.loads((root.parent/f'level{l}.json').read_text()))
refs={i for x in cards for i in x['editorial'].get('related_existing_ids',[])}
read_existing=[c['id'] for c in baseline if c['id'] in refs or c['category'] in {'work_and_economy','money_consumption_and_tax','housing_community_and_transport'}]
r['reviewed_ids']=[x['card']['id'] for x in cards]
r['reviewed_count']=710
r['scope']='全710件の問い・L3/4背景・追加理由・カードmetadataと関連既存IDを、60件単位（末尾50件）で実読。既存は関連52IDおよび仕事・お金・住宅交通のカテゴリー全件（重複を除いた計88件）の原文と背景を比較。担当内の近接主題は原文で比較し、文字n-gram類似も補助に使用。出典のある0400/0627は公式URLを再度開き、記述の該当部分を確認。全組合せの意味比較・実会話テスト・他担当全稿との比較は未完了。'
r['existing_read_ids']=read_existing
r['sources_verified']=[{'id':'exp26-livelihood-0400','url':'https://www.courts.go.jp/osaka/saiban/minjibu6/index.html','checked_sections':'Q7/Q8。破産のみで免責されないこと、免責されない債務もあること。カードの本人への適用は仮定。'}, {'id':'exp26-livelihood-0627','url':'https://www.mlit.go.jp/report/press/house07_hh_000306.html','checked_sections':'2025-09-30発表の概要。日常の安否確認・訪問等の見守り・福祉サービスへのつなぎ。訪問方法を相談できる本人条件は架空。'}]
r['status']='reviewed_not_approved'
r['findings'].sort(key=lambda x:(x['id'],x['field']))
for i,f in enumerate(r['findings'],1): f['finding_id']=f'care-livelihood-{i:03d}'
r['finding_counts']=dict(Counter(x['priority'] for x in r['findings']))
assert len(read_existing)==88,len(read_existing)
p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
lines=['# careによるlivelihood担当外レビュー','',f"全710件を実読。入力SHA256: `{r['input_sha256']}`",'',r['scope'],'',f"必須 {r['finding_counts']['required']}件、任意 {r['finding_counts']['optional']}件。状態は reviewed_not_approved。個々の変更の承認ではありません。",'','## 方法と限界','', '本文と背景を連続60件ずつ読み、近い判断対象を原文で比較した。税・医療・住宅制度の現実の適用は助言していない。事実の出典がある2問は公式ページで内容を確認し、その他は仮の条件として読んだ。全ての二問の意味比較・利用者との会話テスト・他担当全問との比較は完了していない。','', '価格の近似では0456/0470は広い商いの目的と友人への継続援助の終了の違いを残せると判断。0408/0427、0190/0226、0525/0654、0669/0676は、場面と判断対象の重なりが強く変更を求めた。','', '## ID別指摘','']
for f in r['findings']:
 c=next(x['card'] for x in cards if x['card']['id']==f['id'])
 lines += [f"### {f['id']}（{f['priority']} / {f['field']}）",'',f"原文：{c['question']}",'',f['issue'],'',f"修正案：{f['suggested_resolution']}",'']
lines += ['## 出典確認','']
for s in r['sources_verified']:lines += [f"- {s['id']}：{s['checked_sections']} [{s['url']}]({s['url']})"]
(root/'peer-reviews/care-reviews-livelihood.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'reviewed':r['reviewed_count'],'existing':len(read_existing),'counts':r['finding_counts']},ensure_ascii=False))
