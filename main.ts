import { Editor, MarkdownView, Plugin } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { GeminiService } from './src/gemini-service';
import { BlueskyService } from './src/bluesky-service';
import { DailyNotesManager } from './src/daily-notes';
import { GyazoService } from './src/gyazo-service';
import { GyazoImageMigrator } from './src/gyazo-image-migrator';
import { GyazoLocalImageMigrator } from './src/gyazo-local-image-migrator';
import { ImagePasteAndDropHandler } from './src/clipboard-paste-handler';
import { EditorCommands } from './src/editor-commands';
import { SettingEdit } from './src/setting-edit';
import { QuickAddCommands } from './src/quick-add-commands';
import { MarpCommands } from './src/marp';
import { TerminalService } from './src/terminal-service';
import { QuartzService } from './src/quartz-service';
import { MacroCommands } from './src/macro';
import { OpacityService } from './src/opacity-service';
import { GitSummaryService } from './src/git-summary-service';

// Crystal Plugin for Obsidian

const SECRET_FIELDS: (keyof CrystalPluginSettings)[] = [
	'GeminiAPIKey',
	'OpenAIAPIKey',
	'blueskyIdentifier',
	'blueskyPassword',
	'gyazoAccessToken',
];

const SECRET_KEY_MAP: Record<keyof CrystalPluginSettings, string> = {
	GeminiAPIKey: 'crystal-gemini-api-key',
	OpenAIAPIKey: 'crystal-openai-api-key',
	blueskyIdentifier: 'crystal-bluesky-identifier',
	blueskyPassword: 'crystal-bluesky-password',
	gyazoAccessToken: 'crystal-gyazo-access-token',
} as any;

function secretKey(field: keyof CrystalPluginSettings): string {
	return SECRET_KEY_MAP[field];
}

export default class CrystalPlugin extends Plugin {
	settings: CrystalPluginSettings;
	private geminiService: GeminiService;
	private blueskyService: BlueskyService;
	private dailyNotesManager: DailyNotesManager;
	private gyazoService: GyazoService;
	private gyazoImageMigrator: GyazoImageMigrator;
	private gyazoLocalImageMigrator: GyazoLocalImageMigrator;
	private imagePasteAndDropHandler: ImagePasteAndDropHandler;
	private editorCommands: EditorCommands;
	private quickAddCommands: QuickAddCommands;
	private marpCommands: MarpCommands;
	private terminalService: TerminalService;
	private quartzService: QuartzService;
	private macroCommands: MacroCommands;
	private settingEdit: SettingEdit;
	private opacityService: OpacityService;
	private gitSummaryService: GitSummaryService;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.geminiService = new GeminiService(this.app, this, this.settings);
		this.dailyNotesManager = new DailyNotesManager(this.app, this.settings, this);
		this.gyazoService = new GyazoService(this.settings);
		this.gyazoImageMigrator = new GyazoImageMigrator(this.gyazoService);
		this.gyazoLocalImageMigrator = new GyazoLocalImageMigrator(this.app, this.gyazoService);
		this.blueskyService = new BlueskyService(this.app, this, this.settings, this.dailyNotesManager, this.gyazoService);
		this.imagePasteAndDropHandler = new ImagePasteAndDropHandler(this.app, this.settings, this);
		this.editorCommands = new EditorCommands(this.app, this.settings, this);
		this.quickAddCommands = new QuickAddCommands(this.app, this.settings);
		this.terminalService = new TerminalService(this.app);
		this.marpCommands = new MarpCommands(this.terminalService, this.settings, this);
		this.quartzService = new QuartzService(this, this.settings, this.terminalService);
		this.macroCommands = new MacroCommands(this.marpCommands, this.editorCommands, this);
		this.settingEdit = new SettingEdit(this.app, this);
		this.opacityService = new OpacityService(this);
		this.gitSummaryService = new GitSummaryService(
			this.app, this, this.settings, this.terminalService, this.geminiService
		);

		// Load Services
		this.blueskyService.onload();
		this.quartzService.onload();
		this.dailyNotesManager.onLoad();
		this.marpCommands.onload();
		this.geminiService.onload();
		this.editorCommands.onload();
		this.macroCommands.onload();
		this.settingEdit.onload();
		this.opacityService.onload();
		this.gitSummaryService.onload();

