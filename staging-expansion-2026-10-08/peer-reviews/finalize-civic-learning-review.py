import json
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'civic-learning-input.json'
OUT = ROOT / 'civic-reviews-learning.json'
rows = json.loads(SOURCE.read_text())
review = json.loads(OUT.read_text())
additions = [
    (428, 'required', 'question', '「自分だけが続ける習慣を説明できなくても大切にしたい」は一般の日課への愛着でも成立し、本文に文化の継承や共同の実践がない。0390と同様にtopicだけで文化を補っている。', '故郷や家族から受け継いだ習慣を、意味を説明できなくても続ける等、文化的な背景を問いに明示する。', []),
    (514, 'required', 'novelty', '0511は人生を支えた作品が今は好きでなくなった時、当時の意味を問う。0514も自分を救った物語が今は響かなくなり、過去の自己との連続性を問う。同じ支えた作品への愛着の変化を、作品/物語と苦しさの明示で展開した近似。', '作品への好みの変化以外へ軸を変える。例えば、支えた物語を他の人へ伝える際、自分の経験を隠すか語るかという文化を渡す責任を置く。', ['exp26-learning-0511']),
    (553, 'required', 'detail', '本文は古い姿と現在の使いやすさを比較する修復判断だが、背景の「どちらの形も実現できない」は両方の選択肢を不可能にする。「同時には実現できない」と違う。', '「古い姿を保つことと今の使いやすさを両立できない架空条件」へ直し、比較が成立するようにする。', []),
    (556, 'required', 'question', '行事続行を決める役割、技の保存、担い手の余力だけでは一般の文化運営のL3判断。「自分が」と役割を置く以外に、本人の人生・信念・居場所や重大な約束が本文と背景にない。', '行事を守る約束が自分の帰属や人生の選択を支えてきた等、終了判断で本人が何を引き受け直すかを具体化する。単に費用や年数を増やさない。', []),
    (568, 'required', 'content_warning', '本文は自分を支えた人物の加害を地域史に載せる責任で、家族関係や家族の対立は置いていない。family_conflictは根拠がない。', 'family_conflictを外す。人物への愛着を家族との争いと同一視しない。', []),
    (571, 'required', 'content_warning', '本文・背景は記念碑の歴史説明と本人の誇りで、家族の対立を含まない。family_conflictが付いている。', 'family_conflictを外す。', []),
    (573, 'required', 'content_warning', '本文・背景は生涯の歴史収集と保管の限り、未来へ声を残す責任で、家族を置いていない。family_conflictが付いている。', 'family_conflictを外す。', []),
    (422, 'optional', 'question', '「記念の品」は個人的な贈り物や記念日にも読め、文化の象徴という追加理由が本文で弱い。', '地域の行事で受け取った品等を置き、象徴の意味と日常の使用を比べられるようにする。', []),
    (518, 'optional', 'question', '未完の物語を「長年待った」だけで、待つ時間が本人の人生に持つ意味は明示されない。期間の長さだけではL4の深さの根拠が薄い。', '物語の結末を人生のある経験の受け止め方と重ねてきた等、完結しないと分かった時に本人の何が変わるかを明示する。', []),
    (524, 'optional', 'question', '家族が誇る人物を別の人が違う評価という構造は分かるが、「何を知りたい」だけでは本人の自己像や家族への愛着とどう結び付くかが薄い。', '家族の誇りを自分の生き方の手本にしてきた等、違う評価を聞くことが自分に及ぶ意味を短く明示する。', []),
    (568, 'optional', 'novelty', '0567は祖父の加害を展示する責任と家族への愛情。0568も愛着のある人物の加害を公的記録に残す判断で、祖父/支えた人物、展示/年表の差替えに近い。血縁以外の愛着の固有差を本文でまだ十分使っていない。', '自分が過去にその人物の功績だけを広めてきたため、年表を変えると自分の語りの責任を引き受ける等、本人の関与を別軸にする。', ['exp26-learning-0567']),
    (569, 'optional', 'question', '「昔の話は忘れて」だけでは、家族が隠したい加害、家族の被害経験、私的な事情のどれかで判断対象が大きく異なる。背景も特定の事件は置かないため、問いの比較条件が曖昧。', '家族の私的な経験を公的展示へ載せる場面等、忘れたい対象と本人に委ねられた判断を具体化し、0567の加害記録とは異なる軸にする。', []),
    (572, 'optional', 'content_warning', '家族の記録を多く使う展示が主題だが、家族同士の争い・強い葛藤は本文と背景にない。家族が登場するだけでfamily_conflictを付けている可能性。', 'family_conflictを外すか、実際に家族関係の葛藤を扱う必要がある問いならその条件を明示する。タグに合わせて不要な対立は足さない。', []),
]
existing = {(x['id'], x['field']) for x in review['findings']}
for n, priority, field, issue, solution, related in additions:
    item = dict(id=f'exp26-learning-{n:04d}', priority=priority, field=field, issue=issue, suggested_resolution=solution)
    if related:
        item['related_ids'] = related
    if (item['id'], field) not in existing:
        review['findings'].append(item)
