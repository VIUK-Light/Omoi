"""Render an offline review document from the pending proposal, not live UI."""
from pathlib import Path
import json

folder = Path(__file__).resolve().parent
repo = folder.parent
proposal = json.loads((folder / 'proposal.json').read_text())
baseline = sum([json.loads((repo / f'level{i}.json').read_text()) for i in range(1, 5)], [])
plan = json.loads((repo / 'research/addition-analysis-2026-10-07/expansion-plan.json').read_text())
comparison_file = folder / 'comparison-candidates.json'
comparisons = json.loads(comparison_file.read_text())['per_addition'] if comparison_file.exists() else []
payload = {'additions': proposal['additions'], 'baseline': baseline, 'categories': [{'id': c['id'], 'name': c['name']} for c in plan['categories']], 'comparisons': comparisons}
encoded = json.dumps(payload, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
template = '''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Omoi — 追加3,768問の確認</title>
<style>
:root{font-family:system-ui,-apple-system,"Noto Sans JP",sans-serif;color:#23302c;background:#f6f5f1;line-height:1.8}body{margin:0}main{max-width:1120px;margin:auto;padding:32px 24px 72px}h1{font-size:clamp(25px,4vw,37px);line-height:1.4;margin:14px 0}h2{font-size:18px}p{margin:8px 0 20px}.status{display:inline-block;border:1px solid #927329;border-radius:5px;padding:2px 12px;font-size:14px;color:#705616;background:#fff7de}.numbers{display:flex;gap:24px;flex-wrap:wrap;margin:22px 0}.numbers div{flex:1;min-width:150px;background:white;border:1px solid #deded3;border-radius:8px;padding:14px 20px}.numbers b{display:block;font-size:30px;color:#235b4c}.numbers span{font-size:14px;color:#5b645e}a{color:#235b4c}.filters{display:grid;grid-template-columns:2fr 1.5fr 1fr;gap:12px;margin:22px 0 10px}label{font-size:14px;font-weight:600}input[type=search],select{display:block;box-sizing:border-box;width:100%;margin-top:5px;padding:11px;background:white;border:1px solid #a7b2aa;border-radius:5px;font:inherit;color:inherit}label.check{display:flex;gap:8px;align-items:center;margin:12px 0;font-weight:400}input[type=checkbox]{width:18px;height:18px}button{font:inherit;background:white;border:1px solid #9ca89f;border-radius:5px;padding:7px 14px;color:#235b4c;cursor:pointer}button:disabled{opacity:.4;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #a66e22;outline-offset:3px}.pager{display:flex;align-items:center;gap:12px;justify-content:space-between;margin:16px 0}.pager div{display:flex;align-items:center;gap:10px}.count{font-size:14px;color:#59665f}.table-wrap{overflow-x:auto;background:white;border:1px solid #ddd;border-radius:8px}table{width:100%;border-collapse:collapse;text-align:left}th{font-size:13px;color:#5c685f;background:#e9eee9;font-weight:600;padding:12px 14px}td{padding:18px 14px;border-top:1px solid #e2e6e0;vertical-align:top}td.meta{width:175px;font-size:13px;color:#617066}.level{display:inline-block;font-size:12px;border-radius:4px;background:#e9efea;padding:1px 7px;color:#295b47;margin-bottom:7px}.identifier{overflow-wrap:anywhere;font-size:11px;color:#7c857f}.question{font-size:16px;margin:0 0 12px}.warning{font-size:12px;color:#785324;margin:8px 0}summary{cursor:pointer;color:#235b4c;font-size:14px}details .body{background:#f7f8f4;margin:12px 0 0;padding:12px 16px;font-size:14px;border-left:3px solid #b2c6b5}details .body p{margin:5px 0 15px}.label{font-weight:600}.reference{padding-top:10px;border-top:1px solid #dae0d8}.notice{font-size:14px;max-width:900px}.empty{padding:30px}.foot{font-size:13px;color:#617066;margin-top:32px}@media(max-width:650px){main{padding:22px 14px 50px}.filters{grid-template-columns:1fr}.numbers{gap:8px}.numbers div{min-width:100px;padding:10px}.numbers b{font-size:25px}td.meta{width:100px}td,th{padding:12px 9px}.question{font-size:15px}.pager{flex-wrap:wrap}}
</style></head><body><main>
<span class="status">最終確認待ち · 2026年10月8日</span>
<h1>追加3,768問の確認</h1>
<p class="notice">Omoiの「普段は聞かなかった相手の考えと理由を知る」という目的に沿った追加案です。重い話・深い問いへの特化を保ち、カテゴリーごとの入口を広げます。現在の問題データは変更していません。</p>
<div class="numbers"><div><span>現在</span><b id="current"></b></div><div><span>追加案</span><b id="added"></b></div><div><span>反映後の提案数</span><b id="total"></b></div></div>
<p class="notice"><a href="all-additions.csv">全問のCSV</a> · <a href="README.md">配分・レビュー・検証の記録</a>。背景と追加理由は各問を開いて確認できます。既存問の比較候補は文面の近さから抽出したもので、同じ意味と判定したものではありません。</p>
<div class="filters"><label>検索<input id="search" type="search" placeholder="問い・背景・小分類・ID"></label><label>カテゴリー<select id="category"><option value="">すべて</option></select></label><label>Level<select id="level"><option value="">すべて</option><option value="1">L1 — 身近な話</option><option value="2">L2 — 考える話</option><option value="3">L3 — 重い話</option><option value="4">L4 — 深い話</option></select></label></div>
<label class="check"><input type="checkbox" id="warned">内容の配慮タグがある問いに絞る</label>
<div class="pager"><span id="count" class="count" role="status" aria-live="polite"></span><div><button id="previous" type="button">前の60問</button><span id="page" class="count"></span><button id="next" type="button">次の60問</button></div></div>
<div class="table-wrap"><table><thead><tr><th scope="col">分類</th><th scope="col">問い・背景・追加理由</th></tr></thead><tbody id="rows"></tbody></table></div>
<p class="foot">仮の場面として話せる問いです。自分の体験を話す必要はなく、話したくない問いは飛ばせます。この文書での閲覧や検索は、個々の問題変更の承認にはなりません。</p>
</main><script id="data" type="application/json">__DATA__</script>
<script>
"use strict";
const data=JSON.parse(document.getElementById("data").textContent);
const categoryNames=new Map(data.categories.map(c=>[c.id,c.name]));
const original=new Map(data.baseline.map(c=>[c.id,c]));
const comparisons=new Map(data.comparisons.map(c=>[c.id,c.neighbors]));
const warnings={sexual_violence:"性暴力",pregnancy_and_reproduction:"妊娠・生殖",infidelity:"不貞",family_conflict:"家族の葛藤",abuse_and_coercion:"虐待・強要",self_harm:"自傷",medical_and_end_of_life:"医療・看取り",crime_and_punishment:"犯罪・処罰",discrimination_and_hate:"差別",privacy_and_surveillance:"プライバシー・監視"};
const perspectives={affected:"影響を受ける本人",actor:"行動する本人",decision_maker:"決定する立場",observer:"見届ける立場"};
const ui=Object.fromEntries(["search","category","level","warned","rows","count","previous","next","page"].map(id=>[id,document.getElementById(id)]));
const pageSize=60; let page=0;
const searchable=data.additions.map(r=>({row:r,text:[r.card.id,r.card.topic,r.card.question,r.card.detail?.text||"",r.reason].join(" ").normalize("NFKC").toLocaleLowerCase("ja")}));
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function paragraph(parent,label,text){const p=el("p");p.append(el("span",label+"：","label"),document.createTextNode(text));parent.append(p);}
function render(){
 const query=ui.search.value.trim().normalize("NFKC").toLocaleLowerCase("ja");
 const selected=searchable.filter(({row:r,text})=>(!query||text.includes(query))&&(!ui.category.value||r.card.category===ui.category.value)&&(!ui.level.value||r.card.level===Number(ui.level.value))&&(!ui.warned.checked||r.card.content_warning?.length));
 const pages=Math.max(1,Math.ceil(selected.length/pageSize));page=Math.min(page,pages-1);
 ui.rows.replaceChildren();
 for(const {row:r} of selected.slice(page*pageSize,(page+1)*pageSize)){
  const c=r.card,tr=el("tr"),meta=el("td",undefined,"meta"),cell=el("td");
  meta.append(el("span","L"+c.level,"level"),el("div",categoryNames.get(c.category)),el("div","感度 "+c.sensitivity),el("div",c.id,"identifier"));
  cell.append(el("p",c.question,"question"));
  if(c.content_warning?.length)cell.append(el("p",c.content_warning.map(w=>warnings[w]||w).join(" · "),"warning"));
  const details=el("details"),body=el("div",undefined,"body");details.append(el("summary","背景・追加理由・既存との比較を開く"));
  if(c.detail?.text)paragraph(body,"背景",c.detail.text);
  paragraph(body,"追加理由",r.reason);paragraph(body,"小分類",c.topic);
  if(c.perspective)paragraph(body,"視点",perspectives[c.perspective]||c.perspective);
  for(const s of c.detail?.sources||[]){try{const parsed=new URL(s.url);if(!["https:","http:"].includes(parsed.protocol))continue;const a=el("a",s.title);a.href=s.url;a.target="_blank";a.rel="noopener noreferrer";const linkParagraph=el("p");linkParagraph.append(a);body.append(linkParagraph);}catch{}}
  const authored=(r.editorial?.related_existing_ids||[]).map(id=>({id,authored:true}));
  const neighbors=(comparisons.get(c.id)||[]).filter(n=>n.current&&n.similarity>=.18&&!authored.some(a=>a.id===n.id)).slice(0,3);
  if(authored.length||neighbors.length){body.append(el("p","作成時の比較先と、文面の近さから抽出した比較候補です。意味の同一性を判定した一覧ではありません。"));for(const n of [...authored,...neighbors]){const old=original.get(n.id);if(!old)continue;const box=el("details",undefined,"reference");box.append(el("summary",(n.authored?"作成時の比較先 · ":"文面比較候補 · ")+old.id+" · L"+old.level));const inside=el("div",undefined,"body");paragraph(inside,"既存の問い",old.question);if(old.detail?.text)paragraph(inside,"既存の背景",old.detail.text);box.append(inside);body.append(box);}}
  details.append(body);cell.append(details);tr.append(meta,cell);ui.rows.append(tr);
 }
 if(!selected.length){const tr=el("tr"),td=el("td","条件に合う問いがありません。検索や絞り込みを変更してください。","empty");td.colSpan=2;tr.append(td);ui.rows.append(tr);}
 ui.count.textContent=selected.length.toLocaleString("ja-JP")+" / "+data.additions.length.toLocaleString("ja-JP")+"問";
 ui.page.textContent=(page+1)+" / "+pages;ui.previous.disabled=page===0;ui.next.disabled=page>=pages-1;
}
for(const category of data.categories){const option=el("option",category.name);option.value=category.id;ui.category.append(option);}
for(const key of ["search","category","level","warned"])ui[key].addEventListener(key==="search"?"input":"change",()=>{page=0;render();});
ui.previous.addEventListener("click",()=>{page--;render();});ui.next.addEventListener("click",()=>{page++;render();});
document.getElementById("current").textContent=data.baseline.length.toLocaleString("ja-JP");document.getElementById("added").textContent=data.additions.length.toLocaleString("ja-JP");document.getElementById("total").textContent=(data.baseline.length+data.additions.length).toLocaleString("ja-JP");render();
</script></body></html>'''
(folder / 'review.html').write_text(template.replace('__DATA__', encoded))
print('Offline review document rendered; live application unchanged.')
