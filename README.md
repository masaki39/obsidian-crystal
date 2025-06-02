# Crystal - Obsidian Plugin

CrystalはObsidian用の汎用機能拡張プラグインである。自分の欲しい機能を自由に追加・カスタマイズできるベースとして設計されている。

## 現在実装されている機能

- **AI駆動型Description生成**: Google Gemini APIを使用してノートの内容から適切なdescriptionを自動生成
- **プラグインテンプレート**: 新しい機能を簡単に追加できる拡張可能な構造

## セットアップ

1. Obsidianの設定でCrystalプラグインを有効化する
2. 必要に応じて各機能の設定を行う（例：Gemini API Key等）

## Description生成機能の使用方法

1. Google AI StudioでGemini API Keyを取得する
2. プラグイン設定でGemini API Keyを入力する
3. Obsidianでノートを開く
4. コマンドパレット（Ctrl/Cmd + P）を開く
5. "Generate Description for Current File"コマンドを実行する
6. AIがノートの内容を分析してdescriptionを生成する
7. 生成されたdescriptionがフロントマターに自動的に追加される

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
