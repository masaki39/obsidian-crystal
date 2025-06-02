import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface CrystalPluginSettings {
	GeminiAPIKey: string;
}

export const DEFAULT_SETTINGS: CrystalPluginSettings = {
	GeminiAPIKey: ''
}

export class CrystalSettingTab extends PluginSettingTab {
	plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> };

	constructor(app: App, plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> }) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Crystal - Gemini Description Generator Settings' });

		new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Enter your Gemini API Key')
			.addText(text => text
				.setPlaceholder('Enter your Gemini API Key')
				.setValue(this.plugin.settings.GeminiAPIKey)
				.onChange(async (value) => {
					this.plugin.settings.GeminiAPIKey = value;
					await this.plugin.saveSettings();
				}));
	}
} 