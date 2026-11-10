# Relation Diagram API

ブラウザ標準のESモジュールです。HTMLの文章カードとCytoscape.jsのモデル・配置・接続線を組み合わせます。特定のサービス、質問ID、URL形式に依存しません。

```html
<div id="diagram"></div>
<script type="module">
  import { createRelationDiagram } from './index.mjs';

  const diagram = createRelationDiagram(document.getElementById('diagram'), {
    heading: '同じ予定から考える',
    rootId: 'root',
    nodes: [
      { id: 'root', caption: '共通の予定', title: '展示会を開く', body: '来月、地域の作品を展示する。', kind: 'context' },
      { id: 'place', title: '場所', body: '会場と配置を確かめる。' },
      { id: 'works', title: '作品', body: ['出展する人と話す。', '搬入の予定を合わせる。'] }
    ],
    edges: [
      { source: 'root', target: 'place' },
      { source: 'root', target: 'works' }
    ]
  }, { layout: 'branches', interactive: false });

  // diagram.update(nextData, { layout: 'network', interactive: true });
  // diagram.destroy();
</script>
```

HTTP(S)で配信してください。`file://`ではブラウザのモジュール制限が適用されます。Cytoscapeは同梱の固定バージョンを読み込み、CDNやビルド処理は不要です。`styles.css`は初回の生成時にモジュール相対URLから自動読み込みします。CSSを制限するCSPでは同じ配信元のstylesheetと、ノード配置に使うstyle属性を許可する必要があります。

## 入力

`createRelationDiagram(host, data, options = {})`は、ホスト要素へ一つの図を追加してコントローラを返します。一つのホストへ同時に複数回mountすると`TypeError`です。ホストには専用の空要素を使ってください。

`data`は次を持ちます。

| フィールド | 内容 |
| --- | --- |
| `heading` / `note` | 任意の見出し・説明文字列 |
| `rootId` | `branches`の中心ノード。`direction: 'right'`では必須。既定の下向き配置では省略時に入ってくる辺のない唯一のノードから判定 |
| `nodes` | 一件以上のノード。`id`と`title`は空でない文字列 |
| `nodes[].caption` | 任意の文字列。タイトルの前に、項目の役割などを示す小さなラベルとして表示。省略・空文字・空白のみの場合は表示しない |
| `nodes[].body` | 任意の文字列、または段落ごとの文字列配列 |
| `nodes[].kind` | 任意。`context` / `view` / `person`。見た目の区分であり、内容の正しさを判定しない。既定値は`view` |
| `edges` | 辺の配列。各辺は存在するノードの`source` / `target`を指定 |
| `edges[].id` | 任意の一意な文字列。省略時は衝突しないIDを生成 |
| `edges[].label` | 任意の関係名。`path`と右向きの`branches`は改行を含む文字をHTMLで計測・配置。他の配置では短い関係名を使い、長い説明はノード本文へ置く |
| `edges[].directed` | 任意のboolean。`true`は矢印、既定値`false`は方向を持たない線 |
| `edges[].lineStyle` | 任意。`solid`（既定）または`dashed`。線種の意味は入力側で指定し、事実や判断を自動で補わない |

全ての表示文字列を`textContent`で扱い、入力HTMLを解釈しません。ノードIDと辺IDは共通の名前空間で一意にします。重複ID、存在しない接続先、不正な入力型は同期的な`TypeError`です。

## 配置と表示

