from pathlib import Path
import ast,json,re,collections,hashlib
folder=Path(__file__).resolve().parent
syntax=ast.parse((folder/'review_refinements.py').read_text())
refinements=ast.literal_eval(next(n.value for n in syntax.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='updates' for t in n.targets)))
rows=json.loads((folder/'additions.json').read_text())
updates={}
# Tie revisions to their intended authored card, rather than estimated position.
for target,source in [(178,179),(179,180),(191,190),(192,191),(194,193),(393,395),(394,396),(395,397),(398,400),(399,401),(400,402),(401,403),(402,404),(409,412)]:
 updates[f'exp26-world-{target:04}']=refinements[f'exp26-world-{source:04}']
updates.update({
'exp26-world-0180':('災害支援を始めたが、帰れば自分の暮らしを立て直せる。待っている人がいても活動を終える理由をどう決める？','仮の支援活動。支援者にも生活があり無期限の義務は設定しない。','支援者が帰ることへの責任感。'),
'exp26-world-0190':('自分の呼びかけを信じて集めた物が、再利用されていなかった。協力者への約束と、自分の善意をどう説明し直したい？','架空の回収活動。始めた目的と実際の行き先を別の情報にする。','資源循環への自分の善意を問い直す。'),
'exp26-world-0193':('災害の記憶を伝える役を担ったが、自分の話として語りたくない日がある。役割と自分をどう分けたい？','仮の語り部活動。経験を語り続ける義務は設定しない。','記憶を伝える人が休む自由。'),
'exp26-world-0392':('人生の仕事として支援を始め、約束した成果が現地で望まれないと知った。自分が果たしたかった約束を誰へどう語り直す？','架空の支援。寄付者への説明と生活者への応答を別の責任にする。','支援に注いだ人生の約束を問い直す。'),
'exp26-world-0396':('国際活動の代表として撤収を決める。自分を信じた仲間の疲れと現地の不安を、どんな責任として持つ？','架空の派遣終了。続けることにも終えることにも異なる相手への負担がある。','平和活動を終える代表の重大な責任。'),
'exp26-world-0397':('支援団体を任され、自分が始めた事業を現地へ移す時が来た。自分の名が消えても引き継げたと感じられる？','仮の権限移譲。功績の残り方と現地で続く運営を区別する。','国際支援の所有感を離れる。'),
'exp26-world-0403':('家族の帰還先を決める役になった。自分は戻りたいが全員の希望はそろわない。自分が代表してよい範囲をどう持つ？','仮の家族協議。代表する役と本人も選ぶ人生の希望を分ける。','国際的な帰還で自己と家族を代表する。'),
'exp26-world-0404':('複数の国で育った自分が、国際交流を任された。参加者を国別に分ける方針を、どんな自分の経験から考え直したい？','架空の交流。本人が感じた帰属と運営の分類が重なる。','越境経験を持つ決定者の分類。'),
'exp26-world-0412':('海外の親友が自分の国を故郷と呼ぶようになった。自分だけの場所だと思ってきたなら、その人の帰属をどう迎えたい？','仮の友情。自分が持つ帰属と他者が同じ場所へ感じる関係を考える。','他者の越境した帰属で変わる自己の場所。')
})
change_log=[]
byfile={}
for r in rows:
 c=r['card'];cid=c['id']
 if cid in updates:
  q,d,reason=updates[cid];source,line=r['editorial']['source_row'].split(':');byfile.setdefault(source,[]).append((int(line)-1,q,d,reason))
  change_log.append({'id':cid,'before':c['question'],'after':q,'reason':'本文と小分類/視点を照合し、同じ軸の残存と通常の役割判断を補正'})
for source,changes in byfile.items():
 p=folder/source;lines=p.read_text().splitlines()
 for line,q,d,reason in changes:
  cols=[x.strip() for x in lines[line].split('|')];cols[1]=q;cols[2]=d;cols[6]=reason;lines[line]=' | '.join(cols)
 p.write_text('\n'.join(lines)+'\n')
(folder/'final-review-changes.json').write_text(json.dumps({'date':'2026-10-08','changes':change_log},ensure_ascii=False,indent=2)+'\n')
print('final refinements',len(change_log))
