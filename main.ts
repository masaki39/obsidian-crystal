import { Editor, MarkdownView, Plugin } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { GeminiService } from './src/gemini-service';
import { DailyNotesManager } from './src/daily-notes';
import { PCloudService } from './src/pcloud-service';

// Crystal Plugin for Obsidian

export default class CrystalPlugin extends Plugin {
	settings: CrystalPluginSettings;
	private geminiService: GeminiService;
	private dailyNotesManager: DailyNotesManager;
	private pcloudService: PCloudService;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.geminiService = new GeminiService(this.app, this.settings.GeminiAPIKey);
		this.dailyNotesManager = new DailyNotesManager(this.app, this.settings);
		this.pcloudService = new PCloudService(this.app, this.settings.pcloudUsername, this.settings.pcloudPassword, this.settings.pcloudPublicFolderId);

		// AI Description Generation Command
		this.addCommand({
			id: 'crystal-generate-description',
			name: 'Generate Description for Current File',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.geminiService.generateDescriptionForCurrentFile(editor, view);
			}
		});

		// Daily Notes Commands
		this.addCommand({
			id: 'crystal-open-today',
			name: 'Open Today\'s Daily Note',
			callback: () => {
				this.dailyNotesManager.openToday();
			}
		});

		this.addCommand({
			id: 'crystal-open-yesterday',
			name: 'Open Yesterday\'s Daily Note',
			callback: () => {
				this.dailyNotesManager.openYesterday();
			}
		});

		this.addCommand({
			id: 'crystal-open-tomorrow',
			name: 'Open Tomorrow\'s Daily Note',
			callback: () => {
				this.dailyNotesManager.openTomorrow();
			}
		});

		// pCloud Upload Command
		this.addCommand({
			id: 'crystal-upload-clipboard-image',
			name: 'Upload Clipboard Image to pCloud Public Folder',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					await this.pcloudService.uploadClipboardImage(editor);
				} catch (error) {
					console.error('Failed to upload clipboard image:', error);
				}
			}
		});

		this.addSettingTab(new CrystalSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.geminiService.updateSettings(this.settings);
		this.dailyNotesManager.updateSettings(this.settings);
		this.pcloudService.updateCredentials(this.settings.pcloudUsername, this.settings.pcloudPassword, this.settings.pcloudPublicFolderId);
	}
}
