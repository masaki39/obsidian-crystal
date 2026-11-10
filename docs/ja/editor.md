[English](../en/editor.md) | **日本語**

# エディター

編集を助ける小さなツール群です。タイムスタンプ付きノート、リンクのコピー、下付き・上付き文字、リンクの整理、OGP リンクカード、ルールに基づくファイル整理、Cosense 風の自動箇条書きを提供します。

[← ドキュメント索引に戻る](README.md)

## 要件

- ほとんどのコマンドは設定不要です。
- **Editor: Organize file with prefix and tags** には、**Settings → Crystal → File rules** にルールが 1 つ以上必要です。
- **Editor: Insert OGP link** は外部の画像サービス `ogpf.vercel.app` を使います。[ネットワーク利用とプライバシー](../../README.ja.md#ネットワーク利用とプライバシー)を参照してください。

## クイックセットアップ

1. 自動箇条書きはデフォルトでオンです。行頭でスペースを入力して試してみてください。
2. [Auto Bullet](https://github.com/takitsuba/obsidian-auto-bullet) プラグインを使っている場合は、それを無効にするか、こちらの **Auto bullet** をオフにしてください。そうしないと箇条書きが二重に付きます。
3. 任意: **Editor: Move cursor after list marker** に Home などのホットキーを割り当てます。

## コマンド

| コマンド | 動作 |
|---|---|
| `Editor: Create new file with timestamp` | Vault のルートに `YYYYMMDDHHmmss` という名前のノートを作成して開きます。タイトルはすぐに名前を変更できる状態になり、Vim モードがオンの場合はエディターが Insert モードで始まります。 |
| `Editor: Create new file with link at cursor` | 上と同じ操作に加えて、新しいノートへのリンクをカーソル位置に挿入します。 |
| `Editor: Copy file link` | アクティブなノートの `[[note]]` をコピーします。 |
| `Editor: Copy file link with alias` | `aliases` の最初の項目があれば、それを使って `[[note\|alias]]` をコピーします。 |
| `Editor: Wrap selection with subscript` | 選択範囲を `<sub>…</sub>` で囲みます。すでに囲まれていれば解除します。 |
| `Editor: Wrap selection with superscript` | 選択範囲を `<sup>…</sup>` で囲みます。すでに囲まれていれば解除します。 |
| `Editor: Increase blockquote level` | 選択した行の `>` を 1 段階増やします。 |
| `Editor: Convert links to relative paths` | ノート内のすべての wikilink と Markdown リンクを、相対パスの Markdown リンクに書き換えます。 |
| `Editor: Convert active file to bullet list` | ノートの本文を箇条書きに変換します。frontmatter は残ります。 |
| `Editor: Organize file with prefix and tags` | ルールを選ぶと、ノートにそのルールのタグ、プレフィックス、日付（任意）が付き、ルールのフォルダーに移動します。 |
| `Editor: Insert OGP link (horizontal)` | URL を入力させ、横長レイアウトのリンクカード画像を挿入します。 |
| `Editor: Insert OGP link (vertical)` | URL を入力させ、縦長レイアウトのリンクカード画像を挿入します。 |
| `Editor: Move cursor after list marker` | カーソルをリストマーカー（`- `、`* `、`+ `、`1. `、`1) `）とチェックボックスの直後に移動します。それ以外の行では行頭に移動します。 |

次の機能は自動で動きます。

- **Auto bullet**: 行頭で入力したスペースまたは Tab が `- ` になります。詳しくは以降のセクションを参照してください。
- **Vim mode reset**: Vim モードがオンのときに別のペインに移動すると、元のエディターが Normal モードに戻ります。

## 設定

**Settings → Crystal → Editor**

| 設定 | デフォルト | 説明 |
|---|---|---|
| **Auto bullet** | オン | 行頭で入力したスペースを `- ` の箇条書きに変換します。 |
| **Half-width space** | オン | 半角スペースで自動箇条書きを発動させます。 |
| **Full-width space** | オン | 全角スペース（例: 日本語 IME がオンの状態で押した Space）で自動箇条書きを発動させます。 |
| **Tab** | オン | Tab で自動箇条書きを発動させます。既存のリスト項目では、Tab はこれまでどおりインデントします。 |

**Settings → Crystal → File rules**: **File organization rules**

| 項目 | 説明 |
|---|---|
| **Display name** | ルール選択画面に表示される名前。 |
| **Tag** | ノートの `tags` に追加されるタグ。他のルールのタグは削除されます。 |
| **Folder** | ノートの移動先フォルダー。 |
| **Prefix** | ファイル名の先頭に付けるテキスト（絵文字など）。他のルールのプレフィックスは先に削除されます。 |
| **Include date in filename**（トグル） | ファイル名の先頭に `<日付>_` を付けます。ノートに `date` プロパティがあれば、その値を書式変換せずにそのまま使います。なければファイルの作成日を `YYYY-MM-DD` 形式で使います。 |

**Add New Rule** でルールを追加し、**↑**/**↓**/**-** で並べ替えや削除を行います。

## 使用例

<img alt="行頭で入力したスペースが箇条書きになる" src="../assets/editor-auto-bullet.svg" width="560">

**Auto bullet**（`␣` は入力したスペース）:

```markdown
␣foo
```

は次のようになります。

```markdown
- foo
```

`Notes/Today.md` での **Editor: Convert links to relative paths**（`image.png` は `attachments/` に保存されている場合）:

```markdown
See [[Projects/Plan]] and ![[image.png]].
```

は次のようになります。

```markdown
See [Projects/Plan](../Projects/Plan.md) and ![](../attachments/image.png).
```

**Editor: Insert OGP link (horizontal)**:

```markdown
[![](https://ogpf.vercel.app/c?url=https://example.com)](https://example.com)
```

## 注意とトラブルシューティング

- **自動箇条書きが発動しない場所**:
  - frontmatter
  - コードブロック（` ``` ` / `~~~`）と `$$` の数式ブロック
  - 見出し、引用とコールアウト、表、水平線
  - チェックボックスを含む既存のリスト項目
  - 貼り付け、削除、IME で変換中のテキスト
- **自動箇条書きを元に戻す**:
  - 元に戻す（Undo）で箇条書きは消えますが、直前の入力とまとめて扱われるため、その入力も一緒に取り消されることがあります。
  - IME の確定で入力した全角スペースは、元に戻すのに 1〜2 ステップかかります。
- **箇条書きが二重に付く**: Auto Bullet プラグインを無効にしてください。
- **タイムスタンプ付きの新規ファイルは Vault のルートに作成されます**。**Default location for new notes** の設定には関係ありません。
- **OGP リンク**: カード画像は `ogpf.vercel.app` が描画するため、ノートが表示されるたびに、入力した URL がそのサービスに送信されます。
