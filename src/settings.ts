import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface CrystalPluginSettings {
	GeminiAPIKey: string;
	dailyNotesFolder: string;
	dailyNoteDateFormat: string;
	dailyNoteAutoSort: boolean;
	dailyNoteAutoLink: boolean;
	dailyNoteAutoLinkExclude: string;
	todoFileName: string;
	inboxName: string;
	webpQuality: number;
	imageResizeScale: number;
	imageMaxSize: number;
	autoWebpPaste: boolean;
	pcloudUsername: string;
	pcloudPassword: string;
	pcloudPublicFolderId: string;
	exportFolderPath: string;
	publishFolderPath: string;
	quartzPath: string;
	quartzSiteName: string;
	githubUserName: string;
	shortcutNames: string;
}

export const DEFAULT_SETTINGS: CrystalPluginSettings = {
	GeminiAPIKey: '',
	dailyNotesFolder: 'DailyNotes',
	dailyNoteDateFormat: 'YYYY-MM-DD',
	dailyNoteAutoSort: true,
	dailyNoteAutoLink: true,
	dailyNoteAutoLinkExclude: '',
	todoFileName: 'ToDo',
	inboxName: 'Inbox',
	webpQuality: 0.8,
	imageResizeScale: 0.8,
	imageMaxSize: 700,
	autoWebpPaste: true,
	pcloudUsername: '',
	pcloudPassword: '',
	pcloudPublicFolderId: '',
	exportFolderPath: '',
	publishFolderPath: 'Publish',
	quartzPath: '',
	quartzSiteName: '',
	githubUserName: '',
	shortcutNames: ''
}

export class CrystalSettingTab extends PluginSettingTab {
	plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> };

	constructor(app: App, plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> }) {
		super(app, plugin);
		this.plugin = plugin;
	}
	
	private textSetting(containerEl: HTMLElement, name: string, desc: string, key: string, value: string) {
		return new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText(text => text
				.setPlaceholder(value)
				.setValue((this.plugin.settings as any)[key])
				.onChange(async (value) => {
					(this.plugin.settings as any)[key] = value;
					await this.plugin.saveSettings();
				}));
	}

	private toggleSetting(containerEl: HTMLElement, name: string, desc: string, key: string) {
		return new Setting(containerEl)
		.setName(name)
		.setDesc(desc)
		.addToggle(toggle => toggle
			.setValue((this.plugin.settings as any)[key])
			.onChange(async (value) => {
				(this.plugin.settings as any)[key] = value;
				await this.plugin.saveSettings();
			}));
	}
	
	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', { text: 'Crystal Plugin Settings' });
		
		// Gemini settings
		containerEl.createEl('h3', { text: 'Gemini Editor Commands' });

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

		this.textSetting(containerEl, 'Daily Notes Folder', 'Folder where daily notes are stored', 'dailyNotesFolder', 'Enter Folder Path');
		this.textSetting(containerEl, 'Date Format', 'Date format for daily note file names (e.g., YYYY-MM-DD)', 'dailyNoteDateFormat', 'YYYY-MM-DD');
		this.toggleSetting(containerEl, 'Auto Sort Tasks', 'Sort tasks in daily notes automatically', 'dailyNoteAutoSort');
		this.toggleSetting(containerEl, 'Auto Link Notes', 'Add link to today\'s daily note when create any note', 'dailyNoteAutoLink');
		new Setting(containerEl)
			.setName('Auto Link Exclude')
			.setDesc('Exclude notes in the following folder paths from auto linking (one per line)')
			.addTextArea(textarea => textarea
				.setPlaceholder('Enter Exclude Folder Paths (one per line)')
				.setValue(this.plugin.settings.dailyNoteAutoLinkExclude)
				.onChange(async (value) => {
					this.plugin.settings.dailyNoteAutoLinkExclude = value;
					await this.plugin.saveSettings();
				}));

		// quick add settings
		containerEl.createEl('h3', { text: 'Quick Add' });

		this.textSetting(containerEl, 'ToDo File Name', 'File name for ToDo list (relative path from Obsidian Vault root)', 'todoFileName', 'Enter ToDo File Name');
		this.textSetting(containerEl, 'Inbox Name', 'Name of the Inbox list', 'inboxName', 'Enter Inbox Name');

		// Image settings
		containerEl.createEl('h3', { text: 'Image Procesor' });

		new Setting(containerEl)
			.setName('Auto Convert Images to WebP on Paste')
			.setDesc('Automatically convert pasted images to WebP format and save to vault')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoWebpPaste)
				.onChange(async (value) => {
					this.plugin.settings.autoWebpPaste = value;
					await this.plugin.saveSettings();
				}));

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

		new Setting(containerEl)
			.setName('Image Default Resize Scale')
			.setDesc('Default scale for resizing images (0.1 = 10%, 1.0 = 100%)')
			.addSlider(slider => slider
				.setLimits(0.1, 1.0, 0.1)
				.setValue(this.plugin.settings.imageResizeScale)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.imageResizeScale = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Image Max Size')
			.setDesc('Maximum size for images (in pixels)')
			.addText(text => text
				.setPlaceholder('1024')
				.setValue(this.plugin.settings.imageMaxSize.toString())
				.onChange(async (value) => {
					this.plugin.settings.imageMaxSize = parseInt(value) || 1024;
					await this.plugin.saveSettings();
				}));				

		// pCloud settings
		containerEl.createEl('h4', { text: 'pCloud Uploader' });

		this.textSetting(containerEl, 'pCloud Username', 'Your pCloud username (email)', 'pcloudUsername', 'Enter pCloud Username');

		new Setting(containerEl)
			.setName('pCloud Password')
			.setDesc('Your pCloud password')
			.addText(text => {
				text.setPlaceholder('Enter pCloud Password')
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

		// Marp settings
		containerEl.createEl('h3', { text: 'Export Folder' });

		this.textSetting(containerEl, 'Export Folder Path', 'Folder where this plugin exports files', 'exportFolderPath', 'Enter Export Folder Path');

		// Quartz settings
		containerEl.createEl('h3', { text: 'Quartz' });

		this.textSetting(containerEl, 'Publish Folder Path', 'Path to Publish Folder (relative path from Obsidian Vault root)', 'publishFolderPath', 'Enter Publish Folder Path');
		this.textSetting(containerEl, 'Quartz Path', 'Path to Quartz (absolute path)', 'quartzPath', 'Enter Quartz Folder Path');
		this.textSetting(containerEl, 'Quartz Site Name', 'Name of the Quartz site', 'quartzSiteName', 'Enter Quartz Site Name');
		this.textSetting(containerEl, 'Github User Name', 'Github user name', 'githubUserName', 'Enter Github User Name');

		// Shortcut settings
		containerEl.createEl('h3', { text: 'Shortcuts' });

		new Setting(containerEl)
			.setName('Shortcut Names')
			.setDesc('Names of the shortcuts (one per line). Restart Obsidian to apply changes.')
			.addTextArea(textarea => textarea
				.setPlaceholder('Enter Shortcut Names (one per line)')
				.setValue(this.plugin.settings.shortcutNames)
				.onChange(async (value) => {
					this.plugin.settings.shortcutNames = value;
					await this.plugin.saveSettings();
				}));
	}
} 