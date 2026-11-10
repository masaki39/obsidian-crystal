**English** | [日本語](../ja/property-colors.md)

# Property colors

Give property names their own text color in the Properties editor, so the important ones are easy to spot. This only changes how property names look; your notes aren't modified.

[← Back to the documentation index](README.md)

## Requirements

- None.

## Quick setup

1. Open **Settings → Crystal → Property colors**.
2. Select **Add rule**, type `status`, and pick a swatch.
3. Open a note that has a `status` property. Its name is now shown in that color.

## Commands

This feature has no commands. It's configured entirely in settings.

## Settings

**Settings → Crystal → Property colors**

| Setting | Default | Description |
|---|---|---|
| **Color palette** | Tokyo Night | Swatches offered for quick selection: Tokyo Night, Catppuccin Mocha, Nord, Dracula, or Gruvbox. Changing the palette doesn't change colors you already picked. The color picker next to the swatches accepts any color. |
| **All properties** | (theme color) | Color for every property name that doesn't have its own rule. Reset it to go back to the theme's color. |
| **Rule *n*** | — | One or more property names, separated by commas, and a color. The name field suggests property names from your vault and previews them in the chosen color. |
| **Add rule** | — | Adds a new rule. |

## Examples

| Rule | Effect |
|---|---|
| `status` → red | `status` is shown in red. |
| `status, priority` → orange | Both are shown in orange. |
| **All properties** → gray, and `tags` → blue | `tags` is blue, and every other property name is gray. |

## Notes and troubleshooting

- **Names aren't case-sensitive.** `Status` and `status` match the same rule.
- **If a name appears in more than one rule, the lower rule wins.**
- Only the property *name* is colored. Values keep the theme's style.
