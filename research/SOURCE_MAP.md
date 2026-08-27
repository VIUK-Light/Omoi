# Omoi 将来追加のための一次資料マップ

この資料は、将来どのテーマを調べるかを決めるためのソースマップです。質問文・カード・JSONデータは含みません。

各テーマでは、政府資料だけで結論を出しません。法律、統計、政策文書、実施機関、当事者・影響を受ける人、反対側の資料を別の列として集めます。

| # | テーマ | 既存データのシグナル | 最初の調査資料 | 先に分けるべき論点 |
| ---: | --- | --- | --- | --- |
| 1 | 市民参加・民主主義・司法・情報 | 政治3件、刑事司法・メディアの個別論点 | [日本国憲法](https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/shiryo/dl-constitution.htm)、[裁判所の制度概要](https://www.courts.go.jp/about/sosiki/gaiyo/index.html) | 法律、行政実務、政治的評価、被影響者の経験 |
| 2 | 経済・労働・住宅・社会保障 | 経済5件、仕事・職場・金融の断片 | [労働力調査](https://www.stat.go.jp/data/roudou/index.html)、[住宅・土地統計調査](https://www.stat.go.jp/data/jyutaku/index.html) | 名目/実質、世帯/個人、年度/暦年、給付/サービス |
| 3 | 気候・エネルギー・食料・防災 | 環境3件、災害1件 | [気象庁 気候変動監視](https://www.data.jma.go.jp/cpdinfo/monitor/)、[防災白書](https://www.bousai.go.jp/kaigirep/hakusho/) | 観測、将来推計、帰属、政策目標、地域リスク |
| 4 | AI・データ・プライバシー・デジタル社会 | AI・監視・SNSはあるが、データライフサイクルがない | [個人情報保護委員会](https://www.ppc.go.jp/personalinfo/)、[文化庁 AIと著作権](https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html) | 技術、法律、契約、サービス規約、倫理 |
| 5 | 医療・公衆衛生・メンタルヘルス・生命倫理 | 医療・生殖・終末期の個別論点 | [まもろうよ こころ](https://www.mhlw.go.jp/mamorouyokokoro/soudan/)、[人生会議](https://www.mhlw.go.jp/acp-jinseikaigi/about/) | 医学的助言、制度、価値判断、緊急支援 |
| 6 | 人権・多文化・宗教・差別 | ジェンダー、障害、若年妊娠に集中 | [法務省 外国人の人権](https://www.moj.go.jp/JINKEN/jinken04_00101.html)、[OHCHR 人権規約](https://2covenants.ohchr.org/About-The-Covenants.html) | 属性の一括り、同化/共生、権利/実施制約 |
| 7 | 地域・交通・公共空間・インフラ | 交通2件、公共空間1件 | [国土交通省 統計](https://www.mlit.go.jp/statistics/)、[交通政策白書](https://www.mlit.go.jp/sogoseisaku/transport/sosei_transport_fr_000222.html) | 利用者数、運行頻度、到達性、補助額、地域差 |
| 8 | 国際・平和・安全保障・開発 | 専用カバレッジがほぼない | [国連憲章](https://www.un.org/en/about-us/un-charter/full-text)、[外交青書](https://www.mofa.go.jp/mofaj/gaiko/bluebook/2025/html/index.html) | 国際法、政府立場、戦況、政治評価、人道上の影響 |
| 9 | 教育・科学・情報リテラシー | 奨学金、制服、スマホ、学習動機中心 | [文科省 学校での生成AI](https://www.mext.go.jp/zyoukatsu/ai/index.html)、[統計局 研修所](https://www.stat.go.jp/training/) | 学校規則、国の指針、学術的誠実性、科学的証拠 |
| 10 | 家族・介護・高齢化・世代間 | 介護、障害、高齢者の問いは多い | [こども家庭庁 ヤングケアラー](https://www.cfa.go.jp/policies/young-carer)、[認知症の意思決定支援](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000212395.html) | 本人意思、家族責任、公的支援、危機・虐待、地域差 |
| 11 | 文化・歴史・芸術・スポーツ | メディア2件、宗教1件、スポーツ1件 | [文化庁 統計・調査](https://www.bunka.go.jp/tokei_hakusho_shuppan/)、[国立公文書館](https://www.digital.archives.go.jp/) | 史料、公式解釈、当事者史、保存、公開、競技規則 |
| 12 | 公共倫理・未来世代・責任 | `ethics`、`future`、環境・経済の横断論点 | [内閣府 白書](https://www.cao.go.jp/whitepaper/index)、[国連 2030アジェンダ](https://sdgs.un.org/2030agenda) | 事実主張と規範、現世代/将来世代、負担配分 |

## テーマ別の調査パケット

### 1. 市民参加・民主主義・司法・情報

**不足:** 選挙・地方自治・請願・パブリックコメント・司法アクセス・適正手続・訂正・情報源評価が薄い。

**必須の視点:** 有権者、若年者、障害のある人、外国籍住民、行政、裁判利用者、被害者、被疑者、報道機関、少数意見。

**確認の順:** 憲法と法律の根拠 → 制度運用の一次資料 → 利用上の障壁 → 統計・独立評価 → 当事者資料。

### 2. 経済・労働・住宅・社会保障

**不足:** 住宅費、住まいの質、非正規雇用、賃金分布、労組、労災、ギグワーク、年金・介護・医療財政、地域格差。

**追加資料:** [厚労省 統計](https://www.mhlw.go.jp/toukei_hakusho/toukei/)、[社会保障費用統計](https://www.ipss.go.jp/ss-cost/j/fsss-R05/fsss_R05.html)、[内閣府 白書](https://www.cao.go.jp/whitepaper/index)。

**反証・対立の確認:** 労働者と事業者、借家人と所有者、若年層と高齢層、受給者と納税者、都市と地方、家計の安全と財政持続性。

### 3. 気候・エネルギー・食料・防災

**不足:** 適応、災害復旧、避難、保険、エネルギー貧困、送電網、食料供給、農業継承、障害者・高齢者の避難。

**追加資料:** [環境白書](https://www.env.go.jp/policy/hakusyo/)、[エネルギー白書](https://www.enecho.meti.go.jp/about/whitepaper/2025/)、[農業白書](https://www.maff.go.jp/j/wpaper/w_maff/r7/zenbun.html)。

**注意:** 二酸化炭素排出量、発電量、設備容量、一次エネルギー、最終エネルギー、食料自給率は別の指標です。数値だけを比較しない。

### 4. AI・データ・プライバシー・デジタル社会

**不足:** 個人情報の取得・利用目的・保存・削除・第三者提供、匿名化・再識別、漏えい、アカウント回復、フィッシング、推薦・広告・異議申立て。

**追加資料:** [個人情報保護法ガイドライン](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/)、[顔識別機能付きカメラ](https://www.ppc.go.jp/news/camera_related/)、[情報流通プラットフォーム対処法](https://www.shugiin.go.jp/Internet/itdb_housei.nsf/html/housei/21320240517025.htm)。

**注意:** 「公開されている」「同意した」「AIが判断した」だけでは合法性・妥当性を決められません。目的、運用主体、精度、影響、異議申立てを別々に記録します。

### 5. 医療・公衆衛生・メンタルヘルス・生命倫理

**不足:** 医療アクセス、セカンドオピニオン、相談への到達障壁、孤立、ACP、緩和ケア、代理意思決定、健康格差、危機時の支援先。

**追加資料:** [医療情報ネット](https://www.iryou.teikyouseido.mhlw.go.jp/znk-web/juminkanja/S2300/initialize)、[予防接種健康被害救済制度](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/vaccine_kenkouhigaikyuusai.html)、[不妊治療に関する取組](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kodomo/kodomo_kosodate/boshi-hoken/funin-01_00004.html)。

**注意:** 「医療情報」は診断や個別助言の代替ではありません。緊急支援は、一般的な解説とは別の安全導線で扱います。

### 6. 人権・多文化・宗教・差別

**不足:** 言語アクセス、信教の自由、無宗教、宗教内部の少数派、難民手続、移民労働、住居・教育・医療アクセス、複合差別。

**追加資料:** [世界人権宣言](https://europe.ohchr.org/universal-declaration-human-rights)、[難民条約](https://www.unhcr.org/about-unhcr/overview/1951-refugee-convention)、[法務省 人権相談](https://www.moj.go.jp/JINKEN/jinken21.html)。

**注意:** 文化的適応、同化、共生、法令遵守、差別禁止を単一の賛否にまとめない。

### 7. 地域・交通・公共空間・インフラ

**不足:** 人口減少、交通空白、物流、道路・橋・水道の更新、デジタル回線、公共投資、都市と地方のサービス格差。

**追加資料:** [国土交通白書](https://www.mlit.go.jp/hakusyo/mlit/r07/hakusho/r08/pdfindex.html)、[国交省統計](https://www.mlit.go.jp/statistics/)。

**注意:** 利用者数が少ないことと、必要性が低いことを同義にしない。非運転者、子ども、高齢者、障害者、物流労働者の影響を分けます。

### 8. 国際・平和・安全保障・開発

**不足:** 国連、国際人道法、民間人保護、停戦、難民、核・通常兵器、サイバー安全保障、ODA、現地主体性。

**追加資料:** [国連平和維持活動](https://peacekeeping.un.org/en/what-is-peacekeeping)、[防衛白書](https://www.mod.go.jp/j/press/wp/wp2025/w2025_00.html)、[開発協力大綱](https://www.mofa.go.jp/mofaj/gaiko/oda/seisaku/taikou_202306.html)。

**注意:** 現在進行中の紛争は、数値・支配地域・攻撃主体・法的評価が頻繁に更新されます。事実の基準日を明記し、国家発表を唯一の事実として扱いません。

### 9. 教育・科学・情報リテラシー

**不足:** 生成AIの学校利用、引用、剽窃、評価、教師の校務利用、仮説・再現性・利益相反・研究データ・オープンサイエンス。

**追加資料:** [文科省 生成AI利用ガイドライン](https://www.mext.go.jp/content/20241226-mxt_shuukyo02-000030823_001.pdf)、[研究不正への対応](https://www.mext.go.jp/a_menu/jinzai/fusei/)、[内閣府 研究DX](https://www8.cao.go.jp/cstp/kenkyudx.html)。

**注意:** 査読・統計・AI生成・専門家合意は、それぞれ品質の保証範囲が異なります。

### 10. 家族・介護・高齢化・世代間

**不足:** レスパイト、介護者支援、成年後見・意思決定支援、高齢者虐待、消費者被害、地域包括支援、DV下の親子交流。

**追加資料:** [高齢者虐待防止](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/kaigo_koureisha/boushi/index.html)、[地域包括ケア](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/kaigo_koureisha/chiiki-houkatsu/)、[児童虐待対応ダイヤル189](https://www.cfa.go.jp/policies/jidougyakutai/gyakutai-taiou-dial/)。

**注意:** 家族で抱えることを前提にしない。本人・家族・支援者・学校・雇用者・自治体の負担と権利を別々に確認します。

### 11. 文化・歴史・芸術・スポーツ

**不足:** 文化参加、保存と公開、著作者の労働、地域文化、史料の来歴、少数者の歴史、障害者スポーツ、選手の福祉、スポーツガバナンス。

**追加資料:** [文化庁 文化に関する世論調査等](https://www.bunka.go.jp/tokei_hakusho_shuppan/tokeichosa/)、[スポーツ庁統計](https://www.mext.go.jp/sports/b_menu/toukei/main_b8.htm)、[東京大学史料編纂所](https://www.hi.u-tokyo.ac.jp/)。

**注意:** 公的な歴史解釈と、原史料、当事者の記憶、研究上の議論を同じ重さの事実として混ぜない。

### 12. 公共倫理・未来世代・責任

**不足:** 世代間負担、予防原則、損失配分、将来世代、公共投資、正義の比較軸を横断する研究枠。

**確認の順:** まず事実（制度・統計・予測）を固め、その後に負担・便益・権利・責任の価値判断を別枠で扱います。

## 根拠に昇格させる前の最小チェック

1. 一次資料を実際に開いたか
2. 発行元、版、公開日、対象期間、地域、母数を記録したか
3. 反対側または例外を示す資料を最低1件確認したか
4. 当事者を一種類の立場に代表させていないか
5. 時点依存の法律・統計・支援窓口を、公開直前に再確認できるか
6. 質問文に変換しなくても、論点が一つのClaimとして説明できるか
