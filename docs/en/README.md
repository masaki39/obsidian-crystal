**English** | [日本語](../ja/README.md)

# Crystal documentation

The full reference for every feature and command. For an overview, see the [project README](../../README.md).

## Features

| Feature | What it does | Needs |
|---|---|---|
| [AI](ai.md) | Translate, proofread, rewrite, write descriptions, and summarize your day's git diff | OpenAI / Gemini API key, or local Ollama |
| [Daily notes](daily-notes.md) | Navigation, tasks, a timeline, a draft note, auto sort, and auto link | Core **Daily notes** plugin |
| [Editor](editor.md) | Timestamped notes, link tools, sub/superscript, OGP cards, file rules, auto bullet | — |
| [Images](images.md) | WebP conversion on paste or drop, and multi-image paste | — |
| [Gyazo](gyazo.md) | Upload images and move a note's images to Gyazo | Gyazo access token |
| [Bluesky](bluesky.md) | Post with images and link cards, and keep posts in the timeline | Bluesky app password |
| [Marp](marp.md) | Slide export (PPTX/PDF/HTML), a live server, a toolbar, slide navigation | Marp CLI |
| [Quartz](quartz.md) | Sync and open your Quartz site | Quartz repository, Node.js |
| [Gamification](gamification.md) | XP, levels, streaks, and badges for completed tasks | Core **Daily notes** plugin |
| [Property link](property-link.md) | Two-way links between frontmatter properties | — |
| [Property colors](property-colors.md) | Colored property names | — |
| [Workspace](workspace.md) | Window opacity, focus that moves between panes and into the sidebars, status bar order | — |
| [Hacker mode](hacker-mode.md) | Cosmetic terminal-style effects | — |

## All commands

Every command is available from the command palette, and you can assign hotkeys in **Settings → Hotkeys**.

