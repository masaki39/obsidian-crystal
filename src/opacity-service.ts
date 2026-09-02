import { Platform, Plugin } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export class OpacityService {
	private plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> };

	constructor(plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> }) {
		this.plugin = plugin;
	}

	/** Opacity to restore when toggling back on from fully opaque. Seeded from
	 * the saved setting, then updated whenever the user picks a value < 1.0. */
	private lastReducedOpacity = 0.9;

	onload() {
		if (this.plugin.settings.windowOpacity < 1.0) {
			this.lastReducedOpacity = this.plugin.settings.windowOpacity;
		}
		this.applyOpacity(this.plugin.settings.windowOpacity);

		this.plugin.addCommand({
			id: 'crystal-toggle-window-opacity',
			name: 'Window: Toggle opacity',
			callback: async () => {
				const next = this.plugin.settings.windowOpacity < 1.0 ? 1.0 : this.lastReducedOpacity;
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
		if (opacity < 1.0) this.lastReducedOpacity = opacity;
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
