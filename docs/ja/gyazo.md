[English](../en/gyazo.md) | **日本語**

# Gyazo

画像を [Gyazo](https://gyazo.com) にアップロードし、ノートからリンクします。ノート内の既存の画像をまとめて Gyazo に移すこともできるので、画像を軽く、共有しやすく保てます。

[← ドキュメント索引に戻る](README.md)

## 要件

- Gyazo アカウントとアクセストークン。

## クイックセットアップ

1. [gyazo.com/oauth/applications](https://gyazo.com/oauth/applications) を開いてアプリケーションを作成し、そのアクセストークンをコピーします。
2. **Settings → Crystal → Images → Gyazo access token** に貼り付けて、**Verify** を選択します。
3. 画像をコピーして **Gyazo: Upload clipboard image** を実行します。

## コマンド

| コマンド | 動作 |
|---|---|
| `Gyazo: Upload clipboard image` | クリップボードの画像をアップロードし、カーソル位置に `![](https://i.gyazo.com/…)` を挿入します。 |
| `Gyazo: Upload image file` | 画像ファイルを選んでアップロードし、カーソル位置にリンクを挿入します。 |
| `Gyazo: Replace image URLs in active note` | ノート内のすべての外部画像 URL を Gyazo に再アップロードし、URL を Gyazo のものに置き換えます。 |
| `Gyazo: Replace local images in active note` | ノートに埋め込まれた Vault 内の画像をアップロードします。他のノートを含む Vault 全体でそれらへのリンクが Gyazo の URL に更新され、元のファイルはゴミ箱に移動します。wikilink、wikilink のエイリアス、Markdown の画像リンクのいずれにも対応しています。 |

## 設定

**Settings → Crystal → Images**

| 設定 | デフォルト | 説明 |
|---|---|---|
| **Gyazo access token** | （空） | Obsidian のシークレットストレージに保存されます。**Verify** で動作を確認できます。 |
| **Auto Convert Images to WebP on Paste** | オン | オンの場合、画像はアップロード前にも WebP に変換・リサイズされます。[画像](images.md)を参照してください。 |

## 使用例

**Gyazo: Replace local images in active note**:

```markdown
![[screenshot.png]]
![[diagram.png|400]]
```

は次のようになります。

```markdown
![](https://i.gyazo.com/1a2b3c….png)
![](https://i.gyazo.com/4d5e6f….png)
```

`screenshot.png` と `diagram.png` はゴミ箱に移動します。それらを埋め込んでいた他のノートも、同じ Gyazo の URL を指すようになります。埋め込みに付いた `|400` などのサイズ指定は削除され、`[[diagram.png|Diagram]]` のような通常のリンクは `[Diagram](https://i.gyazo.com/…)` になります。

## 注意とトラブルシューティング

- **画像は公開されます。** Gyazo にアップロードした画像は、URL を知っている人なら誰でも見られます。非公開にしたいものはアップロードしないでください。
- **"Gyazo access token is not configured"**（Gyazo のアクセストークンが設定されていません）: **Settings → Crystal → Images** でトークンを設定してください。
- **一部の画像が失敗した**: 置き換えられるのはアップロードに成功した画像だけです。失敗した画像は元のリンクのままで、ファイルもゴミ箱に移動しません。もう一度コマンドを実行すると再試行できます。
- ゴミ箱に移動した画像は Obsidian の **Deleted files** 設定（システムのゴミ箱または `.trash`）に従うので、復元できます。
