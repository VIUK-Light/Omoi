# 既存質問30件の独立概念レビュー

判定は **keep 24件 / adjust 6件 / hold 0件**。必須修正の内訳は、論点・意味・Level適合に関わる4件と、局所的な明確化2件。別に任意の追問を3件示す。正本JSONとproposal.jsonは編集していない。

二択そのものは欠点としない。二択を外す場合も、価値の違いと自分の利害が残れば採用できる。原子力カードの優先順位の選択、配信者カードの代償を伴う自由な対応は、その基準でkeepとした。

レビュー対象のproposal.json SHA-256: `3cccc8564d494538107ef6083f1cff32b0844b48ecbeb07b13456405336028c6`

## 概念の根拠

- [README.md](/workspace/Omoi/README.md:11): 社会や価値観について話すための、オープンソースの質問カードです。
- [README.md](/workspace/Omoi/README.md:13): Omoiは、同じ考えになるためのものではありません。違う考えを知るために。
- [README.md](/workspace/Omoi/README.md:23): 正解を決める必要はありません。「なぜそう思う？」まで話してみてください。
- [index.html](/workspace/Omoi/index.html:143): 同じ考えになるためではなく、違う考えを知るために。
- [guide.html](/workspace/Omoi/guide.html:126): 日常の価値観から、社会問題、倫理、制度、人生の選択まで、一つの答えに決めにくいテーマについて話せます。
- [QUESTION_DATA_SCHEMA.md](/workspace/Omoi/QUESTION_DATA_SCHEMA.md:25): 個人的な利害または倫理的なトレードオフを自分に置き換える問い
- [README.md](/workspace/Omoi/README.md:112): 片方の答えだけが明らかに正しく見える表現をできるだけ避け、複数の立場から話せる問いにしてください。

## 先に修正したい点

| ID | 重さ | 起源 | 指摘 |
| --- | --- | --- | --- |
| bridge-002 | material | introduced | 境界の判断が、負担の少ない連絡方法の助言へ寄った。 |
| criminal-justice-001 | material | introduced | 両方大切にする原則の列挙で終わりやすく、難しい場面の判断が消えた。 |
| stigma-001 | material | persistent | 第三者の投稿への感想に留まり、affected / Level 4の自分事になっていない。 |
| r6-13-03-l4-conv | material | introduced | 見えていない窓口の需要と、男性支援の必要性を混同しやすい。 |
| FAN-J02-L4 | minor | improved_but_remaining | 推しにお金を使うのがあなたであることが、まだ省略されている。 |
| FAN-B02-L4 | minor | improved_but_remaining | 性別以外の比較条件が同じだという前提が、質問文では一部だけ示される。 |

## 30件の判定

### contact-004

**keep / none / 具体的指摘なし / none**

用語の説明を一語句足しただけで、つながりを心地よいと感じるかという身近な価値観が残る。Level 1の入口として自然で、片方の答えを優遇しない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:9) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:45) / [現行](/workspace/Omoi/level1.json:195)

### friendship-012

**keep / none / 具体的指摘なし / none**

略語を日常語に置き換え、対面とネットでの話しやすさを比べる軸を保つ。ネットで知り合い対面でも会う友人は両方に当てはまり得るが、それを話せるので致命的な分類や二択の問題ではない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:23) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:57) / [現行](/workspace/Omoi/level1.json:923)

### romance-031

**keep / none / 具体的指摘なし / none**

重い／愛情深いという評価を、受け手が感じるうれしさと負担に置き換えている。愛情の受け取り方と境界の違いを話せるので、価値観の軸は残る。恋人の経験を必須とはしておらず、想像でも答えられる。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:37) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:69) / [現行](/workspace/Omoi/level1.json:531)

### conflict-013

**keep / none / 具体的指摘なし / none**

何について話すかが気持ちと態度に明示された。Level 1では価値観の対立を毎回課す必要はなく、身近な反応の違いを知る入口として適切。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:51) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:81) / [現行](/workspace/Omoi/level1.json:1203)

