**English** | [日本語](../ja/gamification.md)

# Gamification

Earn XP for the tasks you check off in daily notes. You can level up, keep a streak going, and unlock badges. It's off by default and runs entirely on your machine.

[← Back to the documentation index](README.md)

## Requirements

- The core **Daily notes** plugin. Completed tasks (`- [x]`) in daily notes are what count.
- Optional: [Better Word Count](https://github.com/lukeleppan/better-word-count) with **Collect Stats** turned on, for the daily writing goal.

## Quick setup

1. Turn on **Enable Gamification** in **Settings → Crystal → Gamification**.
2. Check off a task in today's daily note.
3. Select the gamepad ribbon icon, or the status bar item, or run **Gamification: Open stats view**.

## Commands

| Command | What it does |
|---|---|
| `Gamification: Open stats view` | Opens the stats view in the sidebar. |

The stats view shows:

- your level and XP bar, and how far it is to the next badge
- today's task and writing progress
- XP for the last 7 days, with markers for days you met the writing goal
- a 30-day activity grid
- lifetime totals and personal bests: longest streak, most tasks in a day, best week's XP, most characters in a day
- every badge, unlocked or not

This runs automatically while the feature is enabled:

- Completing tasks updates XP, level, streak, and badges, and the status bar shows a short summary.

## Settings

**Settings → Crystal → Gamification**

| Setting | Default | Description |
|---|---|---|
| **Enable Gamification** | Off | Turns the whole feature on. |
| **Rest day** | None | A weekly day off. Missing tasks on that day never breaks your streak and doesn't use a freeze token. It applies from now on. |
| **Daily writing goal (characters)** | 1000 | Shown only when Better Word Count's stats are available. Reaching it earns XP and counts as an active day. Set it to 0 to turn it off. |
| **Reset progress** | — | Deletes level, XP, streak, freeze tokens, badges, and history after you confirm. This can't be undone. |

## Examples

How XP is awarded:

| Event | XP |
|---|---|
| Completed task: normal (82%) | 10 |
| Completed task: bonus (15%) | 20 |
| Completed task: rare (3%) | 50 |
| Writing goal reached | rolled the same way as a task |
| Passing 25 / 50 / 75% of the writing goal | 5, with a 40% chance at each point |

- **Levels**: going from level *n* to *n* + 1 takes *n* × 100 XP.
- **Streak**: a day counts as active if you complete a task **or** reach the writing goal.
- **Freeze tokens** fill a missed day automatically:
  - You get 2 per month.
  - You get bonus tokens when your streak reaches 30, 100, and 365 days.

Badges include:

- **Level badges**: Rookie, Adept, Veteran, Master, Legend
- **Streak badges**: Firestarter, Week Streak, Habit Master, Centurion
- **Writing badges**: Scribe, Wordsmith, Novelist, Chronicler
- a couple of hidden ones

## Notes and troubleshooting

- **Nothing happens when I check a task**: make sure **Enable Gamification** is on and the note is a daily note from the core **Daily notes** plugin.
- **No writing goal setting**: install Better Word Count and turn on **Collect Stats**. The setting appears once `.obsidian/vault-stats.json` exists.
- The ribbon icon is always shown, even when the feature is off.
- With [Hacker mode](hacker-mode.md) on, rewards can also show an "ACCESS GRANTED" banner.
