import { Editor, MarkdownView, Plugin } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { ServiceManager } from './src/service-manager';
import { FileProcessor } from './src/file-processor';
import { DailyNotesManager } from './src/daily-notes';

// Crystal Plugin for Obsidian

export default class CrystalPlugin extends Plugin {
	settings: CrystalPluginSettings;
	private serviceManager: ServiceManager;
	private fileProcessor: FileProcessor;
	private dailyNotesManager: DailyNotesManager;

	async onload() {
		await this.loadSettings();

		// Initialize managers
		this.serviceManager = new ServiceManager();
		this.fileProcessor = new FileProcessor(this.app);
		this.dailyNotesManager = new DailyNotesManager(this.app, this.settings);
		
		// Initialize Gemini service
		this.serviceManager.updateGeminiService(this.settings);

		// AI Description Generation Command
		this.addCommand({
			id: 'crystal-generate-description',
			name: 'Generate Description for Current File',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.fileProcessor.generateDescription(
					editor, 
					view, 
					this.serviceManager.getGeminiService()
				);
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

		this.addSettingTab(new CrystalSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.serviceManager.updateGeminiService(this.settings);
		this.dailyNotesManager.updateSettings(this.settings);
	}
}