### support-003

**keep / none / 具体的指摘なし / none**

自分たちで解決するか相談するかの判断軸が追加され、友人関係の自律と助けを求める境界を話せる。トラブルに範囲を絞った意味の変化はあるが、Level 2の役割に合い、どちらを選ぶかは固定しない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:67) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:93) / [現行](/workspace/Omoi/level2.json:27)

### support-008

**keep / none / 具体的指摘なし / none**

評価が割れる場面を置き、行動の目的、内容、相手への影響で相談と告げ口を分けられる。責められていることを前提にしても、その非難が妥当かは決めていない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:81) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:105) / [現行](/workspace/Omoi/level2.json:163)

### bridge-002

**adjust / material / introduced / required**

元の問いは連絡を受ける人と送る人の境界をどう判断するかだった。変更案は相手の負担を小さくする伝え方を探す形で、何を気づかいとみなすかという意見の違いより、上手な連絡方法の助言が中心になりやすい。具体化した場面は残し、境界を判断する問いに戻したい。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:95) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:117) / [現行](/workspace/Omoi/level2.json:371)

確認した文:

> どんな伝え方なら、返事を急がせる負担になりにくいと思う？

必須修正の候補:

> 返事が遅い友達を心配して、もう一度連絡したい。その連絡が、心配を伝えることになるか、返事の催促になるかは、何で決まると思う？

### bridge-009

**keep / none / 具体的指摘なし / none**

違う秘密を食い違う説明へ具体化しているので、元の範囲すべてを同じ意味で保つ変更ではない。ただし秘密を守ること、友人への忠実さ、公平さをどう扱うかは残る。「どちらかの味方になるか」は中立を選ぶ答えも含み、片方を選ばせる表現ではない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:109) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:129) / [現行](/workspace/Omoi/level2.json:427)

### family-law-001

**keep / none / 具体的指摘なし / none**

共同親権の法的な責任と権限を簡潔に説明し、原則にするかという制度判断を保持している。現在の法律がその原則だという事実の断言にはなっていない。背景にも子どもの利益、関わり、安全上の懸念が残る。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:125) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:141) / [現行](/workspace/Omoi/level3.json:54)

### family-law-003

**keep / none / 具体的指摘なし / none**

選べる対象が夫婦それぞれの名字だと分かり、制度に賛成かどうかの判断を保持する。希望する夫婦に限る説明は制度の特徴であり、答えの誘導そのものではない。背景は選択の自由と家族制度の見方を提示している。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:140) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:153) / [現行](/workspace/Omoi/level3.json:126)

### criminal-justice-001

**adjust / material / introduced / required**

相談への対応と事実確認を分ける方向は有益だが、問いが両方を守るために大切なことを列挙する形になり、判断が難しくなる場面が消えている。両方大切、丁寧に確認する、という共通回答で終わりやすい。元の二択を復活させる必要はないが、事実未確認時の具体的な制度対応を置けば、被害を訴える人の安全と訴えられた人の権利をどう扱うかを話せる。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:154) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:165) / [現行](/workspace/Omoi/level3.json:99)

確認した文:

> 両方を守るために、相談への対応と、事実を確かめる手続きでは何を大切にするべきだと思う？

必須修正の候補:

> 性被害の訴えがあり、事実はまだ確かめられていないとする。学校や職場が安全を守るために、訴えられた人の活動を一時的に制限するかどうかは、何を基準に決めるべきだと思う？

修正候補は判断する場面を追加するため、単なる言い換えではない。相談した人への支援と、訴えられた人への措置を同一視しないことが重要。新しい場面を採用する場合も最終確認の対象。

### justice-004

**keep / none / 具体的指摘なし / none**

仮釈放の説明と被害を受けた人の反対を別の文に分けても、被害者の意向と社会復帰の重みを判断する軸は保持している。更生が進んだという仮定の設定として読め、一般に仮釈放が安全だと保証する文ではない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:169) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:177) / [現行](/workspace/Omoi/level3.json:418)

