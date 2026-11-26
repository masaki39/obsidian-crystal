[English](../en/editor.md) | **日本語**

# エディター

編集を助ける小さなツール群です。タイムスタンプ付きノート、リンクのコピー、下付き・上付き文字、リンクの整理、OGP リンクカード、ルールに基づくファイル整理、Cosense 風の自動箇条書き、Vim モードの拡張を提供します。

[← ドキュメント索引に戻る](README.md)

## 要件

- ほとんどのコマンドは設定不要です。
- **Editor: Organize file with prefix and tags** には、**Settings → Crystal → File rules** にルールが 1 つ以上必要です。
- **Editor: Insert OGP link** は外部の画像サービス `ogpf.vercel.app` を使います。[ネットワーク利用とプライバシー](../../README.ja.md#ネットワーク利用とプライバシー)を参照してください。

## クイックセットアップ

1. 自動箇条書きはデフォルトでオンです。行頭でスペースを入力して試してみてください。
2. [Auto Bullet](https://github.com/takitsuba/obsidian-auto-bullet) プラグインを使っている場合は、それを無効にするか、こちらの **Auto bullet** をオフにしてください。そうしないと箇条書きが二重に付きます。
3. 任意: **Editor: Move cursor after list marker** に Home などのホットキーを割り当てます。
4. 任意（Vim ユーザー向け）: **Settings → Editor → Vim key bindings** をオンにしてから、下記の **Vim** の設定を行います。同じキーを設定する Vimrc Support や vim-motions は無効にしてください。

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
- **Vim extras**: **Vim** の設定でオンにすると、表示行単位の `j`/`k`、ヤンクのシステムクリップボード同期、Space リーダーのマッピングが有効になります。

## 設定

**Settings → Crystal → Editor**

| 設定 | デフォルト | 説明 |
|---|---|---|
| **Auto bullet** | オン | 行頭で入力したスペースを `- ` の箇条書きに変換します。 |
| **Half-width space** | オン | 半角スペースで自動箇条書きを発動させます。 |
| **Full-width space** | オン | 全角スペース（例: 日本語 IME がオンの状態で押した Space）で自動箇条書きを発動させます。 |
| **Tab** | オン | Tab で自動箇条書きを発動させます。既存のリスト項目では、Tab はこれまでどおりインデントします。 |

**Settings → Crystal → Editor**: **Vim**（Obsidian 標準の Vim モード用）

| 設定 | デフォルト | 説明 |
|---|---|---|
| **Move by display line** | オフ | Normal モードと Visual モードで `j`/`k` が `gj`/`gk` として動き、折り返された行を飛ばしません。回数指定（`5j`）も使えます。`dj`/`yk` は行単位のままです。 |
| **Y yanks to end of line** | オン | `Y` で行全体（`yy`）ではなく、カーソルから行末まで（`y$`）をコピーします。`D` や `C` と同じ動きです。Visual モードの `Y` は変わりません。 |
| **Highlight yanked text** | オン | ヤンクした範囲を一瞬ハイライトします（vim-highlightedyank 相当）。 |
| **Yank to system clipboard** | オフ | 無名レジスタへのヤンクをシステムクリップボードにもコピーします（`set clipboard=unnamed` 相当）。削除や名前付きレジスタ（`"ay`）は Vim の中だけに残ります。`p` での貼り付けは Vim のレジスタを使います。クリップボードから貼り付けるには `"+p` を使います。 |
| **Default keymap** | オン | Normal モードで Space に続けて 1〜2 キーを押すと、Crystal のコマンドを実行します。下のキーマップを参照してください。 |
| **Show key hints** | オン | Space を押すと、次に押せるキーとその動作をエディター下部のパネルに表示します（which-key 風）。狭いパネルに収まるよう、コマンド名からプラグイン名（Crystal のコマンドはさらに機能名）を省きます。ハッカーモード中はパネルもターミナル風の見た目になります。Esc で中止、Backspace で 1 キー戻ります。 |
| **Hint delay** | 200 | パネルが出るまでのミリ秒数。素早く入力したときにパネルが邪魔にならないようにします。 |
| **Your mappings** | （なし） | Space ＋キー（例: `dt`）に、他のプラグインを含む任意のコマンドを一覧から選んで割り当てます。自分のマッピングはデフォルトより優先されます。同じキーならそのデフォルトを置き換え、前方一致するキーならグループごと置き換えます（`d` を **Do nothing** にすると `Space d` のキーがすべて無効になります）。コマンド一覧では Ctrl+J / Ctrl+K で選択を上下に動かせます。 |
| **Check for conflicts** | — | 自分のマッピング同士の衝突（後の行が優先）、デフォルトを置き換えるマッピング、キーやコマンドが未設定の行を一覧表示します。 |

リーダーが有効な間、Normal モードの Space はカーソルを右に動かさず、キー入力の開始になります。Visual モードの Space は通常どおりです。日本語 IME がオンでも物理キーで判定するので、IME を切らずに `Space d d` が使えます。

### デフォルトのリーダーキーマップ

最初のキーでグループを選びます。よく使うグループ（AI、送信、デイリー、ファイル、Gyazo）はホームポジションにあり、Vim の感覚がそのまま使えます。`h`/`l` は前/次、`j`/`k` は下/上、`J`/`K` は移動、`y` はヤンク（コピー）、`q` は終了、同じキーの 2 回押しはそのグループで最もよく使う操作です（`Space d d`、`Space s s`、`Space g g`）。

| キー | コマンド |
|---|---|
| **Space d** | *Daily* |
| `Space d d` | Daily: Open today's note |
| `Space d h` | Daily: Open yesterday's note |
| `Space d l` | Daily: Open tomorrow's note |
| `Space d a` | Daily: Add task to daily note |
| `Space d r` | Daily: Roll over yesterday's undone tasks |
| `Space d f` | Daily: Open daily draft |
| `Space d p` | Daily: Post daily draft to timeline |
| `Space d s` | Daily: Post daily draft to Bluesky |
| **Space s** | *Send (Bluesky)* |
| `Space s s` | Bluesky: Post to Bluesky |
| `Space s d` | Bluesky: Post to daily note timeline |
| **Space a** | *AI* |
| `Space a a` | AI: Rewrite with AI (append result at end) |
| `Space a r` | AI: Rewrite with AI (replace selection or whole note) |
| `Space a t` | AI: Translate selected text |
| `Space a k` | AI: Translate above cursor text |
| `Space a j` | AI: Translate below cursor text |
| `Space a g` | AI: Grammar check current line |
| `Space a d` | AI: Generate description for current file |
| `Space a c` | AI: Generate git commit summary |
| **Space f** | *File* |
| `Space f n` | Editor: Create new file with timestamp |
| `Space f l` | Editor: Create new file with link at cursor |
| `Space f y` | Editor: Copy file link |
| `Space f Y` | Editor: Copy file link with alias |
| `Space f o` | Editor: Organize file with prefix and tags |
| `Space f r` | Editor: Convert links to relative paths |
| `Space f b` | Editor: Convert active file to bullet list |
| **Space g** | *Gyazo / images* |
| `Space g g` | Gyazo: Upload clipboard image to Gyazo |
| `Space g f` | Gyazo: Upload image file to Gyazo |
| `Space g r` | Gyazo: Replace image URLs with Gyazo |
| `Space g l` | Gyazo: Replace local images with Gyazo |
| `Space g p` | Image: Paste multiple images from file system |
| **Space e** | *Edit* |
| `Space e j` | Editor: Wrap selection with subscript |
| `Space e k` | Editor: Wrap selection with superscript |
| `Space e >` | Editor: Increase blockquote level |
| `Space e o` | Editor: Insert OGP link (horizontal) |
| `Space e O` | Editor: Insert OGP link (vertical) |
| **Space m** | *Marp* |
| `Space m j` | Marp: Go to next slide |
| `Space m k` | Marp: Go to previous slide |
| `Space m J` | Marp: Move slide down |
| `Space m K` | Marp: Move slide up |
| `Space m c` | Marp: Create slide from current note |
| `Space m p` | Marp: Preview slide |
| `Space m s` | Marp: Start Marp server |
| `Space m q` | Marp: Stop Marp server |
| `Space m i` | Marp: Move images to Marp folder |
| `Space m I` | Marp: Move images and convert links to relative paths |
| `Space m x d` | Marp: Export slide (PDF) |
| `Space m x p` | Marp: Export slide (PPTX) |
| `Space m x e` | Marp: Export slide (PPTX editable) |
| `Space m x h` | Marp: Export slide (HTML) |
| `Space m x f` | Marp: Export slide (HTML folder with attachments) |
| `Space m x n` | Marp: Export presenter notes |
| **Space p** | *Property link* |
| `Space p p` | Property link: Sync property links in current note |
| `Space p a` | Property link: Sync property links in all notes |
| **Space q** | *Quartz* |
| `Space q q` | Quartz: Sync and open Quartz site (…) |
| `Space q s` | Quartz: Sync Quartz |
| `Space q o` | Quartz: Open Quartz site (…) |
| `Space h` | Workspace: Open home page |
| **Space w** | *Window* |
| `Space w h` | Workspace: Focus left pane |
| `Space w l` | Workspace: Focus right pane |
| `Space w o` | Workspace: Toggle window opacity |
| `Space w g` | Gamification: Open gamification stats |
| `Space w m` | Hacker mode: Toggle hacker mode |

Vim の拡張はポップアウトウィンドウでも動きます。一般的な `.obsidian.vimrc` の次の行の代わりになります。

```vim
nmap j gj
nmap k gk
set clipboard=unnamed
let mapleader = " "
exmap today obcommand obsidian-crystal:crystal-open-today
nmap <leader>dd :today<CR>
```

**Settings → Crystal → File rules**

| 項目 | 説明 |
|---|---|
| **Display name** | ルール選択画面に表示される名前。 |
| **Tag** | ノートの `tags` に追加されるタグ。他のルールのタグは削除されます。 |
| **Folder** | ノートの移動先フォルダー。 |
| **Prefix** | ファイル名の先頭に付けるテキスト（絵文字など）。他のルールのプレフィックスは先に削除されます。 |
| **Include date in filename**（トグル） | ファイル名の先頭に `<日付>_` を付けます。ノートに `date` プロパティがあれば、その値を書式変換せずにそのまま使います。なければファイルの作成日を `YYYY-MM-DD` 形式で使います。 |

**Add rule** でルールを追加し、矢印とゴミ箱のボタンで並べ替えや削除を行います。

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
- **Vim のリーダーマッピングが動かない**: Vim key bindings がオンか、コマンドを提供するプラグインが有効かを確認してください。コマンドが読み込まれていないマッピングは、設定画面で赤く表示されます。他のプラグイン（Vimrc Support など）が同じキーを設定していると、そちらが優先されることがあります。