- `layout: 'branches'`は一つの中心と、直接つながる任意数のノードを扱います。間接的な接続、循環、同じ相手への重複辺はエラーです。単一ノードも表示できます。
- `branches`の`direction`は`'down'`（既定）または`'right'`です。下向きでは辺の`source`が親、`target`が子で、狭い画面では縦に並べます。
- 右向きでは`rootId`を必ず指定します。中心を左、他のノードを`nodes`の配列順に右上から右下へ配置します。相手が二人なら中心の上下へ分かれ、狭い画面でも左右二列を維持します。中心へ向かう辺も受け付け、`source` / `target` / `directed`を変更しません。
- 右向きの図は最大640px、人物枠は最大120pxです。HTMLの枠と辺ラベルを実測し、互いに最低16pxの間隔を確保します。幅が狭い場合や文字拡大時は折り返しと縦の余白で収め、文字を縮小しません。
- 右向きでは中心の枠を薄い背景色で示します。辺ラベルは線の外側へ最低8px離して置き、背景を透明にして線を途切れさせません。上側の辺では左上、下側の辺では左下へ配置します。矢印は入力の`directed`に従い、ラベルの有無とは独立しています。
- `layout: 'network'`は循環・複数の関係・孤立した人物を含むネットワークを扱います。CytoscapeのCoSE配置を使います。
- `layout: 'pairs'`は独立した二人ずつの組を表示します。全ノードがちょうど一本の辺に属することが必要です。辺の配列順に行を並べ、`source`を左、`target`を右へ置きます。矢印の有無は`directed`に従います。
- `pairs`はスマホでも左右を保ち、図は最大640px、人物枠・ラベルは最大120pxです。線の下に透明な背景のHTMLラベルを配置し、実寸に応じて行の高さを確保します。枠・ラベル同士は16px、ラベルと線は8px以上離します。各行は独立した関係で、行同士を線で結びません。
- `layout: 'path'`は`nodes`の配列順に一本の道として並べます。全ての隣接ペアにちょうど一本の辺が必要です。辺の配列順は問いませんが、重複、分岐、循環、途切れ、隣接しないノード間の辺はエラーです。一ノード・辺なしも使えます。辺の向きは並び順で書き換えず、入力した`source` / `target` / `directed`を維持します。
- `path`は幅が十分なら横一列、足りなければ縦一列に組み替えます。辺ラベルはHTMLの文章として実寸を測り、隣接ノードの間に専用の余白を確保します。ラベルの白背景の両側に線を残し、Cytoscapeで線と矢印を描きます。空または空白のみのラベルは表示しません。
- `interactive`は図の移動・拡大の操作だけを制御し、選択回答やノード編集は実装しません。初回生成の既定値は`branches` / `path` / `pairs`で`false`、`network`で`true`です。
- 本文とHTML辺ラベルは16px以上。文字を小さくするfitは使いません。下向きの`branches`と`path`は読める横幅がなければ縦に組み替えます。`network`は全体が一画面に入らない場合に背景のドラッグ、表示操作、項目への移動を使います。
- `network`で移動が必要な図には`interactive: true`を指定してください。`false`では操作UIと利用者のpan/zoomを無効にします。

Canvasの線とノード寸法はCytoscapeが管理し、文章は実際のHTML要素です。`ResizeObserver`で幅・文章・フォント変更を検知し、`requestAnimationFrame`で再配置します。Canvasは読み上げ対象から外し、ノード本文と「つながりを文章で読む」の一覧で同じ情報を読めます。操作ボタンと項目選択はキーボードで使えます。

配色は端末の `prefers-color-scheme` に合わせてライト／ダークへ自動で切り替わります。HTMLとCanvasは同じ部品内のCSS変数を使い、表示中の設定変更にも追従します。切り替えで場面・配置・表示位置はリセットしません。`destroy()`では配色変更の監視も解除します。

編集者を中心に、入ってくる原稿と依頼先を分ける例です。

```js
diagram.update({
  rootId: 'editor',
  nodes: [
    { id: 'writer', title: '執筆者', kind: 'person' },
    { id: 'editor', title: '編集者', kind: 'person' },
    { id: 'designer', title: '制作者', kind: 'person' }
  ],
  edges: [
    { source: 'writer', target: 'editor', label: '原稿を渡す', directed: true },
    { source: 'editor', target: 'designer', label: '制作を頼む', directed: true }
  ]
}, { layout: 'branches', direction: 'right', interactive: false });
```

`path`の例です。人物や関係の意味は利用側のデータで指定します。