### medicine-001

**keep / none / 具体的指摘なし / none**

死後の提供に範囲を定め、意思表示がない場合を同意とみなす仕組みが明確になった。現在の法律を説明する断言ではなく制度提案への意見であり、救命と自己決定の対立も背景に残る。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:184) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:189) / [現行](/workspace/Omoi/level3.json:445)

### family-policy-001

**keep / none / 具体的指摘なし / none**

代理出産の説明は既存背景と一致する。依頼する人の選択肢と妊娠・出産を担う人の身体的負担や圧力をどう考えるかという制度・倫理の判断を保つ。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:198) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:201) / [現行](/workspace/Omoi/level3.json:490)

### technology-004

**keep / none / 具体的指摘なし / none**

生成AIという対象と作者の許可を明示しており、既存背景が扱う開発と創作者の権利の論点に合う。「どう思う」への変更でも賛否・条件付き賛成を話せ、無断利用の法的可否は断言していない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:212) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:213) / [現行](/workspace/Omoi/level3.json:631)

### economy-001

**keep / none / 具体的指摘なし / none**

受けやすさを申請・確認へ絞るため元の問いの範囲は狭まるが、既存解説の申請のハードルと不正利用の確認に合っている。確認を簡単にするかという具体的な制度判断が残る。給付額の議論と混同しにくくなる。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:226) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:225) / [現行](/workspace/Omoi/level3.json:679)

### economy-003

**keep / none / 具体的指摘なし / none**

所得と資産、負担の割合を明示した点は既存背景と一致する。税の公平と経済活動への影響を考える問いとして機能し、金持ちという人物評価から制度の判断へ整えられている。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:241) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:237) / [現行](/workspace/Omoi/level3.json:703)

### politics-002

**keep / none / 具体的指摘なし / none**

徴兵の意味として本人の希望によらない軍務を示しており、国の安全と個人の自由の対立を隠さず提示できている。この特徴の説明だけを反対への誘導とはみなさない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:255) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:249) / [現行](/workspace/Omoi/level3.json:847)

### environment-002

**keep / minor / introduced / optional**

四つの判断材料から特に重視するものを選ぶ形は、価値の優先順位を話せるので概念に合う。賛否の結論を毎回必須にする必要はない。元の政策判断までつなぐ力は少し弱くなるため、継続の可否と理由を一言添える改善は任意で有効。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:269) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:261) / [現行](/workspace/Omoi/level3.json:787)

確認した文:

> 原子力発電を今後も使うか考えるとき、電気の安定供給、気候への影響、事故の危険、廃棄物の管理のうち、何を特に重視したい？

任意の候補:

> 原子力発電を今後も使うか考えるとき、電気の安定供給、気候への影響、事故の危険、廃棄物の管理のうち、何を特に重視したい？ それを踏まえて、使い続けるかどうかをどう考える？

任意の追問。二択が消えたことを不適合の根拠にはしていない。

### r6-07-05-l3

**keep / none / 具体的指摘なし / none**

見出しの印象を仮の割合で具体化し、報道の責任という判断を維持している。新背景は仮の数字であることと、賛成以外に保留などが含まれる可能性を説明しており、賛成以外を反対に読み替える誤りがない。比較しやすさとすべての切り口を示す難しさも両方示す。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:283) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:273) / [現行](/workspace/Omoi/level3.json:2643)

### relationship-290

**keep / none / 具体的指摘なし / none**

相手に好きになる見込みがあったこと、自分は本気だったこと、好きという言葉を信じたこと、恋愛感情がないことを伝えられなかった点を保持する。自分の信頼と時間を費やした立場から許せるかを考えるLevel 4の問いとして成立する。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:312) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:287) / [現行](/workspace/Omoi/level4.json:2489)

### stigma-001

**adjust / material / persistent / required**

