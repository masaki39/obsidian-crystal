**English** | [日本語](../ja/bluesky.md)

# Bluesky

Post to Bluesky without leaving Obsidian. You can attach up to 4 images, links get a preview card, and each post can be kept in your daily note's timeline.

[← Back to the documentation index](README.md)

## Requirements

- A Bluesky account on `bsky.social` and an app password. Custom PDS hosts aren't supported.
- Optional: the core **Daily notes** plugin, to keep posts in the timeline.
- Optional: a [Gyazo](gyazo.md) access token. When one is set, images attached in the post window are uploaded to Gyazo (public) so that timeline entries can show them. This happens only when the post is added to the daily note timeline. See the note on Gyazo below.

## Quick setup

1. In Bluesky, open **Settings → Privacy and security → App passwords** and create an app password.
2. In **Settings → Crystal → Bluesky**, enter **Bluesky Handle/Email** and **Bluesky App Password**, then select **Verify**.
3. Run **Bluesky: Post to Bluesky**, write something, and select **Post**.

## Commands

| Command | What it does |
|---|---|
| `Bluesky: Post to Bluesky` | Opens a post window with text and up to 4 images (**Choose files** or **Paste from clipboard**), then posts. If there are no images, the first URL in the text becomes a link card. |
| `Bluesky: Post to daily note timeline` | Opens the same window but adds the text to today's daily note timeline instead of posting. |
| `Daily: Post draft to Bluesky` | Posts the draft note. Images embedded in it, local or by URL, are attached (up to 4). See [Daily notes](daily-notes.md). |

## Settings

**Settings → Crystal → Bluesky**

| Setting | Default | Description |
|---|---|---|
| **Bluesky Handle/Email** | (empty) | Your handle (for example `user.bsky.social`) or email. Stored in Obsidian's secret storage. |
| **Bluesky App Password** | (empty) | An app password, not your account password. Stored in secret storage. **Verify** signs in to check it. |
| **Append Bluesky posts to Daily Note timeline** | Off | Also adds each post to today's daily note timeline, as a blue `[!timeline\|blue]` callout. |
| **Daily Note timeline heading** | `# Time Line` | The heading that marks the timeline section. It must match the line exactly. |

## Examples

With **Append Bluesky posts to Daily Note timeline** on, a post with a Gyazo token set adds:

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

## Notes and troubleshooting

- **"Bluesky credentials are not configured"**: fill in both fields in **Settings → Crystal → Bluesky**.
- **Authentication failed**: use an app password, not your account password. Check that the handle or email is right.
- **Link cards**:
  - To build the card, Crystal fetches the linked page and its preview image.
  - Only the first URL is used, and only when the post has no images.
- **Language tag**: posts are tagged as Japanese (`ja`).
- **Gyazo**:
  - While a Gyazo token is set, images you attach are uploaded to Gyazo when you submit, but only when the post is added to the daily note timeline. Uploaded images are public to anyone with the URL.
    - **Bluesky: Post to daily note timeline**: always uploaded.
    - **Bluesky: Post to Bluesky**: uploaded only while **Append Bluesky posts to Daily Note timeline** is on. With it off, images go to Bluesky only.
  - If you don't want public copies, leave **Gyazo access token** empty, turn timeline appending off, or don't attach images in these windows.
