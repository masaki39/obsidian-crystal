**English** | [日本語](../ja/editor.md)

# Editor

Small editing helpers: timestamped notes, link copying, sub/superscript, link cleanup, OGP link cards, rule-based file organizing, Cosense-style auto bullets, and Vim mode extras.

[← Back to the documentation index](README.md)

## Requirements

- No setup for most commands.
- **Editor: Organize file with prefix and tags** needs at least one rule in **Settings → Crystal → File rules**.
- **Editor: Insert OGP link** uses the external image service `ogpf.vercel.app`. See [Network use & privacy](../../README.md#network-use--privacy).

## Quick setup

1. Auto bullet is on by default. Type a space at the start of a line to try it.
2. If you use the [Auto Bullet](https://github.com/takitsuba/obsidian-auto-bullet) plugin, disable it or turn off **Auto bullet** here. Otherwise bullets are added twice.
3. Optional: assign a hotkey such as Home to **Editor: Move cursor after list marker**.
4. Optional, for Vim users: turn on **Settings → Editor → Vim key bindings**, then set up the **Vim** settings below. Disable Vimrc Support or vim-motions if they set the same keys.

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
- **Vim extras**: display-line `j`/`k`, yank to the system clipboard, and Space-leader mappings, when turned on in the **Vim** settings.

## Settings

**Settings → Crystal → Editor**

| Setting | Default | Description |
|---|---|---|
| **Auto bullet** | On | Turns a space typed at the start of a line into a `- ` bullet. |
| **Half-width space** | On | Lets a half-width space trigger auto bullet. |
| **Full-width space** | On | Lets a full-width space trigger auto bullet, for example Space with a Japanese IME on. |
| **Tab** | On | Lets Tab trigger auto bullet. Tab on an existing list item still indents it. |

**Settings → Crystal → Editor**: **Vim** (for Obsidian's built-in Vim mode)

| Setting | Default | Description |
|---|---|---|
| **Move by display line** | Off | `j`/`k` act as `gj`/`gk` in normal and visual mode, so wrapped lines aren't skipped. Counts work (`5j`). `dj`/`yk` stay linewise. |
| **Y yanks to end of line** | On | `Y` copies from the cursor to the end of the line (`y$`), like `D` and `C`, instead of the whole line (`yy`). Visual-mode `Y` is unchanged. |
| **Highlight yanked text** | On | The yanked text flashes briefly, like vim-highlightedyank. |
| **Yank to system clipboard** | Off | Yanks to the unnamed register are also copied to the system clipboard, like `set clipboard=unnamed`. Deletes and named registers (`"ay`) stay inside Vim. Pasting with `p` still uses Vim's register; use `"+p` to paste from the clipboard. |
| **Default keymap** | On | Space followed by a key or two runs a Crystal command in normal mode. See the keymap below. |
| **Show key hints** | On | After Space, a panel at the bottom of the editor lists the keys that can come next and what they do, like which-key. Command names are shortened to fit (the plugin name, and for Crystal also the feature name, is left out). In hacker mode the panel takes the terminal look. Esc cancels, Backspace goes back one key. |
| **Hint delay** | 200 | Milliseconds before the panel appears, so it stays out of the way when you type a mapping quickly. |
| **Your mappings** | (none) | Map Space plus keys (for example `dt`) to any command, including other plugins', chosen from a command list. Your mappings override the defaults: one with the same keys replaces the default, and one that is a prefix replaces the whole group (map `d` to **Do nothing** to turn off every `Space d` key). In the command list, Ctrl+J / Ctrl+K move the selection down / up. |
| **Check for conflicts** | — | Lists your mappings that clash with each other (the later one wins) or replace default mappings, and rows still missing keys or a command. |

While the leader is on, Space starts a key sequence in normal mode instead of moving right. Visual mode keeps Space as usual. With a Japanese IME on, the physical keys are used, so `Space d d` works without switching the IME off.

### Default leader keymap

The first key picks a group. The most used groups (AI, send, daily, file, Gyazo) are on the home row, and Vim habits carry over: `h`/`l` previous/next, `j`/`k` down/up, `J`/`K` move, `y` yank (copy), `q` quit, and a doubled key for the group's most common action (`Space d d`, `Space s s`, `Space g g`).

| Keys | Command |
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

The Vim extras also work in pop-out windows. They replace these lines of a typical `.obsidian.vimrc`:

```vim
nmap j gj
nmap k gk
set clipboard=unnamed
let mapleader = " "
exmap today obcommand obsidian-crystal:crystal-open-today
nmap <leader>dd :today<CR>
```

**Settings → Crystal → File rules**

| Field | Description |
|---|---|
| **Display name** | Name shown in the rule picker. |
| **Tag** | Tag added to the note's `tags`. Tags from other rules are removed. |
| **Folder** | Folder the note is moved to. |
| **Prefix** | Text added to the start of the file name, such as an emoji. Prefixes from other rules are removed first. |
| **Include date in filename** (toggle) | Adds `<date>_` to the start of the file name. If the note has a `date` property, its value is used as is, without reformatting. Otherwise the file's creation date is used as `YYYY-MM-DD`. |

Use **Add rule** to add rules, and the arrow and trash buttons to reorder or remove them.

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
- **A Vim leader mapping does nothing**: check that Vim key bindings are on and that the command's plugin is enabled. A mapping whose command isn't loaded is shown in red in the settings. A key that another plugin maps too (for example Vimrc Support) may win.
