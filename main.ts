import { Editor, MarkdownView, Plugin } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { ServiceManager } from './src/service-manager';
import { FileProcessor } from './src/file-processor';

// Crystal Plugin for Obsidian

export default class CrystalPlugin extends Plugin {
	settings: CrystalPluginSettings;
	private serviceManager: ServiceManager;
	private fileProcessor: FileProcessor;

	async onload() {
		await this.loadSettings();

		// Initialize managers
		this.serviceManager = new ServiceManager();
		this.fileProcessor = new FileProcessor(this.app);
		
		// Initialize Gemini service
		this.serviceManager.updateGeminiService(this.settings);

		// this adds a command that can generate a description for the current file
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
	}
}
