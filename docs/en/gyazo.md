**English** | [日本語](../ja/gyazo.md)

# Gyazo

Upload images to [Gyazo](https://gyazo.com) and link them from your notes. You can also move a note's existing images to Gyazo in one step, so images stay light and easy to share.

[← Back to the documentation index](README.md)

## Requirements

- A Gyazo account and an access token.

## Quick setup

1. Open [gyazo.com/oauth/applications](https://gyazo.com/oauth/applications), create an application, and copy its access token.
2. Paste it into **Settings → Crystal → Images → Gyazo access token**, then select **Verify**.
3. Copy an image and run **Gyazo: Upload clipboard image**.

## Commands

| Command | What it does |
|---|---|
| `Gyazo: Upload clipboard image` | Uploads the image on the clipboard and inserts `![](https://i.gyazo.com/…)` at the cursor. |
| `Gyazo: Upload image file` | Pick an image file, upload it, and insert the link at the cursor. |
| `Gyazo: Replace image URLs in active note` | Re-uploads every external image URL in the note to Gyazo and replaces the URLs with Gyazo ones. |
| `Gyazo: Replace local images in active note` | Uploads the vault images embedded in the note. Links to them across the whole vault, other notes included, are updated to the Gyazo URL, and the original files are moved to the trash. Wikilinks, wikilink aliases, and Markdown image links are all handled. |

## Settings

**Settings → Crystal → Images**

| Setting | Default | Description |
|---|---|---|
| **Gyazo access token** | (empty) | Stored in Obsidian's secret storage. **Verify** checks that it works. |
| **Auto Convert Images to WebP on Paste** | On | When on, images are also converted to WebP and resized before they're uploaded. See [Images](images.md). |

## Examples

**Gyazo: Replace local images in active note**:

```markdown
![[screenshot.png]]
![[diagram.png|400]]
```

becomes

```markdown
![](https://i.gyazo.com/1a2b3c….png)
![](https://i.gyazo.com/4d5e6f….png)
```

`screenshot.png` and `diagram.png` are moved to the trash. Other notes that embedded them now point to the same Gyazo URLs. A size such as `|400` on an embed is dropped, and a plain link like `[[diagram.png|Diagram]]` becomes `[Diagram](https://i.gyazo.com/…)`.

## Notes and troubleshooting

- **Images become public.** Anyone with the URL can see an image uploaded to Gyazo. Don't upload anything private.
- **"Gyazo access token is not configured"**: set the token in **Settings → Crystal → Images**.
- **Some images failed**: only the images that uploaded are replaced. Failed ones keep their original links, and their files aren't trashed. Run the command again to retry them.
- Trashed images follow Obsidian's **Deleted files** setting (system trash or `.trash`), so you can restore them.
