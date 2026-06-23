# Obsidian Crystal

[![GitHub Release](https://img.shields.io/github/v/release/masaki39/obsidian-crystal?sort=semver&label=latest&color=%237c3aed)](https://github.com/masaki39/obsidian-crystal/releases/latest) [![Total Downloads](https://img.shields.io/github/downloads/masaki39/obsidian-crystal/main.js?logo=obsidian&label=total%20downloads&color=%237c3aed)](https://github.com/masaki39/obsidian-crystal/releases)

このプラグインは、Obsidianでの作業効率を劇的に向上させるための、多岐にわたる機能を統合したオールインワン・プラグインである。
個人用に作成したが、誰でも使用可能だ。

> [!warning]
>
> - デスクトップ版Obsidianでのみ動作する。
> - 多くの機能は、外部サービス（OpenAI, Gemini, Gyazo, Marp CLI）の事前設定やインストールが必要である。
> - 個人用途に最適化されているため、利用者の環境に応じた設定調整が必要な場合がある。
> - 一定以上の規模になったり独立した機能をもつコードは別リポジトリに適宜切り離される
>   - [Tab Swap](https://github.com/masaki39/tab-swap)
>   - [Daily Notes Timeline](https://github.com/masaki39/daily-notes-timeline)

## インストール

[BRAT](https://github.com/TfTHacker/obsidian42-brat)プラグインを使用してインストールするのが最も簡単である。

1. BRATをインストールし、有効化する。
2. BRATの設定で `Add Beta plugin` を選択する。
3. このリポジトリのURL `https://github.com/masaki39/obsidian-crystal` を入力する。

## 機能一覧

### 🤖 AI Editor Commands

[OpenAI API](https://platform.openai.com/api-keys)または[Gemini API](https://aistudio.google.com/api-keys)を利用して、文章作成や翻訳を強力にサポートする。設定の `AI Provider` でどちらを使うか選択でき（既定はOpenAI）、全AIコマンドが選択中のプロバイダーを使用する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `AI: Generate description for current file` | ファイル説明生成 | 現在のファイル内容を解析し、検索に適した`description`をフロントマターに自動生成する。 |
| `AI: Generate git commit summary` | Gitコミットサマリー生成 | アクティブファイルの日付（デイリーノートの場合はその日、それ以外は今日）のGitコミット差分（`.md`ファイルのみ）をAIで要約し、フロントマターの`summary`フィールドに書き込む。 |
| `AI: Translate selected text` | 選択テキスト翻訳 | 選択した日本語テキストを自然な英語に翻訳し、元のテキストと置き換える。 |
| `AI: Translate above cursor text` | カーソル上翻訳 | カーソルがある行の、一つ上の行のテキストを翻訳し、カーソル位置に挿入する。 |
| `AI: Translate below cursor text` | カーソル下翻訳 | カーソルがある行の、一つ下の行のテキストを翻訳し、カーソル位置に挿入する。 |
| `AI: Grammar check current line` | 文法チェック | 現在のカーソル行の文章（日/英）をチェックし、より自然で正確な表現に校正する。 |
| `AI: Rewrite (replace selection or whole note)` | 指示に沿って置換 | 入力した指示に従い、選択範囲またはノート全体をAIで書き換えて置換する。 |
| `AI: Rewrite (append result at end)` | 指示に沿って追記 | 入力した指示に従い、選択範囲またはノート全体を参照して生成したMarkdown断片を末尾に追記する。 |

### 🦋 Bluesky

BlueSkyへの投稿をアシストする。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Bluesky: Post to Bluesky` | Blueskyに投稿 | テキストやURLを入力し、メタデータ付きでBlueskyに投稿する。 |
| `Bluesky: Post to daily note timeline` | デイリーノートへ投稿 | 入力したメモをデイリーノートのタイムラインセクションにコールアウト形式で追記する。 |

### 📅 Daily Notes

日々の記録とタスク管理を効率化する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Daily: Open today's note` | 今日のノート | 今日の日付のデイリーノートを開く。存在しない場合は自動で作成する。 |
| `Daily: Open yesterday's note` | 昨日のノート | 現在のノートの日付を基準に、前日のデイリーノートを開く。 |
| `Daily: Open tomorrow's note` | 明日のノート | 現在のノートの日付を基準に、翌日のデイリーノートを開く。 |
| `Daily: Add task to daily note` | ﾀｽｸを今日のDNに追加 | 入力したタスクを今日のデイリーノートの末尾に追記する。 |
| `Daily: Roll over yesterday's undone tasks` | 前日の未完了タスクを引き継ぎ | アクティブファイルの日付を基準に前日のデイリーノートから未完了タスクを抽出し、現在のカーソル位置に挿入する。前日ファイルからは未完了タスクを削除する。 |

**自動化機能（設定で有効化が必要）：**

- **Auto Sort Tasks:** デイリーノートが変更されると、完了済み`[x]`のタスクをリストの上に自動で移動し、空行を削除する。
- **Auto Link Notes:** 新しいノートを作成すると、その日のデイリーノートに自動でリンクが追記される。
- **Newest First (Daily Notes):** 新規タスク/リンク/タイムライン投稿を上に追加する。

### ✨ Quick Add

定型的なコンテンツやタスクを素早く追加する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Quick add: Add task to todo list` | ToDoリストにタスク追加 | 設定で指定したToDoリストファイルのInboxセクションにタスクを追加する。 |

### 🖼️ Image Processor

画像をペーストする時に圧縮して容量を節約する。
圧縮率やスケールは設定から変更できる。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Image: Paste multiple images from file system` | ファイルシステムから複数画像をペースト | ファイル選択ダイアログから複数の画像を選択し、一括でVaultに保存してリンクを挿入する。WebP変換にも対応。 |

**自動化機能（設定で有効化が必要）：**

- **Auto Convert Images to WebP on Paste:** クリップボードからのペーストやドラッグ＆ドロップで画像を貼り付けると、自動でWebP形式に変換し、Vault内の添付ファイルフォルダに保存してリンクを挿入する。GIFアニメはそのまま維持される。

### ☁️ Gyazo Uploader

[Gyazo](https://gyazo.com)に画像をアップロードし、Markdownリンクを挿入する。
アクセストークンは[gyazo.com/oauth/applications](https://gyazo.com/oauth/applications)でアプリを作成して取得する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Gyazo: Upload clipboard image` | クリップボード画像をGyazoにアップロード | クリップボードにある画像をGyazoにアップロードし、Markdownリンクをカーソル位置に挿入する。 |
| `Gyazo: Upload image file` | 画像ファイルをGyazoにアップロード | ファイル選択ダイアログから画像を選び、Gyazoにアップロードしてリンクを挿入する。 |
| `Gyazo: Replace image URLs in active note` | 外部画像URLをGyazoに置換 | アクティブノート内の外部画像URLをGyazoにアップロードし直し、Gyazoのリンクに置き換える。 |
| `Gyazo: Replace local images in active note` | ローカル画像をGyazoに置換 | アクティブノートに埋め込まれたVault内のローカル画像をGyazoにアップロードし、ノート全体（他ノートの参照を含む）のリンクをGyazo URLに更新して元ファイルをゴミ箱へ移動する。wikiリンクのエイリアスやMarkdown画像リンクにも対応。 |

### ✍️ Editor Extensions

日々の編集作業を快適にするコマンド群。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Editor: Create new file with timestamp` | タイムスタンプで新規ファイル作成 | `YYYYMMDDHHmmss`形式のファイル名で新しいノートを作成して開く。Vimモードが有効な場合はエディタのInsertモードで開始し、無効な場合はタイトル変更モードで開く。 |
| `Editor: Create new file with link at cursor` | カーソル位置にリンク付きで新規ファイル作成 | タイムスタンプ名のファイルを作成し、現在のカーソル位置にそのファイルへのリンクを挿入して開く。Vimモードが有効な場合はエディタのInsertモードで開始し、無効な場合はタイトル変更モードで開く。 |
| `Editor: Copy file link` | ファイルリンクをコピー | 現在開いているファイルのWikiリンク（`[[ファイル名]]`）をコピーする。 |
| `Editor: Copy file link with alias` | エイリアス付きファイルリンクをコピー | ファイルのフロントマターに`aliases`があれば、それを使ったリンク（`[[ファイル名|エイリアス]]`）をコピーする。 |
| `Editor: Copy file path for Claude Code` | Claude Code用パスをコピー | Vaultルートからの相対パスを`@"相対パス"`形式でコピーする。Claude Codeでのファイル参照に便利。 |
| `Editor: Wrap selection with subscript` | 下付き文字 | 選択テキストを`<sub>`タグで囲む。すでにある場合は解除する。 |
| `Editor: Wrap selection with superscript` | 上付き文字 | 選択テキストを`<sup>`タグで囲む。すでにある場合は解除する。 |
| `Editor: Increase blockquote level` | ブロッククォートレベル増加 | 選択した行のブロッククォート（`>`）レベルを1段階増加させる。 |
| `Editor: Convert links to relative paths` | リンクを相対パスに変換 | ファイル内のWikiリンクやMarkdownリンクを、すべて相対パス形式のMarkdownリンクに一括変換する。 |
| `Editor: Convert active file to bullet list` | 本文をバレット化 | アクティブファイルの本文をバレットリストに変換する（フロントマターは保持）。 |
| `Editor: Organize file with prefix and tags` | タグでファイルを整理 | タグを選択し、ファイル名に絵文字プレフィックスや日付を追加、フロントマターを更新し、指定フォルダへ移動させる。 |
| `Editor: Insert OGP link (horizontal)` | OGPリンク挿入（横） | URLからOGP情報を取得し、横並びレイアウトのリンクカードを挿入する。 |
| `Editor: Insert OGP link (vertical)` | OGPリンク挿入（縦） | URLからOGP情報を取得し、縦並びレイアウトのリンクカードを挿入する。 |
| `Editor: Toggle line number` | 行番号表示の切り替え | `.obsidian/app.json`の行番号表示設定をトグルする。 |
| `Window: Toggle opacity` | ウィンドウ不透明度の切り替え | Obsidianウィンドウの不透明度をトグルする。 |

**自動化機能（Vimモード有効時）：**

- **Auto Reset Vim Mode on Leaf Change:** 別のペインに移動すると、離れたエディタのVimモードが自動でNormalモードにリセットされる。

> [!note]
> `Editor: Organize file with prefix and tags`には設定画面に専用設定UIがある。

### 🎞 Marp

[Marp](https://marp.app/)を使ったプレゼンテーション作成を支援する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Marp: Preview slide` | Marpプレビュー | Marpのプレビュー用HTMLをMarkdownと同じフォルダに出力する。 |
| `Marp: Export slide (PPTX)` | Marpエクスポート | PPTX形式でエクスポートする。 |
| `Marp: Export slide (PPTX editable)` | Marpエクスポート（編集可） | スライド内容を編集可能なPPTX形式でエクスポートする。 |
| `Marp: Export slide (HTML)` | Marpエクスポート（HTML） | HTML形式でエクスポートする。 |
| `Marp: Export slide (HTML folder with attachments)` | Marpエクスポート（HTMLフォルダ） | HTML・Markdownコピー・ローカル画像をひとつのフォルダにまとめてエクスポートする。画像リンクは相対パスに変換されるため、フォルダをそのまま配布・移動しても画像が正常に表示される。 |
| `Marp: Export slide (PDF)` | Marpエクスポート（PDF） | PDF形式でエクスポートする。 |
| `Marp: Start server` | Marpサーバー起動 | プレビュー用のMarpサーバーを起動する。起動後はサーバーの稼働を定期的に監視し、停止を検知すると通知する。 |
| `Marp: Stop server` | Marpサーバー停止 | 起動中のMarpサーバーを停止する。 |
| `Marp: Move images to Marp folder` | 画像をMarpフォルダに移動 | Vault内の画像ファイルをMarp用フォルダに移動し、リンクを更新する。 |
| `Marp: Export presenter notes` | Marpノート出力 | Marp Presenter Notesをテキストファイルとして出力する。 |
| `Marp: Move images and convert links to relative paths` | 画像移動＋リンク変換 | Marp用フォルダに画像を移動した後、リンクを相対パスに変換する処理を連続で行う（Marp関連マクロ）。 |

**必要な依存関係:**

- [Marp-cli](https://github.com/marp-team/marp-cli)

### 🌐 Quartz

[Quartz](https://quartz.jzhao.xyz/)サイトの管理を効率化する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Quartz: Sync` | Quartzと同期 | 設定した公開用フォルダの内容を、指定したQuartzリポジトリに同期する。 |
| `Quartz: Open site ({サイト名})` | Quartzサイトを開く | 設定したQuartzサイトのURLをブラウザで開く。 |
| `Quartz: Sync and open site ({サイト名})` | Quartzと同期してサイトを開く | 同期コマンドを実行後、サイトとGitHub Actionsのページを開く。 |
