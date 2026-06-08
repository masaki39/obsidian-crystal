# Changelog

## 0.4.9

### New Features

- **タイムライン投稿コマンドに画像アップロードを追加**: `Post to Bluesky` と `Post to Daily Note Timeline` の両コマンドで、Gyazo 経由の画像アップロードが可能になった。
  - モーダルに「画像を選択」ボタンを追加。最大 4 枚まで選択可能。
  - Bluesky 投稿時は画像を Bluesky に直接アップロードし `app.bsky.embed.images` として添付される。
  - デイリーノート追記時は Gyazo URL を `![](url)` 形式で本文末尾に追加する。
  - 画像処理（WebP 変換・圧縮・リサイズ）は既存の Image Processor 設定を共通利用。

### Changes

- **Timeline CSS を styles.css から削除**: timeline callout のスタイルを plugin 管理から除外。ユーザー自身のスニペットで自由にカスタマイズ可能になった。

## 0.4.8

### Bug Fixes

- **Marp HTML フォルダエクスポートのパス修正**: `exportFolderPath` に絶対パスを設定している場合、vault パスが誤って prefix されて出力先が正しく解決されなかった問題を修正。

## 0.4.7

### New Features

- **Marp HTML フォルダエクスポート**: `Export Marp Slide (HTML Folder with Attachments)` コマンドを追加。ローカル画像を含む Marp スライドを、HTML・Markdown コピー・画像をひとつのフォルダにまとめてエクスポートする。画像リンクは相対パスに変換されるため、フォルダをそのまま配布・移動しても画像が正常に表示される。

## 0.4.6

### Changes

- **PDF 関連コマンドの整理**: simple-citations プラグインに移行したため、Export PDF / Export PDF Images / Export PDF Text コマンドを削除。Export PDF Tables コマンドのみ残存。

## 0.4.4

### New Features

- **レスポンステキスト抽出メソッドを追加**: Gemini API のレスポンスから thinking パートを除外してテキストを取得する `getResponseText` メソッドを追加し、全コマンドに適用。

### Changes

- **Gemma モデルの更新**: 設定画面のモデル選択肢を Gemma 3 系から Gemma 4 系（`gemma-4-31b-it`, `gemma-4-26b-a4b-it`）に更新。

## 0.4.3

### Breaking Changes

- **pCloud Uploader を削除**: pCloud の API 認証障害（username/password 方式の廃止）により、pCloud 連携機能をすべて削除。

### New Features

- **Gyazo Uploader を追加**: pCloud の代替として Gyazo による画像アップロード機能を追加。
  - `Upload clipboard image to Gyazo`: クリップボードの画像を Gyazo にアップロードし、Markdown リンクをカーソル位置に挿入する。
  - `Upload image file to Gyazo`: ファイル選択ダイアログから画像を選んでアップロードする。
  - アクセストークンは [gyazo.com/oauth/applications](https://gyazo.com/oauth/applications) でアプリを作成して取得する。

### Bug Fixes

- **SecretStorage の `await` 抜けを修正**: `loadSettings` 内で `getSecret`/`setSecret` が `await` されておらず、パスワード等の認証情報が `Promise` オブジェクトとして扱われていたバグを修正。

## 0.4.1

### New Features

- **Export PDF Tables**: PDFからテーブルをCSV形式で抽出するコマンドを追加。Camelotの`stream`フレーバーを使用。フロントマターの`pdf`フィールドに指定されたPDFファイルを対象に、`pdf1.csv`, `pdf2.csv`などのファイル名で出力する。

### Other Changes

- リリースノートをchangelogファイルから自動参照するようGitHub Actionsワークフローを更新。
