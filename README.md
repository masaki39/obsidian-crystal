# Obsidian Crystal

[![GitHub Release](https://img.shields.io/github/v/release/masaki39/obsidian-crystal?sort=semver&label=latest&color=%237c3aed)](https://github.com/masaki39/obsidian-crystal/releases/latest) [![Total Downloads](https://img.shields.io/github/downloads/masaki39/obsidian-crystal/main.js?logo=obsidian&label=total%20downloads&color=%237c3aed)](https://github.com/masaki39/obsidian-crystal/releases)

Obsidianの自作プラグインである。個人用に作成したが、誰でも使用可能だ。
BRATでインストールできる。

## 概要

このプラグインは、Obsidianでの作業効率を劇的に向上させるための、多岐にわたる機能を統合したオールインワン・プラグインである。
AI（Gemini）を活用した高度なテキスト処理、pCloudと連携した画像管理、日々のノートテイクを円滑にするデイリーノート機能、プレゼンテーション作成支援、各種サービス連携（Anki, Quartz, macOS Shortcuts）などを提供する。

## 機能一覧

### 🤖 AI機能（Gemini連携）

[Gemini API](https://aistudio.google.com/api-keys)を利用して、文章作成や翻訳を強力にサポートする。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Generate Description for Current File` | ファイル説明生成 | 現在のファイル内容を解析し、検索に適した`description`をフロントマターに自動生成する。 |
| `Translate Selected Text` | 選択テキスト翻訳 | 選択した日本語テキストを自然な英語に翻訳し、元のテキストと置き換える。 |
| `Translate Above Cursor Text` | カーソル上翻訳 | カーソルがある行の、一つ上の行のテキストを翻訳し、カーソル位置に挿入する。 |
| `Grammar Check Current Line` | 文法チェック | 現在のカーソル行の文章（日/英）をチェックし、より自然で正確な表現に校正する。 |
| `Add Note to Anki Assisted by Gemini` | AI支援Anki追加 | 選択した英単語からGeminiが日本語訳を生成し、Ankiカード作成を支援する。 |
| `Gemini Rewrite (Replace selection or whole note)` | 指示に沿って置換 | 入力した指示に従い、選択範囲またはノート全体をGeminiで書き換えて置換する。 |
| `Gemini Rewrite (Append result at end)` | 指示に沿って追記 | 入力した指示に従い、選択範囲またはノート全体を参照して生成したMarkdown断片を末尾に追記する。 |

> ![note]
> AGENTS.mdとCLAUDE.mdが存在する場合、フロントマターの`activeFile`にアクティブファイルのパスをリアルタイムで反映する。

### 📅 デイリーノート管理

日々の記録とタスク管理を効率化する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Open Today's Daily Note` | 今日のノート | 今日の日付のデイリーノートを開く。存在しない場合は自動で作成する。 |
| `Open Yesterday's Daily Note` | 昨日のノート | 現在のノートの日付を基準に、前日のデイリーノートを開く。 |
| `Open Tomorrow's Daily Note` | 明日のノート | 現在のノートの日付を基準に、翌日のデイリーノートを開く。 |
| `Add Task to Daily Note` | ﾀｽｸを今日のDNに追加 | 入力したタスクを今日のデイリーノートの末尾に追記する。 |
| `Roll Over Yesterday Undo Task List` | 前日の未完了タスクを引き継ぎ | アクティブファイルの日付を基準に前日のデイリーノートから未完了タスクを抽出し、現在のカーソル位置に挿入する。前日ファイルからは未完了タスクを削除する。 |

**自動化機能（設定で有効化が必要）：**
- **Auto Sort Tasks:** デイリーノート内のタスクが変更されると、完了済み`[x]`のタスクをリストの上に自動で移動させる。
- **Auto Link Notes:** 新しいノートを作成すると、その日のデイリーノートに自動でリンクが追記される。

### 🖼️ 画像管理

画像の貼り付けやアップロードを効率化する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Paste Multiple Images from File System` | ファイルシステムから複数画像をペースト | ファイル選択ダイアログから複数の画像を選択し、一括でVaultに保存してリンクを挿入する。WebP変換にも対応。 |
| `Upload Clipboard Image to pCloud` | ｸﾘｯﾌﾟﾎﾞｰﾄﾞ画像をpCloudにｱｯﾌﾟﾛｰﾄﾞ | クリップボードにある画像をpCloudの公開フォルダにアップロードし、Markdownリンクをカーソル位置に挿入する。 |
| `Upload Image File to pCloud` | 画像ファイルをpCloudにｱｯﾌﾟﾛｰﾄﾞ | ファイルを選択ダイアログから選び、pCloudにアップロードしてリンクを挿入する。 |
| `Move Images to Marp Folder` | 画像をMarpフォルダに移動 | Vault内の画像ファイルをMarp用フォルダに移動し、リンクを更新する。プレゼンテーション作成時に便利。 |

**自動化機能（設定で有効化が必要）：**
- **Auto Convert Images to WebP on Paste:** クリップボードからのペーストやドラッグ＆ドロップで画像を貼り付けると、自動でWebP形式に変換し、Vault内の添付ファイルフォルダに保存してリンクを挿入する。GIFアニメはそのまま維持される。

### ✍️ エディタ拡張

日々の編集作業を快適にするコマンド群。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Create New File with Timestamp` | タイムスタンプで新規ファイル作成 | `YYYYMMDDHHmmss`形式のファイル名で新しいノートを作成し、タイトル変更モードで開く。 |
| `Create New File with Link at Cursor` | カーソル位置にリンク付きで新規ファイル作成 | タイムスタンプ名のファイルを作成し、現在のカーソル位置にそのファイルへのリンクを挿入する。 |
| `Copy File Link to Clipboard` | ファイルリンクをコピー | 現在開いているファイルのWikiリンク（`[[ファイル名]]`）をコピーする。 |
| `Copy File Link with Alias to Clipboard` | エイリアス付きファイルリンクをコピー | ファイルのフロントマターに`aliases`があれば、それを使ったリンク（`[[ファイル名|エイリアス]]`）をコピーする。 |
| `Wrap Selection with Subscript` | 下付き文字 | 選択テキストを`<sub>`タグで囲む。すでにある場合は解除する。 |
| `Wrap Selection with Superscript` | 上付き文字 | 選択テキストを`<sup>`タグで囲む。すでにある場合は解除する。 |
| `Increase Blockquote Level` | ブロッククォートレベル増加 | 選択した行のブロッククォート（`>`）レベルを1段階増加させる。 |
| `Organize File with Tags` | タグでファイルを整理 | タグを選択し、ファイル名に絵文字プレフィックスや日付を追加、フロントマターを更新し、指定フォルダへ移動させる。 |
| `Convert Links to Relative Paths` | リンクを相対パスに変換 | ファイル内のWikiリンクやMarkdownリンクを、すべて相対パス形式のMarkdownリンクに一括変換する。 |
| `Move Tab Left` | タブを左に移動 | 現在のアクティブタブを左隣のタブと交換して移動する。ピン留めタブにも対応。 |
| `Move Tab Right` | タブを右に移動 | 現在のアクティブタブを右隣のタブと交換して移動する。ピン留めタブにも対応。 |

### ✨ QuickAdd

定型的なコンテンツやタスクを素早く追加する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Add Task to ToDo List` | ToDoリストにタスク追加 | 設定で指定したToDoリストファイルのInboxセクションにタスクを追加する。 |
| `Insert MOC` | MOCを挿入 | 関連ノートなどをまとめるためのMOC（Map of Contents）テンプレートを挿入する。 |

### 📄 PDF管理

文献ノートのフロントマター`pdf`フィールドに記載されたPDFファイルパスを活用する。

> ![caution]
> [Simple Citations](https://github.com/masaki39/simple-citations)のoptional fields機能で`pdf`フィールドにPDFファイルパス出力しているという前提に基づく。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Export PDF` | PDFエクスポート | フロントマターの`pdf`フィールドに指定されたPDFファイルをエクスポートフォルダにコピーする。 |
| `Export PDF Images` | PDF画像抽出 | PDFから画像をPNG形式で抽出する。Popplerの`pdfimages`を使用。出力ファイル名: `pdf1-000.png`, `pdf2-000.png`など。 |
| `Export PDF Text` | PDFテキスト抽出 | PDFからテキストを抽出する。Popplerの`pdftotext`を使用。出力ファイル名: `pdf1.txt`, `pdf2.txt`など。 |

**必要な依存関係:**
- [Poppler](https://poppler.freedesktop.org/)（`pdfimages`, `pdftotext`コマンド）
  - macOS: `brew install poppler`
  - Linux: `apt install poppler-utils` または `yum install poppler-utils`

### 連携機能

#### プレゼンテーション（Marp）

[Marp](https://marp.app/)を使ったプレゼンテーション作成を支援する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Preview Marp Slide` | Marpプレビュー | 内部リンクを相対パスに変換後、Marpのプレビュー用コマンドをクリップボードにコピーする。 |
| `Export Marp Slide` | Marpエクスポート | 内部リンクを相対パスに変換後、Marpのエクスポート（PPTX形式）用コマンドをクリップボードにコピーする。 |
| `Export Marp Presenter Notes` | Marpノート出力 | Marp Presenter Notesをテキストファイルとして出力する。 |

**必要な依存関係:**
- [Marp-cli](https://github.com/marp-team/marp-cli)

#### Anki

| コマンド | 機能 | 説明 |
|---|---|---|
| `Add Note to Anki` | Ankiノート追加 | 表面・裏面のテキストを入力して、Ankiに新しいノートを追加する。 |

> ![caution]
> ノートタイプ`基本`、デッキ`Default`にのみカードを追加する。

**必要な依存関係**
- [Anki](https://apps.ankiweb.net)
  - [Anki Connect](https://github.com/amikey/anki-connect)

AnkiにAnki Connectというアドオンを追加する。
この時設定に`app://obsidian.md`を加えてObsidianからのアクセスを許可する。

設定例：

```json
{
    "apiKey": null,
    "apiLogPath": null,
    "ignoreOriginList": [],
    "webBindAddress": "127.0.0.1",
    "webBindPort": 8765,
    "webCorsOriginList": [
        "http://localhost",
        "app://obsidian.md"
    ]
}
```

#### Quartz

[Quartz](https://quartz.jzhao.xyz/)サイトの管理を効率化する。

| コマンド | 機能 | 説明 |
|---|---|---|
| `Quartz Sync` | Quartzと同期 | 設定した公開用フォルダの内容を、指定したQuartzリポジトリに同期する。 |
| `Open Quartz Site` | Quartzサイトを開く | 設定したQuartzサイトのURLをブラウザで開く。 |
| `Quartz Sync and Open Site` | Quartzと同期してサイトを開く | 同期コマンドを実行後、サイトとGitHub Actionsのページを開く。 |

#### macOS ショートカット

| コマンド | 機能 | 説明 |
|---|---|---|
| `Run Shortcut: {設定した名前}` | ショートカット実行 | macOSの「ショートカット」アプリで作成したショートカットをObsidianから直接実行する。 |

## 設定

プラグイン設定画面では、本プラグインのほぼすべての機能に関する詳細な設定が可能。

- **一般設定:** エクスポートフォルダパス（PDFやMarpで使用）
- **Gemini:** APIキー、モデル選択
- **デイリーノート:** フォルダパス、日付フォーマット、タスクの自動ソート、新規ノートの自動リンク
- **QuickAdd:** ToDoファイル名、Inbox名
- **画像処理:** 自動WebP変換の有効化、圧縮品質、リサイズ設定
- **pCloud連携:** 認証情報、公開フォルダID
- **Marp:** スライドフォルダパス、テーマパス、添付ファイルフォルダパス
- **Quartz連携:** 公開用フォルダパス、Quartzリポジトリのローカルパス、サイト名、GitHubユーザー名
- **macOSショートカット:** 実行したいショートカット名（1行に1つ）
- **ファイル整理ルール:** タグに基づくファイル整理の設定

## インストール

[BRAT](https://github.com/TfTHacker/obsidian42-brat)プラグインを使用してインストールするのが最も簡単である。

1. BRATをインストールし、有効化する。
2. BRATの設定で `Add Beta plugin` を選択する。
3. このリポジトリのURL `https://github.com/your-username/obsidian-crystal` を入力する。

## 注意事項

- デスクトップ版Obsidianでのみ動作する。
- 多くの機能は、外部サービス（Gemini, pCloud, Anki, Marp CLI, Poppler, macOS Shortcuts）の事前設定やインストールが必要である。
- PDF管理機能を使用する場合、Popplerのインストールが必須である。
- 個人用途に最適化されているため、利用者の環境に応じた設定調整が必要な場合がある。
