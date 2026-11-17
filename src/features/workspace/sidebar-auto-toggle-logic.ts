/** How many sidebars should be open: 0 = none, 1 = the priority one, 2 = both. */
export type SidebarLevel = 0 | 1 | 2;

/** Which sidebar opens first. */
export type SidebarPriority = 'left' | 'right';

/**
 * Decide how many sidebars fit next to an editor that must stay at least
 * `minEditorWidth` wide. `available` is the width shared by the editor and
 * both sidebars (independent of whether the sidebars are currently open).
 *
 * The `first` sidebar (the priority one) opens first; the other only once
 * both fit.
 */
export function sidebarLevel(available: number, minEditorWidth: number, firstWidth: number, secondWidth: number): SidebarLevel {
	if (available >= minEditorWidth + firstWidth + secondWidth) return 2;
	if (available >= minEditorWidth + firstWidth) return 1;
	return 0;
}

/** Which sidebars are open at `level` with the given priority. */
export function openSidebars(level: SidebarLevel, priority: SidebarPriority): { left: boolean; right: boolean } {
	const first = level >= 1;
	const second = level >= 2;
	return priority === 'left' ? { left: first, right: second } : { left: second, right: first };
}
