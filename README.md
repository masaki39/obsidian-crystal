# Obsidian Crystal

Obsidianの自作プラグインである。個人用に作成したが、誰でも使用可能だ。
BRATでインストールできる。

## 概要

このプラグインは、Obsidianでの作業効率を向上させるための様々な機能を提供する。
AI（Gemini）を活用したテキスト処理、画像管理、デイリーノート操作、Anki連携など、多岐にわたる機能を統合している。

## 機能一覧

### AI機能（Gemini連携）

| コマンド | 機能 | 説明 |
|---------|------|------|
| `Generate Description for Current File` | ファイル説明生成 | 現在のファイルの内容を解析してdescriptionを自動生成する |
| `Translate Selected Text` | 選択テキスト翻訳 | 選択したテキストを翻訳する |
| `Translate Above Cursor Text` | カーソル上翻訳 | カーソル位置より上のテキストを翻訳する |
| `Grammar Check Current Line` | 文法チェック | 現在行の文法をチェックして修正提案を行う |
| `Add Note to Anki Assisted by Gemini` | AI支援Anki追加 | Geminiの支援を受けてAnkiカードを作成する |

### デイリーノート管理

| コマンド | 機能 | 説明 |
|---------|------|------|
| `Open Today's Daily Note` | 今日のノート | 今日のデイリーノートを開く |
| `Open Yesterday's Daily Note` | 昨日のノート | 昨日のデイリーノートを開く |
| `Open Tomorrow's Daily Note` | 明日のノート | 明日のデイリーノートを開く |

### 画像管理（pCloud連携）

| コマンド | 機能 | 説明 |
|---------|------|------|
| `Upload Clipboard Image to pCloud Public Folder` | クリップボード画像アップロード | クリップボードの画像をpCloudにアップロードしてリンクを生成 |
| `Upload Image File to pCloud Public Folder` | 画像ファイルアップロード | 画像ファイルを選択してpCloudにアップロード |

### エディタ機能

| コマンド | 機能 | 説明 |
|---------|------|------|
| `Create New File with Timestamp` | タイムスタンプファイル作成 | タイムスタンプ付きの新しいファイルを作成 |
| `Create New File with Link at Cursor` | リンク付きファイル作成 | カーソル位置にリンクを挿入して新しいファイルを作成 |
| `Copy File Link to Clipboard` | ファイルリンクコピー | 現在のファイルのリンクをクリップボードにコピー |
| `Copy File Link with Alias to Clipboard` | エイリアス付きリンクコピー | エイリアス付きファイルリンクをクリップボードにコピー |
| `Wrap Selection with Subscript` | 下付き文字 | 選択テキストを下付き文字でラップ |
| `Wrap Selection with Superscript` | 上付き文字 | 選択テキストを上付き文字でラップ |
| `Organize File with Prefix and Tags` | ファイル整理 | プレフィックスとタグでファイルを整理 |
| `Convert Links to Relative Paths` | 相対パス変換 | リンクを相対パスに変換 |

### クイック追加機能

| コマンド | 機能 | 説明 |
|---------|------|------|
| `Add Task to Daily Note` | デイリーノートタスク追加 | デイリーノートにタスクを追加 |
| `Add Task to ToDo List` | ToDoリストタスク追加 | ToDoリストにタスクを追加 |
| `Insert MOC` | MOC挿入 | Map of Contents（MOC）を挿入 |

### プレゼンテーション機能（Marp）

| コマンド | 機能 | 説明 |
|---------|------|------|
| `Preview Marp Slide` | Marpプレビュー | Marpスライドをプレビュー |
| `Export Marp Slide` | Marpエクスポート | Marpスライドを各種形式でエクスポート |

### Anki連携

| コマンド | 機能 | 説明 |
|---------|------|------|
| `Add Note to Anki` | Ankiノート追加 | Ankiにノートを追加 |

## 設定

プラグインの設定画面では以下の項目を設定できる：

- Gemini API キー
- pCloud認証情報
- デイリーノート設定
- 画像処理設定
- 自動WebP変換設定

## インストール

BRATプラグインを使用してインストールすることができる。

## 注意事項

- デスクトップ版Obsidianでのみ動作する
- 一部の機能は外部サービス（Gemini、pCloud、Anki）の設定が必要
- 個人用途に最適化されているため、環境に応じた調整が必要な場合がある