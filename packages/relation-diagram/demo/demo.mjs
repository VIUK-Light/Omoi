import { createRelationDiagram } from '../index.mjs';

const network = {
  heading: '架空の読書会をつくる5人',
  note: '一方向の伝達と、相互の関わりを含む人物相関です。各線の意味は「つながりを文章で読む」でも確認できます。',
  nodes: [
    { id: 'aoi', title: '葵 · 運営', body: '開催の計画をまとめる。', kind: 'person' },
    { id: 'kei', title: '圭 · 書店', body: '読む本を提案する。', kind: 'person' },
    { id: 'mio', title: '澪 · 司会', body: '当日の話し合いを進める。', kind: 'person' },
    { id: 'nagi', title: '凪 · 参加者', body: '参加した感想を届ける。', kind: 'person' },
    { id: 'ren', title: '蓮 · 会場', body: '集まる場所を準備する。', kind: 'person' },
  ],
  edges: [
    { source: 'aoi', target: 'kei', label: '選書を相談', directed: true },
    { source: 'kei', target: 'mio', label: '本を紹介', directed: true },
    { source: 'mio', target: 'nagi', label: '当日の対話', directed: false },
    { source: 'nagi', target: 'aoi', label: '感想を届ける', directed: true },
    { source: 'aoi', target: 'ren', label: '会場を相談', directed: false },
    { source: 'ren', target: 'kei', label: '案内を置く', directed: true },
  ],
};

const branches = {
  heading: '一つの予定から、三つの準備へ',
  note: '人物相関と同じrendererを使い、親と直接つながる項目を表示します。',
  rootId: 'exhibition',
  nodes: [
    { id: 'exhibition', title: '地域の展示会を開く', body: '来月、地域でつくった作品を集めて展示する。', kind: 'context' },
    { id: 'place', title: '場所を整える', body: '会場の広さと、歩きやすい配置を確かめる。', kind: 'view' },
    { id: 'works', title: '作品を集める', body: '出展する人と、搬入の予定を合わせる。', kind: 'view' },
    { id: 'invite', title: '知らせる', body: '来てほしい人へ、日時と場所を伝える。', kind: 'view' },
  ],
  edges: [
    { source: 'exhibition', target: 'place' },
    { source: 'exhibition', target: 'works' },
    { source: 'exhibition', target: 'invite' },
  ],
};

const host = document.getElementById('diagram');
const error = document.getElementById('demo-error');
let diagram;

const path = {
  heading: '原稿を受け渡す3人',
  nodes: [
    { id: 'writer', caption: '執筆', title: '秋', kind: 'person' },
    { id: 'editor', caption: '編集', title: '望', kind: 'person' },
    { id: 'designer', caption: '紙面の制作', title: '楓', kind: 'person' },
  ],
  edges: [
    { id: 'draft', source: 'writer', target: 'editor', label: '書いた原稿を渡す', directed: true },
    { id: 'reviewed', source: 'editor', target: 'designer', label: '確認した原稿を渡す', directed: true },
  ],
};

const editorRelations = {
  rootId: 'editor',
  nodes: [
    { id: 'writer', title: '執筆者', kind: 'person' },
    { id: 'editor', title: '編集者', kind: 'person' },
    { id: 'designer', title: '制作者', kind: 'person' },
  ],
  edges: [
    { id: 'manuscript', source: 'writer', target: 'editor', label: '原稿を渡す', directed: true },
    { id: 'production', source: 'editor', target: 'designer', label: '制作を頼む', directed: true },
  ],
};

const pairs = {
  nodes: [
    { id: 'courier', title: '配達員', kind: 'person' },
    { id: 'recipient', title: '受取人', kind: 'person' },
    { id: 'receptionist', title: '受付', kind: 'person' },
    { id: 'visitor', title: '来訪者', kind: 'person' },
  ],
  edges: [
    { id: 'delivery', source: 'courier', target: 'recipient', label: '荷物を渡す', directed: true },
    { id: 'guidance', source: 'receptionist', target: 'visitor', label: '案内する', directed: true },
  ],
};

function show(mode) {
  try {
    const data = { network, branches, path, pairs, editor: editorRelations }[mode];
    const options = {
      layout: mode === 'editor' ? 'branches' : mode,
      direction: mode === 'editor' ? 'right' : 'down',
      interactive: mode === 'network',
    };
    if (diagram) diagram.update(data, options);
    else diagram = createRelationDiagram(host, data, options);
    for (const button of document.querySelectorAll('[data-demo-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.demoMode === mode));
    }
    error.hidden = true;
  } catch (failure) {
    error.textContent = `図を表示できませんでした。${failure.message}`;
    error.hidden = false;
  }
}

for (const button of document.querySelectorAll('[data-demo-mode]')) {
  button.addEventListener('click', () => show(button.dataset.demoMode));
}
window.addEventListener('pagehide', () => diagram?.destroy(), { once: true });
show('network');
