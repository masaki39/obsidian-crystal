[English](../en/README.md) | **日本語**

# Crystal ドキュメント

すべての機能とコマンドのリファレンスです。概要は[プロジェクトの README](../../README.ja.md) を参照してください。

## 機能一覧

| 機能 | できること | 必要なもの |
|---|---|---|
| [AI](ai.md) | 翻訳、校正、リライト、description の作成、その日の git diff の要約 | OpenAI / Gemini の API キー、またはローカルの Ollama |
| [デイリーノート](daily-notes.md) | 移動、タスク、タイムライン、下書きノート、自動ソート、自動リンク | コアプラグインの **Daily notes** |
| [エディター](editor.md) | タイムスタンプ付きノート、リンクツール、下付き・上付き文字、OGP カード、ファイルルール、自動箇条書き | — |
| [画像](images.md) | 貼り付け・ドロップ時の WebP 変換、複数画像の貼り付け | — |
| [Gyazo](gyazo.md) | 画像のアップロードと、ノート内の画像の Gyazo への移行 | Gyazo のアクセストークン |
| [Bluesky](bluesky.md) | 画像やリンクカード付きの投稿と、タイムラインへの投稿の記録 | Bluesky のアプリパスワード |
| [Marp](marp.md) | スライドの書き出し（PPTX/PDF/HTML）、ライブサーバー、ツールバー、スライド間の移動 | Marp CLI |
| [Quartz](quartz.md) | Quartz サイトの同期と表示 | Quartz リポジトリ、Node.js |
| [ゲーミフィケーション](gamification.md) | 完了したタスクに応じた XP、レベル、ストリーク、バッジ | コアプラグインの **Daily notes** |
| [プロパティリンク](property-link.md) | frontmatter のプロパティ間の双方向リンク | — |
| [プロパティカラー](property-colors.md) | プロパティ名の色分け | — |
| [ワークスペース](workspace.md) | ウィンドウの不透明度、ペイン間やサイドバーへ移動できるフォーカス、ステータスバーの並び順 | — |
| [ハッカーモード](hacker-mode.md) | 見た目だけのターミナル風エフェクト | — |

## 全コマンド

すべてのコマンドはコマンドパレットから実行でき、**Settings → Hotkeys** でホットキーを割り当てられます。

