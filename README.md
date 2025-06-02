# Crystal - Obsidian Plugin

CrystalはObsidian用の汎用機能拡張プラグインである。自分の欲しい機能を自由に追加・カスタマイズできるベースとして設計されている。

## 現在実装されている機能

### 🤖 AI駆動型Description生成
- Google Gemini APIを使用してノートの内容から適切なdescriptionを自動生成
- ノートの内容を分析し、検索用のキーワードを意識した説明文を生成

### 📅 シンプルなデイリーノート管理
- **今日のデイリーノート**: ワンクリックで今日のノートを開く/作成
- **前日のデイリーノート**: 現在開いているファイルの日付から前日のノートを開く/作成
- **翌日のデイリーノート**: 現在開いているファイルの日付から翌日のノートを開く/作成
- **スマートナビゲーション**: アクティブファイルの日付を基準に相対移動
- **カスタマイズ可能**: フォルダ名、日付フォーマットを設定で変更可能
- **シンプルな設計**: 空のファイルを作成し、コンテンツは自由に追加

## セットアップ

1. Obsidianの設定でCrystalプラグインを有効化する
2. 必要に応じて各機能の設定を行う（例：Gemini API Key、デイリーノート設定等）

## 利用可能なコマンド

### AI Description生成
- `Generate Description for Current File`: 現在のファイルの説明文を自動生成

### デイリーノート管理
- `Open Today's Daily Note`: 今日のデイリーノートを開く/作成
- `Open Yesterday's Daily Note`: 現在のファイルの前日のデイリーノートを開く/作成
- `Open Tomorrow's Daily Note`: 現在のファイルの翌日のデイリーノートを開く/作成

## Description生成機能の使用方法

1. Google AI StudioでGemini API Keyを取得する
2. プラグイン設定でGemini API Keyを入力する
3. Obsidianでノートを開く
4. コマンドパレット（Ctrl/Cmd + P）を開く
5. "Generate Description for Current File"コマンドを実行する
6. AIがノートの内容を分析してdescriptionを生成する
7. 生成されたdescriptionがフロントマターに自動的に追加される

## デイリーノート機能の設定

プラグイン設定で以下をカスタマイズできる：

- **Daily Notes Folder**: デイリーノートを保存するフォルダ（デフォルト: `DailyNotes`）
- **Date Format**: ファイル名の日付フォーマット（デフォルト: `YYYY-MM-DD`）

## 機能の追加・カスタマイズ

このプラグインは拡張性を重視して設計されており、新しい機能を簡単に追加できる：

- `main.ts`でコマンドやUI要素を追加
- `src/`ディレクトリに新しいサービスクラスを作成
- 設定項目は`src/settings.ts`で管理

## 技術仕様

このプロジェクトはTypeScriptを使用しており、型チェックとドキュメンテーションを提供している。
最新のObsidian Plugin API（obsidian.d.ts）のTypeScript定義形式に依存している。

## 開発者向け情報

### 初回セットアップ

- Node.js（v16以上）をインストールする
- `npm i`を実行して依存関係をインストールする
- `npm run dev`を実行して開発モードでコンパイルを開始する

### 手動インストール

- `main.js`、`styles.css`、`manifest.json`をVaultの`.obsidian/plugins/obsidian-crystal/`フォルダにコピーする

### コード品質の向上

ESLintを使用してコードの問題を素早く発見できる：

```bash
npm install -g eslint
eslint main.ts
```

## API Documentation

詳細については https://github.com/obsidianmd/obsidian-api を参照のこと。

## スマートナビゲーション機能

デイリーノート間の移動は、現在アクティブなファイルの日付を基準に行われる：

### 動作例
- `2024-01-15.md`を開いている状態で「Yesterday」コマンド → `2024-01-14.md`を開く
- `2024-01-16.md`を開いている状態で「Tomorrow」コマンド → `2024-01-17.md`を開く
- 日付ファイル以外を開いている場合は、今日の日付を基準にする

### 対応する日付フォーマット
- 設定で指定した日付フォーマットに従ってファイル名から日付を抽出
- デフォルト: `YYYY-MM-DD` (例: `2024-01-15`)
- カスタムフォーマット例: `YYYY年MM月DD日`, `DD-MM-YYYY` など