```js
diagram.update({
  nodes: [
    { id: 'requester', title: '依頼者', kind: 'person' },
    { id: 'reception', title: '受付', kind: 'person' },
    { id: 'staff', title: '担当者', kind: 'person' }
  ],
  edges: [
    { id: 'request', source: 'requester', target: 'reception', label: '依頼の内容を伝える', directed: true },
    { id: 'handover', source: 'reception', target: 'staff', label: '内容を共有して\n対応を引き継ぐ', directed: true }
  ]
}, { layout: 'path', interactive: false });
```

## 更新と破棄

返り値は`{ update(nextData, nextOptions?), destroy() }`です。

- `update`は全データを置き換えます。省略したoptionsは現在値を維持します。例えば`branches`から`network`へ変更する場合、移動操作が必要なら`interactive: true`も指定します。
- `direction`は`branches`同士の更新では維持します。右向きから下向きへ切り替える場合は`direction: 'down'`を指定してください。他のlayoutへ変更すると方向指定を解除し、再び`branches`へ戻る場合の既定値は`'down'`です。
- 入力の検証はDOM変更より前に行います。不正な`update`は例外となり、表示中の図を維持します。
- `destroy`は何度呼んでも安全です。監視、描画フレーム、Cytoscape、図のDOMを破棄し、ホスト要素は残します。破棄後の`update`はエラーです。同じホストへ新しい図を生成できます。
- ページ内で共有するstylesheetは破棄しません。

図の末尾には常に「原作：VIUK-Light」と利用条件へのリンクを表示します。これは原作の表示であり、派生物への公認を示すものではありません。配布時は同梱の`LICENSE`・`NOTICE`と、`vendor`の第三者ライセンスを保持してください。

ブラウザ確認用の識別子は`.rd-diagram[data-ready="true"]`、`.rd-node[data-node-id]`、`.rd-credit`です。`ready`は最初の配置完了を表し、フォントの読み込み等で後から再配置される場合があります。

`branches`では`.rd-diagram`の`data-direction`が`down`または`right`、`path`では`data-orientation`が`horizontal`または`vertical`になります。`.rd-edge-label[data-edge-id][data-source][data-target]`はHTML辺ラベルとその接続先を示します。配置の更新時に不要になった属性・HTML辺ラベルを取り除きます。

## 場面ごとの表示

`sequence.mjs` の `createRelationSequence(host, sequence)` は、同じ関係図部品を使って複数の場面を手動で切り替えます。返り値は `{ update(nextSequence), destroy() }` です。元の `createRelationDiagram()` API は変わりません。

```js
import { createRelationSequence } from './sequence.mjs';
const view = createRelationSequence(host, {
  kind: 'timeline',
  frames: [
    { label: '最初の場面', data: firstGraph, options: firstLayout },
    { label: '次の場面', data: secondGraph, options: secondLayout }
  ]
});
```

`frames` は一件以上で、各場面の `label` は空でない文字列、`data`・`options` は既存の関係図と同じ入力です。全場面を先に検証し、不正な更新では表示中の図を維持します。`kind: 'timeline'`（既定）では「場面」、`kind: 'comparison'` では「ケース」と表示します。並び順や各場面の意味は利用側が定めます。

〈／〉で進む・戻る操作ができ、先頭と末尾では対応するボタンを無効にします。自動再生や末尾から先頭への循環はありません。更新時は最初の場面に戻り、破棄時には内部の関係図と操作を片付けます。元の関係図が持つ帰属表示も保持します。

## 範囲

自由な関係図の描画と読むための操作を提供します。ドラッグ編集、保存、回答収集、任意のレイアウト拡張、非常に大きいグラフへの性能保証は含みません。多数の長文カードは一画面に収まらないため、カードの情報量と図の分割は利用側で検討します。

`node --test packages/relation-diagram/*.test.mjs`で、入力契約、分岐の制約、自由図の循環、可変長カードの配置を検証できます。再利用例は`demo/index.html`です。