| コマンド | 機能 |
|---|---|
| `AI: Generate description for current file` | [AI](ai.md) |
| `AI: Translate selected text` | [AI](ai.md) |
| `AI: Translate above cursor text` | [AI](ai.md) |
| `AI: Translate below cursor text` | [AI](ai.md) |
| `AI: Grammar check current line` | [AI](ai.md) |
| `AI: Rewrite with AI (replace selection or whole note)` | [AI](ai.md) |
| `AI: Rewrite with AI (append result at end)` | [AI](ai.md) |
| `AI: Generate git commit summary` | [AI](ai.md) |
| `Bluesky: Post to Bluesky` | [Bluesky](bluesky.md) |
| `Bluesky: Post to daily note timeline` | [Bluesky](bluesky.md) |
| `Daily: Open today's note` | [デイリーノート](daily-notes.md) |
| `Daily: Open yesterday's note` | [デイリーノート](daily-notes.md) |
| `Daily: Open tomorrow's note` | [デイリーノート](daily-notes.md) |
| `Daily: Add task to daily note` | [デイリーノート](daily-notes.md) |
| `Daily: Roll over yesterday's undone tasks` | [デイリーノート](daily-notes.md) |
| `Daily: Open daily draft` | [デイリーノート](daily-notes.md) |
| `Daily: Post daily draft to timeline` | [デイリーノート](daily-notes.md) |
| `Daily: Post daily draft to Bluesky` | [デイリーノート](daily-notes.md) |
| `Editor: Create new file with timestamp` | [エディター](editor.md) |
| `Editor: Create new file with link at cursor` | [エディター](editor.md) |
| `Editor: Copy file link` | [エディター](editor.md) |
| `Editor: Copy file link with alias` | [エディター](editor.md) |
| `Editor: Wrap selection with subscript` | [エディター](editor.md) |
| `Editor: Wrap selection with superscript` | [エディター](editor.md) |
| `Editor: Increase blockquote level` | [エディター](editor.md) |
| `Editor: Organize file with prefix and tags` | [エディター](editor.md) |
| `Editor: Convert links to relative paths` | [エディター](editor.md) |
| `Editor: Convert active file to bullet list` | [エディター](editor.md) |
| `Editor: Insert OGP link (horizontal)` | [エディター](editor.md) |
| `Editor: Insert OGP link (vertical)` | [エディター](editor.md) |
| `Editor: Move cursor after list marker` | [エディター](editor.md) |
| `Image: Paste multiple images from file system` | [画像](images.md) |
| `Gyazo: Upload clipboard image to Gyazo` | [Gyazo](gyazo.md) |
| `Gyazo: Upload image file to Gyazo` | [Gyazo](gyazo.md) |
| `Gyazo: Replace image URLs with Gyazo` | [Gyazo](gyazo.md) |
| `Gyazo: Replace local images with Gyazo` | [Gyazo](gyazo.md) |
| `Marp: Create slide from current note` | [Marp](marp.md) |
| `Marp: Preview slide` | [Marp](marp.md) |
| `Marp: Export slide (PPTX)` | [Marp](marp.md) |
| `Marp: Export slide (PPTX editable)` | [Marp](marp.md) |
| `Marp: Export slide (HTML)` | [Marp](marp.md) |
| `Marp: Export slide (HTML folder with attachments)` | [Marp](marp.md) |
| `Marp: Export slide (PDF)` | [Marp](marp.md) |
| `Marp: Export presenter notes` | [Marp](marp.md) |
| `Marp: Start Marp server` | [Marp](marp.md) |
| `Marp: Stop Marp server` | [Marp](marp.md) |
| `Marp: Go to next slide` | [Marp](marp.md) |
| `Marp: Go to previous slide` | [Marp](marp.md) |
| `Marp: Move slide down` | [Marp](marp.md) |
| `Marp: Move slide up` | [Marp](marp.md) |
| `Marp: Move images to Marp folder` | [Marp](marp.md) |
| `Marp: Move images and convert links to relative paths` | [Marp](marp.md) |
| `Quartz: Sync Quartz` | [Quartz](quartz.md) |
| `Quartz: Open Quartz site (<site name>)` | [Quartz](quartz.md) |
| `Quartz: Sync and open Quartz site (<site name>)` | [Quartz](quartz.md) |
| `Gamification: Open gamification stats` | [ゲーミフィケーション](gamification.md) |
| `Property link: Sync property links in current note` | [プロパティリンク](property-link.md) |
| `Property link: Sync property links in all notes` | [プロパティリンク](property-link.md) |
| `Workspace: Toggle window opacity` | [ワークスペース](workspace.md) |
| `Workspace: Focus left pane` | [ワークスペース](workspace.md) |
| `Workspace: Focus right pane` | [ワークスペース](workspace.md) |
| `Hacker mode: Toggle hacker mode` | [ハッカーモード](hacker-mode.md) |
| `Hacker mode: Play boot sequence` | [ハッカーモード](hacker-mode.md) |
| `Hacker mode: Preview reward banner` | [ハッカーモード](hacker-mode.md) |
## 自動で動く機能

| 機能 | デフォルト | 場所 |
|---|---|---|
| デイリーノートのタスクの自動ソート | オフ | [デイリーノート](daily-notes.md) |
| 新規ノートを今日のデイリーノートに自動リンク | オフ | [デイリーノート](daily-notes.md) |
| 新しい項目を先頭に追加 | オフ | [デイリーノート](daily-notes.md) |
| デイリーノートのタイトルの後ろに曜日を表示 | オン | [デイリーノート](daily-notes.md) |
| Bluesky の投稿をタイムラインに追記 | オフ | [Bluesky](bluesky.md) |
| 自動箇条書き | オン | [エディター](editor.md) |
| ペイン切り替え時の Vim モードのリセット | 常時（Vim モードがオンのとき） | [エディター](editor.md) |
| Vim の拡張（表示行単位の j/k、ヤンクのクリップボード同期、リーダーマッピング） | オフ | [エディター](editor.md) |
| 貼り付け・ドロップ時の WebP 変換 | オン | [画像](images.md) |
| プロパティリンクの同期 | オフ | [プロパティリンク](property-link.md) |
| ゲーミフィケーション | オフ | [ゲーミフィケーション](gamification.md) |
| Marp スライドのツールバー | オン | [Marp](marp.md) |
| Marp のプレビューとカーソルの同期 | オフ | [Marp](marp.md) |
| ハッカーモード | オフ | [ハッカーモード](hacker-mode.md) |

## 設定の場所

すべての設定は **Settings → Crystal** にあります。ページ上部のタブは次のとおりです。

- **General**
- **Editor**
- **AI**
- **Bluesky**
- **Daily notes**
- **Gamification**
- **Images**
- **Marp**
- **Quartz**
- **Property link**
- **Property colors**
- **Hacker mode**
- **Status bar**
- **File rules**

タブの上にある検索ボックスを使うと、すべてのタブをまとめて検索できます。
