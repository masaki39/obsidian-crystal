**English** | [日本語](../ja/editor.md)

# Editor

Small editing helpers: timestamped notes, link copying, sub/superscript, link cleanup, OGP link cards, rule-based file organizing, and Cosense-style auto bullets.

[← Back to the documentation index](README.md)

## Requirements

- No setup for most commands.
- **Editor: Organize file with prefix and tags** needs at least one rule in **Settings → Crystal → File rules**.
- **Editor: Insert OGP link** uses the external image service `ogpf.vercel.app`. See [Network use & privacy](../../README.md#network-use--privacy).

## Quick setup

1. Auto bullet is on by default. Type a space at the start of a line to try it.
2. If you use the [Auto Bullet](https://github.com/takitsuba/obsidian-auto-bullet) plugin, disable it or turn off **Auto bullet** here. Otherwise bullets are added twice.
3. Optional: assign a hotkey such as Home to **Editor: Move cursor after list marker**.

## Commands

| Command | What it does |
|---|---|
| `Editor: Create new file with timestamp` | Creates a note named `YYYYMMDDHHmmss` in the vault root and opens it. The title is ready to rename, or the editor starts in Insert mode if Vim mode is on. |
| `Editor: Create new file with link at cursor` | Does the same, and also inserts a link to the new note at the cursor. |
| `Editor: Copy file link` | Copies `[[note]]` for the active note. |
| `Editor: Copy file link with alias` | Copies `[[note\|alias]]` using the first entry of `aliases`, if there is one. |
| `Editor: Wrap selection with subscript` | Wraps the selection in `<sub>…</sub>`, or unwraps it if it's already wrapped. |
| `Editor: Wrap selection with superscript` | Wraps the selection in `<sup>…</sup>`, or unwraps it if it's already wrapped. |
| `Editor: Increase blockquote level` | Adds one `>` level to the selected lines. |
| `Editor: Convert links to relative paths` | Rewrites every wikilink and Markdown link in the note as a Markdown link with a relative path. |
| `Editor: Convert active file to bullet list` | Turns the body of the note into a bullet list. Frontmatter is kept. |
| `Editor: Organize file with prefix and tags` | Pick a rule, and the note gets the rule's tag, prefix, and optional date, then moves to the rule's folder. |
| `Editor: Insert OGP link (horizontal)` | Asks for a URL and inserts a link card image with a horizontal layout. |
| `Editor: Insert OGP link (vertical)` | Asks for a URL and inserts a link card image with a vertical layout. |
| `Editor: Move cursor after list marker` | Moves the cursor just after the list marker (`- `, `* `, `+ `, `1. `, `1) `) and checkbox. On other lines it moves to the start of the line. |

These run automatically:

- **Auto bullet**: a space or Tab typed at the start of a line becomes `- `. Details are in the next sections.
- **Vim mode reset**: when Vim mode is on and you move to another pane, the editor you left goes back to Normal mode.

## Settings

**Settings → Crystal → Editor**

| Setting | Default | Description |
|---|---|---|
| **Auto bullet** | On | Turns a space typed at the start of a line into a `- ` bullet. |
| **Half-width space** | On | Lets a half-width space trigger auto bullet. |
| **Full-width space** | On | Lets a full-width space trigger auto bullet, for example Space with a Japanese IME on. |
| **Tab** | On | Lets Tab trigger auto bullet. Tab on an existing list item still indents it. |

**Settings → Crystal → File rules**: **File organization rules**

| Field | Description |
|---|---|
| **Display name** | Name shown in the rule picker. |
| **Tag** | Tag added to the note's `tags`. Tags from other rules are removed. |
| **Folder** | Folder the note is moved to. |
| **Prefix** | Text added to the start of the file name, such as an emoji. Prefixes from other rules are removed first. |
| **Include date in filename** (toggle) | Adds `<date>_` to the start of the file name. If the note has a `date` property, its value is used as is, without reformatting. Otherwise the file's creation date is used as `YYYY-MM-DD`. |

Use **Add New Rule** to add rules, and **↑**/**↓**/**-** to reorder or remove them.

## Examples

<img alt="A space typed at the start of a line becomes a bullet" src="../assets/editor-auto-bullet.svg" width="560">

**Auto bullet** (`␣` is the space you type):

```markdown
␣foo
```

becomes

```markdown
- foo
```

**Editor: Convert links to relative paths**, in `Notes/Today.md` (with `image.png` stored in `attachments/`):

```markdown
See [[Projects/Plan]] and ![[image.png]].
```

becomes

```markdown
See [Projects/Plan](../Projects/Plan.md) and ![](../attachments/image.png).
```

**Editor: Insert OGP link (horizontal)**:

```markdown
[![](https://ogpf.vercel.app/c?url=https://example.com)](https://example.com)
```

## Notes and troubleshooting

- **Where auto bullet doesn't trigger**:
  - frontmatter
  - code blocks (` ``` ` / `~~~`) and `$$` math blocks
  - headings, quotes and callouts, tables, horizontal rules
  - existing list items, including checkboxes
  - pasting, deleting, and text still being composed in an IME
- **Undoing an auto bullet**:
  - Undo removes the bullet, but it's grouped with your previous input, so that input may be undone too.
  - A full-width space entered through IME confirmation takes one or two undo steps.
- **Bullets appear twice**: disable the Auto Bullet plugin.
- **New timestamp files go to the vault root**, whatever your **Default location for new notes** setting is.
- **OGP links**: the card image is rendered by `ogpf.vercel.app`, so the URL you enter is sent to that service whenever the note is displayed.