		// Always enable image paste and drop handler (processing depends on settings)
		this.imagePasteAndDropHandler.enable();
		this.imagePasteAndDropHandler.onload();


		// Gyazo Upload Command
		this.addCommand({
			id: 'crystal-upload-clipboard-image',
			name: 'Gyazo: Upload clipboard image',
			editorCallback: async (editor: Editor) => {
				try {
					await this.gyazoService.uploadClipboardImage(editor);
				} catch (error) {
					console.error('Failed to upload clipboard image:', error);
				}
			}
		});

		// Gyazo File Upload Command
		this.addCommand({
			id: 'crystal-upload-file-image',
			name: 'Gyazo: Upload image file',
			editorCallback: async (editor: Editor) => {
				try {
					await this.gyazoService.promptFileUpload(editor);
				} catch (error) {
					console.error('Failed to upload image file:', error);
				}
			}
		});

		// Replace external image URLs in the active note with Gyazo-hosted copies
		this.addCommand({
			id: 'crystal-replace-image-urls-with-gyazo',
			name: 'Gyazo: Replace image URLs in active note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					await this.gyazoImageMigrator.replaceExternalImagesInActiveNote(editor, view);
				} catch (error) {
					console.error('Failed to replace image URLs with Gyazo:', error);
				}
			}
		});

		// Replace local (vault) image embeds in the active note with Gyazo-hosted copies
		this.addCommand({
			id: 'crystal-replace-local-images-with-gyazo',
			name: 'Gyazo: Replace local images in active note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					await this.gyazoLocalImageMigrator.replaceLocalImagesInActiveNote(editor, view);
				} catch (error) {
					console.error('Failed to replace local images with Gyazo:', error);
				}
			}
		});

		// Quick Add Commands
		this.addCommand({
			id: 'crystal-add-task-to-daily-note',
			name: 'Daily: Add task to daily note',
			callback: () => {
				this.quickAddCommands.addTaskToDailyNote();
			}
		});

		this.addCommand({
			id: 'crystal-add-task-to-todo',
			name: 'Quick add: Add task to todo list',
			callback: () => {
				this.quickAddCommands.addTaskToTodo();
			}
		});

		this.addSettingTab(new CrystalSettingTab(this.app, this));
	}

	onunload() {
		if (this.imagePasteAndDropHandler) {
			this.imagePasteAndDropHandler.disable();
		}
		this.opacityService.onunload();
	}

	async loadSettings() {
		const stored = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);

		// Load secrets from SecretStorage; migrate from old data.json if needed
		for (const field of SECRET_FIELDS) {
			const key = secretKey(field);
			const fromStore = await this.app.secretStorage.getSecret(key);
			if (fromStore !== null) {
				(this.settings as any)[field] = fromStore;
			} else if ((this.settings as any)[field]) {
				// Migrate: move value from data.json into SecretStorage
				await this.app.secretStorage.setSecret(key, (this.settings as any)[field]);
			}
		}

		// Remove secrets from data.json
		const clean: any = Object.assign({}, stored);
		for (const field of SECRET_FIELDS) {
			delete clean[field];
		}
		await this.saveData(clean);
	}

	async saveSettings() {
		// Save non-secret settings to data.json
		const clean: any = Object.assign({}, this.settings);
		for (const field of SECRET_FIELDS) {
			delete clean[field];
		}
		await this.saveData(clean);

		// Save secrets to SecretStorage
		for (const field of SECRET_FIELDS) {
			const value = (this.settings as any)[field] as string;
			this.app.secretStorage.setSecret(secretKey(field), value ?? '');
		}

		this.geminiService.updateSettings(this.settings);
		await this.blueskyService.updateSettings(this.settings);
		this.dailyNotesManager.updateSettings(this.settings);
		this.imagePasteAndDropHandler.updateSettings(this.settings);
		this.editorCommands.updateSettings(this.settings);
		this.quickAddCommands.updateSettings(this.settings);
		this.gyazoService.updateSettings(this.settings);
		this.marpCommands.updateSettings(this.settings);
		this.quartzService.updateSettings(this.settings);
		this.gitSummaryService.updateSettings(this.settings);
	}

}
