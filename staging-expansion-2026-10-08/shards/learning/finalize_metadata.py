from pathlib import Path
import json
root=Path(__file__).parent
xs=json.loads((root/'additions.json').read_text())
# Explicit representative edits keep the reviewed scenario's essential conditions.
fix={185:'親しい友達が自分の気持ちを書き、AIに言葉だけ整えてもらったメッセージをくれた。同じ言葉でも、あとでそれを知ると受け取り方は変わる？',392:'家族が大切にする祈りへ誘われた。自分はその信仰を持たないが、一緒に過ごす時間は好き。参加、見守る、別の時間に会うなど、何がしっくりくる？',280:'亡くなった大切な人が、生前に自分を模した会話AIへ同意したとする。本人が言わなかった新しい返答もある時、その会話を関係の続きと感じられる？',551:'自分は博物館の館長。大切に展示してきた文化財を、元の地域が祈りの場へ戻したいと言う。一般公開が終わるとしたら、何を重く見て手放すか決めたい？'}
for n,q in fix.items():
 z=xs[n-1];z['card']['question']=q
 fn,ln=z['editorial']['source_row'].split(':');p=root/fn;ls=p.read_text().splitlines();v=ls[int(ln)-1].split('|');v[1]=q;ls[int(ln)-1]='|'.join(v);p.write_text('\n'.join(ls)+'\n')
cat=json.loads(Path('research/addition-analysis-2026-10-07/candidate-catalog.json').read_text())['candidates']
by={c['analysis_id']:c for c in cat}
for n,aid in {180:'TP-01',185:'TP-02',263:'TP-05',279:'TP-03',280:'TP-04',392:'CUL-01',551:'CUL-02',567:'CUL-03'}.items():
 xs[n-1]['editorial']['representative_analysis_id']=aid
 xs[n-1]['editorial']['related_existing_ids']=by[aid]['related_existing_ids']
(root/'additions.json').write_text(json.dumps(xs,ensure_ascii=False,indent=2)+'\n')