投稿を見た自分の感想だけでは、その言葉で扱われる自分の不利益や葛藤が置かれていない。現行データも投稿を見る第三者なのに perspective は affected であり、これは元からある問題。短文化は改善しているが、Level 4と affected を据え置くなら、自分にその呼び名が付く状況を入れ、支援の可視化と人格を決めつけられることを自分事にしたい。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:327) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:299) / [現行](/workspace/Omoi/level4.json:2533)

確認した文:

> あなたは、この呼び方をどう受け止める？

必須修正の候補:

> あなたは、収入や人間関係で困っている男性だとする。その事情を「弱者男性への支援が必要」と紹介されると、支援につながるかもしれないが、笑ったり見下したりする人もいる。自分をこの言葉で説明されることを、どう受け止める？

Levelや視点を変更する提案ではない。元からの不整合を質問文で補う候補。架空の役割を自分に置くことは、Levelを利用者の属性として扱うこととは別。

### r6-13-03-l4-conv

**adjust / material / introduced / required**

相談につながっていない人の需要が測れていない、という不確実性を、男性側の必要性が確認できない、という表現へ変えている。潜在的な窓口の利用ニーズの量と、男性支援がそもそも必要かの違いが曖昧になり、提案を支持する側の理由を弱く読むおそれがある。限られた予算と既存利用者への影響は保持し、何が未確認かを元の意味に戻す。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:342) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:311) / [現行](/workspace/Omoi/level4.json:4211)

確認した文:

> 男性側の必要性はまだ十分に確かめられておらず

必須修正の候補:

> あなたは相談窓口の予算を決める担当者。男性向けの窓口を増やすには、利用実績のある女性向け窓口を一部減らす必要がある。相談につながっていない男性が、どれだけ窓口を必要としているかは確かめきれておらず、支援が途切れる女性も出るかもしれない。
> それでも予算の配分を変える？

### r6-20-05-l4

**keep / none / 具体的指摘なし / none**

配信者として自分が利益を得ること、誤解を解くと収入が減りスタッフにも影響があること、私生活を守りたいことが残るので、Level 4の自分事と代償は失われていない。新背景は別の対応でも収入が変わり得ると補い、黙ることへの責任も問える。二択を外したことだけで倫理的な判断が消えたとはみなさない。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:357) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:323) / [現行](/workspace/Omoi/level4.json:4843)

### FAN-J02-L4

**adjust / minor / improved_but_remaining / required**

恋人との関係と時間配分は個人的な利害を持つので、Level 4の軸は残る。ただし、誰が推しにお金を使うのかという旧文の省略が一部残り、「あなたの恋人は、推しに使うお金や予定を知っている」は恋人自身の活動とも読める。主語の明確化を目的にするなら、あなたが使うと一語句で特定したい。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:384) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:337) / [現行](/workspace/Omoi/level4.json:4927)

確認した文:

> あなたの恋人は、推し（応援している人）に使うお金や予定を知っている。

必須修正の候補:

> あなたの恋人は、あなたが推し（応援している人）に使うお金や予定を知っている。それでも「二人で過ごす時間より、推しを優先されている」と感じている。
> 「推しと恋人への気持ちは別物」と伝えるだけで、その不満に答えられると思う？

感情の種類と時間配分が別だという説明は既存解説からある。最後の「だけ」は答えを否定側へ寄せる面があるが、元から同趣旨の評価を尋ねており、今回の必須指摘は主語の残る曖昧さに限る。

### FAN-B01-L4

**keep / minor / introduced / optional**

自分の受け止め方が性別で変わるかという内省と、性別以外の条件を揃える比較は保持している。原文の差の根拠を尋ねる一節は削られており、変更理由の「差の根拠を会話の言葉にする」とは完全には一致しない。ただしOmoiの使い方自体が理由まで話すので、根拠を一言戻すことは任意の改善とする。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:399) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:349) / [現行](/workspace/Omoi/level4.json:4951)

確認した文:

> ほかの条件が同じなら、性別であなたの受け止め方は変わる？

任意の候補:

> 彼女が彼氏に「推し（応援している人）の方がかっこいい」と言う場合と、彼氏が彼女に「推しの方が可愛い」と言う場合。
> ほかの条件が同じなら、性別であなたの受け止め方は変わる？ 変わるなら、何が理由？

