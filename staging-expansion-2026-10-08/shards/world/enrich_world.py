"""Attach reviewed representative provenance; no question generation."""
from pathlib import Path
import json
folder=Path(__file__).resolve().parent
p=folder/'additions.json';rows=json.loads(p.read_text());byid={r['card']['id']:r for r in rows}
refs={
'exp26-world-0171':{'id':'ENV-02','expected':'捕獲','related':['animals-001','animals-002'],'text':'架空の湿地で、外から持ち込まれた動物による被害が確認され、専門家の計画に沿って捕獲する場面です。引き取り先がないのは問いの条件で、外から来た動物すべてが有害という意味ではありません。生態系を守る目標と、個々の動物の命を失わせる行為を自分が担うことを分けて考えます。','sources':[('環境省・防除に関する基本的な事項','https://www.env.go.jp/nature/intro/3control/bojooutline.html'),('環境省・外来種被害防止行動計画第2版','https://www.env.go.jp/nature/intro/2outline/actionplan2.html')]},
'exp26-world-0340':{'id':'INT-02','expected':'逃れて','related':['immigration-002','r6-05-03-l4'],'text':'架空の帰還場面です。故郷の家族、新しく築いた仕事や友人、安全に関する不確かな情報を別の条件として考えます。帰る、残る、待つ選択のどれかを勧める問いではありません。UNHCRの1996年資料は自由な選択と安全・尊厳の原則の参照であり、現在の特定の国の安全を評価する根拠ではありません。','sources':[('UNHCR・Voluntary Repatriation: International Protection（1996）','https://www.refworld.org/policy/opguidance/unhcr/1996/19472')]},
'exp26-world-0369':{'id':'INT-01','expected':'学校','related':['clarity-international_peace_and_cooperation-03-l2','clarity-international_peace_and_cooperation-01-l3'],'text':'架空の支援計画です。担当者が寄付者へした約束、学校を待つ家庭、住民会議の希望は異なります。住民会議が全住民を代表するとは設定しておらず、会議に出にくい人の声も確かめる余地があります。現地主導の協力の資料は共同で必要を決める論点を支えますが、水道が学校より重要という結論や計画変更の資金条件を証明しません。','sources':[('OECD・Meaningful co-creation of development solutions（2026）','https://www.oecd.org/en/publications/practical-guidelines-for-supporting-locally-led-development_eaecf72b-en/full-report/action-area-meaningful-co-creation-of-development-solutions_a388258e.html')]},
'exp26-world-0550':{'id':'CS-S1','expected':'既提供','related':['r6-08-04-l3','r6-08-04-l4'],'text':'架空の長期研究です。新しい記録を渡す判断ではなく、過去に説明を受け同意した利用条件を、現在の自分がどう受け止めるかを考えます。既提供記録の扱いは研究ごとの説明や条件を確認する必要があり、ここでの条件を全研究に共通する法的規則とはしません。資料は2010年の米国の指針で、日本の一律のルールを示すものではありません。','sources':[('米国OHRP・Guidance on Withdrawal of Subjects from Research（2010）','https://www.hhs.gov/ohrp/regulations-and-policy/guidance/guidance-on-withdrawal-of-subject/index.html')]},
'exp26-world-0594':{'id':'CS-S2','expected':'過去の結果','related':['clarity-science_research_and_uncertainty-01-l3','clarity-science_research_and_uncertainty-03-l2'],'text':'架空の研究者の選択です。同じ条件で再現することと、別の条件でも確かめることは異なります。既に発表した結果への責任、新しい重要な疑問を知る喜び、限られた時間、自分の次の機会を別の価値として考えます。新しい研究を利己的、確認だけを正しいとは扱いません。次の研究機会への影響は問いの仮定です。','sources':[('National Academies・Reproducibility and Replicability in Science（2019）第6章','https://www.nationalacademies.org/read/25303/chapter/9')]}
}
for cid,ref in refs.items():
 r=byid[cid];assert ref['expected'] in r['card']['question'],(cid,r['card']['question'])
 r['card']['detail']={'text':ref['text'],'sources':[{'title':title,'url':url} for title,url in ref['sources']]}
 r['editorial'].update({'representative_analysis_id':ref['id'],'related_existing_ids':ref['related'],'source_review_scope':'2026-10-07の分野別分析に記録された資料確認範囲を利用。架空の条件の正しさを証明する出典ではない。'})
p.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('representative provenance attached',len(refs))
