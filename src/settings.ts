import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface CrystalPluginSettings {
	GeminiAPIKey: string;
	dailyNotesFolder: string;
	dailyNoteDateFormat: string;
}

export const DEFAULT_SETTINGS: CrystalPluginSettings = {
	GeminiAPIKey: '',
	dailyNotesFolder: 'DailyNotes',
	dailyNoteDateFormat: 'YYYY-MM-DD'
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

		containerEl.createEl('h2', { text: 'Crystal Plugin Settings' });

		// Gemini settings
		containerEl.createEl('h3', { text: 'Gemini Description Generator' });

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

		// Daily notes settings
		containerEl.createEl('h3', { text: 'Daily Notes' });

		new Setting(containerEl)
			.setName('Daily Notes Folder')
			.setDesc('Folder where daily notes are stored')
			.addText(text => text
				.setPlaceholder('DailyNotes')
				.setValue(this.plugin.settings.dailyNotesFolder)
				.onChange(async (value) => {
					this.plugin.settings.dailyNotesFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Date Format')
			.setDesc('Date format for daily note file names (e.g., YYYY-MM-DD)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dailyNoteDateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dailyNoteDateFormat = value;
					await this.plugin.saveSettings();
				}));
	}
} 