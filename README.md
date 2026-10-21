# Dashcloudly status fallback

自宅サーバー・Better Stackと独立したGitHub PagesのHTTP監視ページとCloudflare Workersの入口。

## 構成

- GitHub Actionsが約5分間隔で公開URLをGET。タイムアウト10秒、失敗時は1回再試行。
- 監視結果と最大100件の状態変更を公開JSONへ保存しGitHub Pagesへ配信。秘密情報・学習情報を収集しない。
- 20分以上更新されていない情報は「現在は未確認」と表示。
- ポートフォリオは計画メンテナンスとして表示。再開後はconfig.jsonのmaintenanceを削除する。
- Workers入口はメインページが4秒以内に正常応答すればメインへ302、異常時はGitHub Pagesへ302。固定URLのみを使い、Cookie・クエリーを転送しない。
- status-backup.dashcloudly.comと/backupは常にGitHub Pagesへ転送。GitHubのURLも直接案内できるようCNAMEを設定しない。

## 限界

HTTP200はログイン等の全機能の正常を保証しない。GitHub Actionsのスケジュールは遅延・停止する場合がある。Cloudflare Workers無料枠上限到達やCloudflare/DNS全体の障害時は入口も利用できないため、github.ioの予備URLを別途告知する。既に転送されたブラウザーを後から自動的に移動するものではない。

## ローカル検証

Node22以上。依存ライブラリー不要。

```sh
npm test
npm run monitor
python -m http.server 3015 --directory public
```

## 公開手順

専用の公開リポジトリrattokun-1/dashcloudly-statusを使う。PagesはGitHub Actionsで公開。先に予備ページの公開・監視成功を確認し、それから入口のDNSを変更する。Better Stack本体を入口と異なるドメインへ設定してループを防ぐ。worker/gateway.mjsのPRIMARYとconfig.jsonのstatus監視先・mainStatusは実際の本体URLへ更新する。

DNS変更前に元のCNAME・TTL・プロキシ状態を記録する。ロールバックは入口DNSを元のBetter Stack向けDNS-only CNAMEへ戻す。GitHubリポジトリには資格情報を置かない。
