# Changelog

このプロジェクトの主な変更点を記録する。

## 0.6.0

### Added

- AIプロバイダーを抽象化し、OpenAIに対応（`AIService`）。全AIコマンドが設定の `AI Provider` で選択したプロバイダーを使用する。
- Gyazo画像マイグレーション
  - `Gyazo: Replace image URLs in active note`：ノート内の外部画像URLをGyazoに置き換える。
  - `Gyazo: Replace local images in active note`：Vault内のローカル画像をGyazoにアップロードし、ノート全体（他ノートの参照を含む）のリンクをGyazo URLへ更新して元ファイルをゴミ箱へ移動する。wikiリンクのエイリアスやMarkdown画像リンクにも対応。
- `AI: Generate git commit summary`：アクティブファイルの日付のGitコミット差分をAIで要約し、フロントマターの `summary` に書き込む。
- 投稿モーダルに画像プレビューのサムネイル表示、`Ctrl+J` / `Ctrl+K` でのナビゲーションを追加。
- Marpサーバー起動後、サーバーの稼働を定期的に監視し、停止を検知すると通知するようにした。

### Changed

- 既定のAIプロバイダーをOpenAIに変更し、設定画面でOpenAIの項目をGeminiより上に配置。
- すべてのコマンド名に「グループ名: 動作」形式の接頭辞を付与し、コマンドパレットでグループ単位に並ぶようにした（コマンドIDは不変）。
- ターミナル実行に使うシェルを、固定の `zsh` からユーザーのログインシェル（`$SHELL`、未設定時は `zsh`）に追従するよう変更（Marp / Quartz が bash などの環境でも動作）。

### Removed

- Anki連携（`Add Note to Anki` / `Add Note to Anki Assisted by AI`）。
- macOS Shortcuts連携（`Run Shortcut: ...`）と関連設定。
- PDFテーブル抽出（Camelot利用の `Export PDF Tables`）。
- 単発UIコマンド（`Window: Toggle opacity` / `Editor: Toggle line number`）と関連設定（保守範囲の縮小）。
- `Editor: Copy file path for Claude Code`（特定ツール専用のため整理）。