review.update(
    input_sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    input_snapshot=str(SOURCE),
    reviewed_ids=[x['card']['id'] for x in rows],
    reviewed_count=len(rows),
    scope='固定入力574件の問い・背景（ある場合）・追加理由・Level・視点・感度・警告・topicを、1–70、71–140、141–210、211–280、281–350、351–420、421–490、491–560、561–574の順に全文確認。既存942件との完全一致を機械確認した後、担当カテゴリーの既存226問（学校142、技術57、文化27）の原文を読み、近い19問の背景を追加比較した。担当内の近似は本文と背景で判断。全組合せの意味比較や実際の会話テストはしていない。全候補のfact_statusはhypotheticalで、現実の新たな制度・統計を追加していない。外部資料に基づく事実の網羅検証はしていない。',
    structural_checks=dict(count=574, normalized_unique_question_count=574, normalized_exact_existing_collisions=0, snapshot_sha256_matches_author_report=True),
    status='reviewed_not_approved',
)
OUT.write_text(json.dumps(review, ensure_ascii=False, indent=2)+'\n')
counts={p:sum(x['priority']==p for x in review['findings']) for p in ('required','optional')}
md=[
    '# civic による learning 担当外レビュー',
    '',
    '状態：全574件を全文確認した未承認レビュー。修正・問題データへの反映を承認するものではない。',
    '',
    f"入力 SHA256: `{review['input_sha256']}`。入力全文は `civic-learning-input.json` に固定。現在の shard が変わっても、このレビューは固定入力に対するもの。",
    '',
    review['scope'],
    '',
    f"指摘は必須{counts['required']}件、任意{counts['optional']}件。複数の指摘が同じカードにある。全 reviewed_ids と原文に沿った理由・修正条件は同名JSONに記録。",
    '',
    '学習の意味、信じることと儀礼に参加すること、故郷や作品から離れる経験など、社会制度の議論以外から相手の考えを知る入口が増えている。一方、一部のL4は自分の役割と一般の運用判断だけで終わり、本人の人生・信念・関係が揺らぐ固有条件が必要。似たカードは単語の差ではなく判断の軸の差を確認した。',
    '',
    '| ID | 必須/任意 | 対象 | 原文に即した理由 | 修正条件 |',
    '|---|---|---|---|---|',
]
for x in review['findings']:
    clean=lambda s:s.replace('|','／').replace('\n',' ')
    md.append('| '+ ' | '.join(clean(str(x[k])) for k in ('id','priority','field','issue','suggested_resolution'))+' |')
md += ['', '同じ入力を機械的に多数決で合格させず、作成担当・主担当が各指摘の原文と根拠を判断する。必須修正案の解消確認、他担当との横断近似確認、最終ユーザー確認は別途必要。', '']
(ROOT/'civic-reviews-learning.md').write_text('\n'.join(md))
print(counts, 'findings',len(review['findings']),'reviewed',len(rows))
