# Omoi Live

Omoi の対話モード（各自のスマホで意見を書いて一斉に見る）のルーム同期サーバー。
Cloudflare Workers + Durable Objects で動く。UI は `public/`、API と WebSocket は `src/`。

## 揮発性の設計

- 入力された意見はこの DO の storage にだけ存在する
- ホストの「ここで終える」で storage 全削除 + 全接続切断
- 3時間無操作のルームはアラームで storage 全削除
- ルームごとに `RoomDO` インスタンス（`idFromName(code)`）

## ローカル開発

```sh
npx wrangler dev
# http://localhost:8787/
```

本流 Omoi からローカルのルームサーバーを使って確認するときは、
ブラウザのコンソールで `localStorage.setItem("omoiLiveOrigin", "http://localhost:8787")` を設定する。

## デプロイ

```sh
npx wrangler deploy
```

デプロイ後、表示される `*.workers.dev` のURLを本流の `スクリプト/live-room.js` の
`DEFAULT_ORIGIN` に設定する。DNS移行後は `live.omoi.viuk-light.org` を Custom Domain として追加。
