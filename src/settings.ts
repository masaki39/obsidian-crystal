import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface CrystalPluginSettings {
	GeminiAPIKey: string;
	dailyNotesFolder: string;
	dailyNoteDateFormat: string;
	pcloudUsername: string;
	pcloudPassword: string;
	pcloudPublicFolderId: string;
	webpQuality: number;
	autoWebpPaste: boolean;
}

export const DEFAULT_SETTINGS: CrystalPluginSettings = {
	GeminiAPIKey: '',
	dailyNotesFolder: 'DailyNotes',
	dailyNoteDateFormat: 'YYYY-MM-DD',
	pcloudUsername: '',
	pcloudPassword: '',
	pcloudPublicFolderId: '',
	webpQuality: 0.8,
	autoWebpPaste: true
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

		containerEl.createEl('h1', { text: 'Crystal Plugin Settings' });

		// Gemini settings
		containerEl.createEl('h3', { text: 'Gemini Description Generator' });

		new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Enter your Gemini API Key')
			.addText(text => {
				text.setPlaceholder('Enter your Gemini API Key')
					.setValue(this.plugin.settings.GeminiAPIKey)
					.onChange(async (value) => {
						this.plugin.settings.GeminiAPIKey = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
				return text;
			});

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

		// pCloud settings
		containerEl.createEl('h3', { text: 'pCloud Uploader' });

		new Setting(containerEl)
			.setName('pCloud Username')
			.setDesc('Your pCloud username (email)')
			.addText(text => text
				.setPlaceholder('Enter your pCloud username')
				.setValue(this.plugin.settings.pcloudUsername)
				.onChange(async (value) => {
					this.plugin.settings.pcloudUsername = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('pCloud Password')
			.setDesc('Your pCloud password')
			.addText(text => {
				text.setPlaceholder('Enter your pCloud password')
					.setValue(this.plugin.settings.pcloudPassword)
					.onChange(async (value) => {
						this.plugin.settings.pcloudPassword = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
				return text;
			});

		new Setting(containerEl)
			.setName('pCloud Public Folder ID')
			.setDesc('Your pCloud Public Folder unique ID (found in Public Folder links)')
			.addText(text => {
				text.setPlaceholder('e.g., lF97wFVWosQpHEoDAbvva0h')
					.setValue(this.plugin.settings.pcloudPublicFolderId)
					.onChange(async (value) => {
						this.plugin.settings.pcloudPublicFolderId = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
				return text;
			});

		new Setting(containerEl)
			.setName('WebP Compression Quality')
			.setDesc('Quality for WebP compression (0.1 = lowest quality/smallest file, 1.0 = highest quality/largest file)')
			.addSlider(slider => slider
				.setLimits(0.1, 1.0, 0.1)
				.setValue(this.plugin.settings.webpQuality)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.webpQuality = value;
					await this.plugin.saveSettings();
				}));

		// Auto WebP Paste settings
		containerEl.createEl('h3', { text: 'Auto WebP Paste' });

		new Setting(containerEl)
			.setName('Auto Convert Images to WebP on Paste')
			.setDesc('Automatically convert pasted images to WebP format and save to vault')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoWebpPaste)
				.onChange(async (value) => {
					this.plugin.settings.autoWebpPaste = value;
					await this.plugin.saveSettings();
				}));


	}
} 