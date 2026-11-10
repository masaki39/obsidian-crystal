**English** | [日本語](../ja/hacker-mode.md)

# Hacker mode

A purely cosmetic layer of terminal-style effects over your theme: CRT scanlines, a phosphor glow, typing particles, a boot sequence, a status bar HUD, and more. It never changes your notes.

[← Back to the documentation index](README.md)

## Requirements

- None. Every effect runs locally.

## Quick setup

1. Run **Hacker mode: Toggle**, or turn on **Enable hacker mode** in **Settings → Crystal → Hacker mode**.
2. Pick an **Accent color**.
3. Turn off any effects you don't want.

## Commands

| Command | What it does |
|---|---|
| `Hacker mode: Toggle` | Turns hacker mode on or off. |
| `Hacker mode: Play boot sequence` | Plays the boot animation now. |
| `Hacker mode: Preview reward banner` | Shows a sample reward banner. |

## Settings

**Settings → Crystal → Hacker mode**

| Setting | Default | Description |
|---|---|---|
| **Enable hacker mode** | Off | Turns all the effects below on or off together. |
| **Accent color** | `#00ff9c` | The color every effect uses. |
| **CRT overlay** | On | Scanlines, a vignette, and a faint flicker over the whole window. |
| **Phosphor glow** | On | An accent-colored caret and a soft glow on editor text. |
| **Typing particles** | On | A few faint 0/1 glyphs at the caret on each keystroke, with a combo counter. |
| **Boot sequence** | On | A fake boot log on startup and when hacker mode is turned on. Press any key to skip it. |
| **Status bar HUD** | On | A clock, the JS heap size, and your typing speed (WPM) with a sparkline. |
| **Background rain** | Off | Faint digital rain over the whole window, all the time. |
| **Title decode** | On | Note titles resolve from random glyphs when a note opens. |
| **Reward banner** | On | [Gamification](gamification.md) rewards also show an "ACCESS GRANTED" banner or a terminal line. |
| **Background rain opacity** | 0.15 | How visible the background rain is, from 0.05 to 0.5. |
| **Preview** | — | **Boot sequence** and **Reward banner** buttons try the effects out right away. |

## Examples

The boot log is built from your vault (version, note count, size, plugin count), for example:

```text
CRYSTAL BIOS v0.23.0 — obsidian api 1.10.0
mount /vault/MyVault                 OK
index 1284 notes (12.3 MB)           OK
load modules: 42 plugins             OK
bypass firewall                      WARN
```

## Notes and troubleshooting

- **It's slow on my machine**: turn off **Background rain** and **CRT overlay** first. They cover the whole window.
- Effects respect the accent color only. Your theme's other colors stay as they are.
