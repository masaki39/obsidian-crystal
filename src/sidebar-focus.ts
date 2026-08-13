import { App, Plugin, WorkspaceLeaf, WorkspaceParent } from 'obsidian';

type Direction = 'left' | 'right';

const CORE_FOCUS_COMMAND: Record<Direction, string> = {
	left: 'editor:focus-left',
	right: 'editor:focus-right',
};

/**
 * Obsidian's core "Focus on pane to the left/right" commands (editor:focus-left
 * / editor:focus-right) only move between panes inside the main editor area —
 * the left/right sidebars are never a reachable target, and there's no way
 * back either. These commands wrap the core ones so left/right focus feels
 * like a single continuous chain instead of two separate concepts:
 *
 * - In the main area, defer to the core command first. If it didn't actually
 *   move focus (i.e. we're already at the outer edge), continue on into the
 *   matching sidebar.
 * - In a sidebar, focus toward the main area moves back into it; focus away
 *   from the main area (further out than the sidebar) is a no-op.
 */
export class SidebarFocusCommands {
	constructor(private app: App, private plugin: Plugin) {}

	private async focusDirection(direction: Direction) {
		const { workspace } = this.app;
		const leaf = workspace.activeLeaf;
		const root = leaf?.getRoot();
		const inLeftSidebar = !!root && root === workspace.leftSplit;
		const inRightSidebar = !!root && root === workspace.rightSplit;

		if (inLeftSidebar || inRightSidebar) {
			const backToMain = (inLeftSidebar && direction === 'right') || (inRightSidebar && direction === 'left');
			if (backToMain) {
				await this.focusRoot(workspace.rootSplit);
			}
			// Otherwise there's nothing further out than the sidebar; no-op.
			return;
		}

		// In the main area: let the core command try first.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this.app as any).commands.executeCommandById(CORE_FOCUS_COMMAND[direction]);
		if (workspace.activeLeaf && workspace.activeLeaf !== leaf) return;

		// Focus didn't move: we're at the outer edge. Continue into the sidebar.
		const sidebar = direction === 'left' ? workspace.leftSplit : workspace.rightSplit;
		await this.focusRoot(sidebar);
	}

	private async focusRoot(root: WorkspaceParent | undefined) {
		if (!root) return;
		const { workspace } = this.app;
		const leaf: WorkspaceLeaf | null = workspace.getMostRecentLeaf(root);
		if (!leaf) return;
		await workspace.revealLeaf(leaf);
		workspace.setActiveLeaf(leaf, { focus: true });
	}

	onload() {
		this.plugin.addCommand({
			id: 'crystal-focus-left',
			name: 'Focus: Left',
			icon: 'panel-left',
			callback: () => this.focusDirection('left'),
		});

		this.plugin.addCommand({
			id: 'crystal-focus-right',
			name: 'Focus: Right',
			icon: 'panel-right',
			callback: () => this.focusDirection('right'),
		});
	}
}
