import { Platform, Plugin } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export class OpacityService {
	private plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> };

	constructor(plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> }) {
		this.plugin = plugin;
	}

	onload() {
		this.applyOpacity(this.plugin.settings.windowOpacity);

		this.plugin.addCommand({
			id: 'crystal-toggle-window-opacity',
			name: 'Toggle window opacity',
			callback: async () => {
				const next = this.plugin.settings.windowOpacity < 1.0 ? 1.0 : 0.95;
				this.plugin.settings.windowOpacity = next;
				await this.plugin.saveSettings();
				this.applyOpacity(next);
			},
		});
	}

	onunload() {
		this.applyOpacity(1.0);
	}

	applyOpacity(opacity: number) {
		if (!Platform.isDesktop) return;
		try {
			const electron = (window as any).require?.('electron');
			const win = electron?.remote?.getCurrentWindow?.();
			win?.setOpacity(opacity);
		} catch (e) {
			console.warn('Crystal: Failed to set window opacity', e);
		}
	}
}