| Command | Feature |
|---|---|
| `AI: Generate description for current file` | [AI](ai.md) |
| `AI: Translate selected text` | [AI](ai.md) |
| `AI: Translate above cursor text` | [AI](ai.md) |
| `AI: Translate below cursor text` | [AI](ai.md) |
| `AI: Grammar check current line` | [AI](ai.md) |
| `AI: Rewrite (replace selection or whole note)` | [AI](ai.md) |
| `AI: Rewrite (append result at end)` | [AI](ai.md) |
| `AI: Generate git commit summary` | [AI](ai.md) |
| `Bluesky: Post to Bluesky` | [Bluesky](bluesky.md) |
| `Bluesky: Post to daily note timeline` | [Bluesky](bluesky.md) |
| `Daily: Open today's note` | [Daily notes](daily-notes.md) |
| `Daily: Open yesterday's note` | [Daily notes](daily-notes.md) |
| `Daily: Open tomorrow's note` | [Daily notes](daily-notes.md) |
| `Daily: Add task to daily note` | [Daily notes](daily-notes.md) |
| `Daily: Roll over yesterday's undone tasks` | [Daily notes](daily-notes.md) |
| `Daily: Open draft` | [Daily notes](daily-notes.md) |
| `Daily: Post draft to timeline` | [Daily notes](daily-notes.md) |
| `Daily: Post draft to Bluesky` | [Daily notes](daily-notes.md) |
| `Editor: Create new file with timestamp` | [Editor](editor.md) |
| `Editor: Create new file with link at cursor` | [Editor](editor.md) |
| `Editor: Copy file link` | [Editor](editor.md) |
| `Editor: Copy file link with alias` | [Editor](editor.md) |
| `Editor: Wrap selection with subscript` | [Editor](editor.md) |
| `Editor: Wrap selection with superscript` | [Editor](editor.md) |
| `Editor: Increase blockquote level` | [Editor](editor.md) |
| `Editor: Organize file with prefix and tags` | [Editor](editor.md) |
| `Editor: Convert links to relative paths` | [Editor](editor.md) |
| `Editor: Convert active file to bullet list` | [Editor](editor.md) |
| `Editor: Insert OGP link (horizontal)` | [Editor](editor.md) |
| `Editor: Insert OGP link (vertical)` | [Editor](editor.md) |
| `Editor: Move cursor after list marker` | [Editor](editor.md) |
| `Image: Paste multiple images from file system` | [Images](images.md) |
| `Gyazo: Upload clipboard image` | [Gyazo](gyazo.md) |
| `Gyazo: Upload image file` | [Gyazo](gyazo.md) |
| `Gyazo: Replace image URLs in active note` | [Gyazo](gyazo.md) |
| `Gyazo: Replace local images in active note` | [Gyazo](gyazo.md) |
| `Marp: Create slide from current note` | [Marp](marp.md) |
| `Marp: Preview slide` | [Marp](marp.md) |
| `Marp: Export slide (PPTX)` | [Marp](marp.md) |
| `Marp: Export slide (PPTX editable)` | [Marp](marp.md) |
| `Marp: Export slide (HTML)` | [Marp](marp.md) |
| `Marp: Export slide (HTML folder with attachments)` | [Marp](marp.md) |
| `Marp: Export slide (PDF)` | [Marp](marp.md) |
| `Marp: Export presenter notes` | [Marp](marp.md) |
| `Marp: Start server` | [Marp](marp.md) |
| `Marp: Stop server` | [Marp](marp.md) |
| `Marp: Go to next slide` | [Marp](marp.md) |
| `Marp: Go to previous slide` | [Marp](marp.md) |
| `Marp: Move slide down` | [Marp](marp.md) |
| `Marp: Move slide up` | [Marp](marp.md) |
| `Marp: Move images to Marp folder` | [Marp](marp.md) |
| `Marp: Move images and convert links to relative paths` | [Marp](marp.md) |
| `Quartz: Sync` | [Quartz](quartz.md) |
| `Quartz: Open site (<site name>)` | [Quartz](quartz.md) |
| `Quartz: Sync and open site (<site name>)` | [Quartz](quartz.md) |
| `Gamification: Open stats view` | [Gamification](gamification.md) |
| `Property link: Sync current note` | [Property link](property-link.md) |
| `Property link: Sync all notes` | [Property link](property-link.md) |
| `Window: Toggle opacity` | [Workspace](workspace.md) |
| `Focus: Left` | [Workspace](workspace.md) |
| `Focus: Right` | [Workspace](workspace.md) |
| `Hacker mode: Toggle` | [Hacker mode](hacker-mode.md) |
| `Hacker mode: Play boot sequence` | [Hacker mode](hacker-mode.md) |
| `Hacker mode: Preview reward banner` | [Hacker mode](hacker-mode.md) |

## Automatic features

| Feature | Default | Where |
|---|---|---|
| Auto sort tasks in daily notes | Off | [Daily notes](daily-notes.md) |
| Auto link new notes to today's daily note | Off | [Daily notes](daily-notes.md) |
| Newest entries first | Off | [Daily notes](daily-notes.md) |
| Weekday after the daily note title | On | [Daily notes](daily-notes.md) |
| Append Bluesky posts to the timeline | Off | [Bluesky](bluesky.md) |
| Auto bullet | On | [Editor](editor.md) |
| Vim mode reset on pane change | Always (when Vim mode is on) | [Editor](editor.md) |
| WebP conversion on paste or drop | On | [Images](images.md) |
| Property link sync | Off | [Property link](property-link.md) |
| Gamification | Off | [Gamification](gamification.md) |
| Marp slide toolbar | On | [Marp](marp.md) |
| Marp preview/cursor sync | Off | [Marp](marp.md) |
| Hacker mode | Off | [Hacker mode](hacker-mode.md) |

## Settings at a glance

All settings are in **Settings → Crystal**. The tabs at the top of that page are:

- **General**
- **Editor**
- **AI**
- **Bluesky**
- **Daily notes**
- **Gamification**
- **Images**
- **Marp**
- **Quartz**
- **Property link**
- **Property colors**
- **Hacker mode**
- **Status bar**
- **File rules**

Use the search box above the tabs to search across all of them.
