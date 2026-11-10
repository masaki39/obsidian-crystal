[English](../en/bluesky.md) | **日本語**

# Bluesky

Obsidian から離れずに Bluesky へ投稿できます。画像を最大 4 枚添付でき、リンクにはプレビューカードが付き、各投稿をデイリーノートのタイムラインに残すこともできます。

[← ドキュメント索引に戻る](README.md)

## 要件

- `bsky.social` の Bluesky アカウントとアプリパスワード。独自の PDS ホストには対応していません。
- 任意: 投稿をタイムラインに残す場合は、コアプラグインの **Daily notes**。
- 任意: [Gyazo](gyazo.md) のアクセストークン。設定すると、タイムラインの項目に画像を表示するため、投稿ウィンドウで添付した画像が Gyazo にアップロードされます（公開）。アップロードされるのは、投稿がデイリーノートのタイムラインに追記されるときだけです。下の Gyazo に関する注意も参照してください。

## クイックセットアップ

1. Bluesky で **Settings → Privacy and security → App passwords** を開き、アプリパスワードを作成します。
2. **Settings → Crystal → Bluesky** で **Bluesky Handle/Email** と **Bluesky App Password** を入力し、**Verify** を選択します。
3. **Bluesky: Post to Bluesky** を実行し、何か書いて **Post** を選択します。

## コマンド

| コマンド | 動作 |
|---|---|
| `Bluesky: Post to Bluesky` | テキストと最大 4 枚の画像（**Choose files** または **Paste from clipboard**）を入力する投稿ウィンドウを開き、投稿します。画像がない場合は、テキスト内の最初の URL がリンクカードになります。 |
| `Bluesky: Post to daily note timeline` | 同じウィンドウを開きますが、投稿する代わりにテキストを今日のデイリーノートのタイムラインに追加します。 |
| `Daily: Post draft to Bluesky` | 下書きノートを投稿します。埋め込まれた画像（ローカルでも URL でも）が添付されます（最大 4 枚）。[デイリーノート](daily-notes.md)を参照してください。 |

## 設定

**Settings → Crystal → Bluesky**

| 設定 | デフォルト | 説明 |
|---|---|---|
| **Bluesky Handle/Email** | （空） | ハンドル（例: `user.bsky.social`）またはメールアドレス。Obsidian のシークレットストレージに保存されます。 |
| **Bluesky App Password** | （空） | アカウントのパスワードではなく、アプリパスワードを入力します。シークレットストレージに保存されます。**Verify** でサインインして確認します。 |
| **Append Bluesky posts to Daily Note timeline** | オフ | 各投稿を今日のデイリーノートのタイムラインにも、青い `[!timeline\|blue]` コールアウトとして追加します。 |
| **Daily Note timeline heading** | `# Time Line` | タイムラインのセクションを示す見出し。行と完全に一致している必要があります。 |

## 使用例

**Append Bluesky posts to Daily Note timeline** がオンで、Gyazo トークンが設定されている場合、投稿すると次の内容が追加されます。

```markdown
# Time Line

> [!timeline|blue] 18:05
> New release is out! https://github.com/masaki39/obsidian-crystal
> ![](https://i.gyazo.com/…png)
```

```mermaid
sequenceDiagram
  participant You
  participant Crystal
  participant Bluesky
  participant Note as Daily note
  You->>Crystal: Bluesky: Post to Bluesky
  Crystal->>Bluesky: Sign in with app password (once per session)
  Crystal->>Bluesky: Create post (images or link card)
  Crystal-->>Note: Add to timeline (if enabled)
```

## 注意とトラブルシューティング

- **"Bluesky credentials are not configured"**（Bluesky の認証情報が設定されていません）: **Settings → Crystal → Bluesky** の両方の欄を入力してください。
- **認証に失敗する**: アカウントのパスワードではなく、アプリパスワードを使ってください。ハンドルまたはメールアドレスが正しいかも確認してください。
- **リンクカード**:
  - カードを作るために、Crystal はリンク先のページとそのプレビュー画像を取得します。
  - 使われるのは最初の URL だけで、投稿に画像がない場合に限ります。
- **言語タグ**: 投稿には日本語（`ja`）のタグが付きます。
- **Gyazo**:
  - Gyazo トークンが設定されていると、添付した画像は送信時に Gyazo にアップロードされます。ただし、投稿がデイリーノートのタイムラインに追記される場合に限ります。アップロードした画像は URL を知っている人なら誰でも見られます。
    - **Bluesky: Post to daily note timeline**: 常にアップロードされます。
    - **Bluesky: Post to Bluesky**: **Append Bluesky posts to Daily Note timeline** がオンのときだけアップロードされます。オフのときは、画像は Bluesky にだけ送られます。
  - 公開されるコピーを作りたくない場合は、**Gyazo access token** を空のままにするか、タイムライン追記をオフにするか、これらのウィンドウで画像を添付しないでください。