observerとしての内省は現行にもある。全Level 4に特定の金銭的損失や二択を付ける要求はしていない。

### FAN-B02-L4

**adjust / minor / improved_but_remaining / required**

友人への助言を担う自分の判断というLevel 4の視点は保持している。一方、質問ではお金・時間・約束だけを同じにし、既存背景が揃える生活への影響や嫉妬の訴えを省くため、同じ助言になるかの差が性別によるものか分かりにくい。性別以外は同じという短い句にすると、解説を開かなくても公平に比較できる。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:414) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:361) / [現行](/workspace/Omoi/level4.json:4963)

確認した文:

> 使うお金や時間、二人の約束は同じとする。

必須修正の候補:

> 友人から二つの相談を受けた。一つは彼氏の推し（応援している人）への活動に彼女が嫉妬している話、もう一つは彼女の推しへの活動に彼氏が嫉妬している話。使うお金や時間、二人の約束など、性別以外の条件は同じとする。
> あなたは、両方に同じ助言をする？

原文は質問文だけでは条件の同一性が全く明示されていなかった。今回一部を示した改善は認め、その残りの省略を指摘する。「同じ基準」と「同じ助言」は厳密には異なるが、同条件のこの場面では、その差だけを必須修正の根拠にはしない。

### FAN-G01-L4

**keep / none / 具体的指摘なし / none**

推しへの自分の気持ちと、将来恋人が必要だという他者の判断を明示できている。不快に感じない答えや複数の理由も残り、呼び名と生き方への介入を分けて、自分にかかわる価値観を話せる。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:429) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:373) / [現行](/workspace/Omoi/level4.json:4975)

### FAN-G02-L4

**keep / none / 具体的指摘なし / none**

自分が答えを拒んだ後に関係を失う場面へまとめても、答えない自由と相手が離れる自由の対立、失う関係という自分の利害が残る。最初に拒否するかの問いは減るが、その判断の妥当性を結果から考える構成は成立する。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:444) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:385) / [現行](/workspace/Omoi/level4.json:4987)

### FAN-G04-L4

**keep / minor / persistent / optional**

自分の感情が恋に近いという内省は明確になり、恋人を作らない理由が分かるかのような旧文も改善している。自分の恋愛的な期待と相手の自由の対立は背景にあるが、質問文だけでは相手の行動への意味付けが中心で、行動や期待の境界までは進まない。自分が相手の自由をどう扱うかまで添えるのは、Level 4の深さを強める任意の改善。

- [確認案](/workspace/Omoi/staging-clarity/question-revisions.md:459) / [proposal](/workspace/Omoi/staging-clarity/proposal.json:397) / [現行](/workspace/Omoi/level4.json:5011)

確認した文:

> 推しに恋人がいないとしたら、それをファンへの配慮だと受け止める？

任意の候補:

> あなたは、推し（応援している人）への気持ちが恋に近いと感じている。推しに恋人がいないとしたら、それをファンへの配慮だと受け止める？ 推しに恋人ができたとき、その気持ちと相手の自由をどう扱いたい？

弱さは元からあり、今回主語と不確実性は改善した。内省を伴う現行の形を不適合と断定しない。追問の追加は新しい論点を含むため、最終確認の対象。

## 解説の正確さと限界

変更された解説2件（r6-07-05-l3、r6-20-05-l4）は、仮の数字や判断条件を明示し、片方の結論を押し付ける断言を避けている。賛成以外と反対を取り違える誤りもない。用語説明の追加は既存背景との一致を確認した。

これは概念・文章・解説との整合性のレビューであり、外部の法律資料や医療資料を使った全現行解説の事実監査ではない。現行READMEの出典未整備という限界を、今回の言い換えだけで解消したとは判断しない。

修正候補のうち具体的な場面を足すものは元の意味や論点に触れる。利用者の最終確認を経て採用するための候補であり、このレビューでは反映していない。
