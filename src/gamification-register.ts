import type { App, Plugin } from 'obsidian';
import { type GamificationSnapshot, VIEW_TYPE_GAMIFICATION } from './gamification';
import { GamificationView } from './gamification-view';

export async function activateGamificationView(app: App) {
	const { workspace } = app;
	let leaf = workspace.getLeavesOfType(VIEW_TYPE_GAMIFICATION)[0];
	if (!leaf) {
		leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
		await leaf.setViewState({ type: VIEW_TYPE_GAMIFICATION, active: true });
	}
	workspace.revealLeaf(leaf);
}

/** Gamification view (sidebar): full Lv/XP/streak/badge picture. */
export function registerGamificationView(plugin: Plugin, getSnapshot: () => GamificationSnapshot) {
	plugin.registerView(
		VIEW_TYPE_GAMIFICATION,
		(leaf) => new GamificationView(leaf, getSnapshot)
	);
	plugin.addRibbonIcon('gamepad-2', 'Crystal: Gamification stats', () => activateGamificationView(plugin.app));
	plugin.addCommand({
		id: 'crystal-open-gamification-view',
		name: 'Gamification: Open stats view',
		icon: 'gamepad-2',
		callback: () => activateGamificationView(plugin.app),
	});
}
