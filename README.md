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

### ☁️ pCloud画像アップロード
- **クリップボード画像アップロード**: クリップボードの画像をpCloudの「Public Folder」に自動アップロード
- **WebP自動変換・圧縮**: 画像を自動的にWebPフォーマットに変換して圧縮（ファイルサイズ削減）
- **圧縮品質調整**: WebP圧縮品質を0.1～1.0の範囲で調整可能（デフォルト: 0.8）
- **マークダウン形式挿入**: アップロード完了時に`![](URL)`形式でカーソル位置に自動挿入
- **タイムスタンプファイル名**: アップロードファイルは`clipboard-image-YYYY-MM-DDTHH-mm-ss.webp`形式で命名
- **認証管理**: pCloudのユーザー名とパスワードを設定画面で管理

## セットアップ

1. Obsidianの設定でCrystalプラグインを有効化する
2. 必要に応じて各機能の設定を行う（例：Gemini API Key、デイリーノート設定、pCloud認証情報等）

## 利用可能なコマンド

### AI Description生成
- `Generate Description for Current File`: 現在のファイルの説明文を自動生成

### デイリーノート管理
- `Open Today's Daily Note`: 今日のデイリーノートを開く/作成
- `Open Yesterday's Daily Note`: 現在のファイルの前日のデイリーノートを開く/作成
- `Open Tomorrow's Daily Note`: 現在のファイルの翌日のデイリーノートを開く/作成

### pCloud画像アップロード
- `Upload Clipboard Image to pCloud Public Folder`: クリップボードの画像をpCloudの「Public Folder」にアップロード

## Description生成機能の使用方法

1. Google AI StudioでGemini API Keyを取得する
2. プラグイン設定でGemini API Keyを入力する
3. Obsidianでノートを開く
4. コマンドパレット（Ctrl/Cmd + P）を開く
5. "Generate Description for Current File"コマンドを実行する
6. AIがノートの内容を分析してdescriptionを生成する
7. 生成されたdescriptionがフロントマターに自動的に追加される

## pCloud画像アップロード機能

このプラグインはクリップボードの画像をpCloudのPublic Folderにアップロードし、Obsidianノートに自動的に挿入する機能を提供する。

### クリップボード画像のアップロード

**使用方法:**
1. プラグイン設定でpCloudの認証情報を設定する
2. 画像をクリップボードにコピーする（スクリーンショット、他アプリからのコピー等）
3. コマンドパレット（Ctrl/Cmd + P）を開く
4. "Upload Clipboard Image to pCloud Public Folder"コマンドを実行する
5. アップロード完了後、カーソル位置に`![](URL)`形式で画像が自動挿入される

### ファイル選択によるアップロード

**使用方法:**
1. コマンドパレット（Ctrl/Cmd + P）を開く
2. "Upload Image File to pCloud Public Folder"コマンドを実行する
3. ファイル選択ダイアログで画像ファイル（GIF含む）を選択する
4. アップロード完了後、カーソル位置に`![](URL)`形式で画像が自動挿入される

### GIFファイルのアップロード

**重要:** GIFファイルをアップロードする場合は以下の点に注意：

- **ブラウザ制限**: ウェブページのGIF画像を右クリック「画像をコピー」すると、アニメーションの1フレームのみがクリップボードにコピーされる
- **推奨方法**: GIFアニメーションを保持するには以下の方法を使用する：
  1. **ファイル選択**: "Upload Image File to pCloud Public Folder"コマンドでローカルのGIFファイルを選択
  2. **ドラッグ&ドロップ**: GIFファイルを直接エディターにドラッグ&ドロップ（Auto WebP Paste機能が有効な場合）
  3. **ファイル保存**: ウェブ上のGIFを「名前を付けて画像を保存」でローカルに保存してから上記方法を使用

**注意**: エディターが開いていない場合は、従来通りURLがクリップボードにコピーされる。

## デイリーノート機能の設定

プラグイン設定で以下をカスタマイズできる：

- **Daily Notes Folder**: デイリーノートを保存するフォルダ（デフォルト: `DailyNotes`）
- **Date Format**: ファイル名の日付フォーマット（デフォルト: `YYYY-MM-DD`）

## pCloud機能の設定

プラグイン設定で以下を設定する：

- **pCloud Username**: pCloudのユーザー名（メールアドレス）
- **pCloud Password**: pCloudのパスワード
- **pCloud Public Folder ID**: Public Folderの固有ID（例: `lF97wFVWosQpHEoDAbvva0h`）
- **WebP Compression Quality**: WebP圧縮品質（0.1 = 最低品質/最小ファイルサイズ、1.0 = 最高品質/最大ファイルサイズ）

**Public Folder IDの取得方法**:
1. pCloudのPublic Folderに既存のファイルがある場合、そのファイルのリンクを取得
2. URLの形式: `https://filedn.com/{PublicFolderID}/{filename}`
3. `{PublicFolderID}`の部分をコピーして設定に入力

**WebP圧縮について**:
- PNG、JPEG、GIF等の画像を自動的にWebPに変換
- WebPは同等の画質でファイルサイズを25-35%削減可能
- 圧縮品質0.8（デフォルト）は品質とファイルサイズのバランスが良い
- 変換に失敗した場合は元のフォーマットでアップロード

**注意**: パスワードとPublic Folder IDは機密性の高い情報であることを認識して利用すること。

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

- `main.js`、`styles.css`、`manifest.json`をVaultの`.obsidian/plugins/obsidian-crystal/`