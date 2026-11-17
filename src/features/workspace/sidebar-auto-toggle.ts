import { Notice, type WorkspaceSidedock, type WorkspaceMobileDrawer } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { type SidebarLevel, openSidebars, sidebarLevel } from './sidebar-auto-toggle-logic';

type Sidebar = WorkspaceSidedock | WorkspaceMobileDrawer;

/** Used until a sidebar has been seen open (Obsidian's default sidebar width). */
const FALLBACK_SIDEBAR_WIDTH = 300;

/**
 * Opens and closes the sidebars as the window is resized, so the editor never
 * gets narrower than `sidebarAutoToggleMinEditorWidth`. The sidebar named by
 * `sidebarAutoTogglePriority` opens first.
 *
 * With a minimum of 700px, left priority and 300px sidebars: below 1000px both
 * are closed, from 1000px the left one opens, from 1300px the right one too.
 *
 * It only acts when a threshold is crossed, so opening or closing a sidebar by
 * hand sticks until the window size moves into another range.
 */
export class SidebarAutoToggleService {
	private lastLevel: SidebarLevel | null = null;
	private widths = { left: FALLBACK_SIDEBAR_WIDTH, right: FALLBACK_SIDEBAR_WIDTH };
	/** Pending animation frame; resize events are coalesced to one check per frame. */
	private frame: number | null = null;

	constructor(private plugin: CrystalPluginHost) {}

	onload() {
		const { workspace } = this.plugin.app;
		// Checked every frame while dragging, so sidebars open/close live instead of on release.
		this.plugin.registerDomEvent(window, 'resize', () => this.scheduleEvaluate());
		// Keep the remembered sidebar widths fresh when the user drags a sidebar.
		this.plugin.registerEvent(workspace.on('resize', () => this.rememberWidths()));
		workspace.onLayoutReady(() => this.evaluate(true));

		this.plugin.addCommand({
			id: 'crystal-toggle-sidebar-auto-toggle',
			name: 'Sidebar: Toggle auto open/close',
			icon: 'panel-left-dashed',
			callback: async () => {
				this.plugin.settings.sidebarAutoToggleEnabled = !this.plugin.settings.sidebarAutoToggleEnabled;
				await this.plugin.saveSettings();
			},
		});

		this.plugin.addCommand({
			id: 'crystal-show-sidebar-widths',
			name: 'Sidebar: Show measured widths',
			icon: 'ruler',
			callback: () => this.showWidths(),
		});
	}

	private showWidths() {
		const { leftSplit, rightSplit, rootSplit } = this.plugin.app.workspace;
		const min = this.plugin.settings.sidebarAutoToggleMinEditorWidth;
		const left = this.sidebarWidth('left', leftSplit);
		const right = this.sidebarWidth('right', rightSplit);
		const leftFirst = this.plugin.settings.sidebarAutoTogglePriority === 'left';
		const leftAt = leftFirst ? min + left : min + right + left;
		const rightAt = leftFirst ? min + left + right : min + right;
		new Notice([
			`Editor now: ${widthOf(rootSplit)}px`,
			`Minimum editor: ${min}px`,
			`Left sidebar: ${left}px / Right sidebar: ${right}px`,
			`Left opens at ${leftAt}px, right at ${rightAt}px`,
		].join('\n'), 10000);
	}

	onunload() {
		if (this.frame !== null) window.cancelAnimationFrame(this.frame);
		this.frame = null;
	}

	private scheduleEvaluate() {
		if (this.frame !== null) return;
		this.frame = window.requestAnimationFrame(() => {
			this.frame = null;
			this.evaluate();
		});
	}

	/** Re-apply right away after a settings change (e.g. turning it on). */
	updateSettings() {
		this.lastLevel = null;
		if (this.plugin.app.workspace.layoutReady) this.evaluate(true);
	}

	private rememberWidths() {
		const { leftSplit, rightSplit } = this.plugin.app.workspace;
		this.rememberWidth('left', leftSplit);
		this.rememberWidth('right', rightSplit);
	}

	private rememberWidth(side: 'left' | 'right', split: Sidebar | null) {
		if (!split || split.collapsed) return;
		const width = widthOf(split);
		// Ignore widths caught mid-animation right after expanding.
		if (width >= 100) this.widths[side] = width;
	}

	private sidebarWidth(side: 'left' | 'right', split: Sidebar | null): number {
		this.rememberWidth(side, split);
		if (split?.collapsed) {
			// Obsidian keeps the last size of a collapsed sidedock internally.
			const size = (split as unknown as { size?: number }).size;
			if (typeof size === 'number' && size >= 100) this.widths[side] = size;
		}
		return this.widths[side];
	}

	private evaluate(force = false) {
		if (!this.plugin.settings.sidebarAutoToggleEnabled) {
			this.lastLevel = null;
			return;
		}
		const { workspace } = this.plugin.app;
		const { leftSplit, rightSplit, rootSplit } = workspace;
		if (!leftSplit || !rightSplit || !rootSplit) return;

		const leftWidth = this.sidebarWidth('left', leftSplit);
		const rightWidth = this.sidebarWidth('right', rightSplit);
		// Width shared by the editor and both sidebars, whatever is open now.
		const available = widthOf(rootSplit)
			+ (leftSplit.collapsed ? 0 : widthOf(leftSplit))
			+ (rightSplit.collapsed ? 0 : widthOf(rightSplit));
		if (available <= 0) return;

		const { sidebarAutoToggleMinEditorWidth: min, sidebarAutoTogglePriority: priority } = this.plugin.settings;
		const [firstWidth, secondWidth] = priority === 'left' ? [leftWidth, rightWidth] : [rightWidth, leftWidth];
		const level = sidebarLevel(available, min, firstWidth, secondWidth);
		if (!force && level === this.lastLevel) return;
		this.lastLevel = level;

		const open = openSidebars(level, priority);
		setOpen(leftSplit, open.left);
		setOpen(rightSplit, open.right);
	}
}

function setOpen(split: Sidebar, open: boolean) {
	if (open && split.collapsed) split.expand();
	else if (!open && !split.collapsed) split.collapse();
}

/** `containerEl` exists on every workspace item but isn't in the public typings. */
function widthOf(item: unknown): number {
	return (item as { containerEl?: HTMLElement }).containerEl?.offsetWidth ?? 0;
}
