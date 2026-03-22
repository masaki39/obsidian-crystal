import { Editor, Plugin } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { GeminiService } from './src/gemini-service';
import { BlueskyService } from './src/bluesky-service';
import { DailyNotesManager } from './src/daily-notes';
import { PCloudService } from './src/pcloud-service';
import { ImagePasteAndDropHandler } from './src/clipboard-paste-handler';
import { EditorCommands } from './src/editor-commands';
import { SettingEdit } from './src/setting-edit';
import { QuickAddCommands } from './src/quick-add-commands';
import { MarpCommands } from './src/marp';
import { AnkiService } from './src/anki-service';
import { TerminalService } from './src/terminal-service';
import { QuartzService } from './src/quartz-service';
import { ShortcutService } from './src/shorcut-service';
import { MacroCommands } from './src/macro';
import { PdfHandler } from './src/pdf-handler';
import { OpacityService } from './src/opacity-service';
import { GitSummaryService } from './src/git-summary-service';

// Crystal Plugin for Obsidian

const SECRET_FIELDS: (keyof CrystalPluginSettings)[] = [
	'GeminiAPIKey',
	'blueskyIdentifier',
	'blueskyPassword',
	'pcloudUsername',
	'pcloudPassword',
	'pcloudPublicFolderId',
];

const SECRET_KEY_MAP: Record<keyof CrystalPluginSettings, string> = {
	GeminiAPIKey: 'crystal-gemini-api-key',
	blueskyIdentifier: 'crystal-bluesky-identifier',
	blueskyPassword: 'crystal-bluesky-password',
	pcloudUsername: 'crystal-pcloud-username',
	pcloudPassword: 'crystal-pcloud-password',
	pcloudPublicFolderId: 'crystal-pcloud-public-folder-id',
} as any;

function secretKey(field: keyof CrystalPluginSettings): string {
	return SECRET_KEY_MAP[field];
}

export default class CrystalPlugin extends Plugin {
	settings: CrystalPluginSettings;
	private geminiService: GeminiService;
	private blueskyService: BlueskyService;
	private dailyNotesManager: DailyNotesManager;
	private pcloudService: PCloudService;
	private imagePasteAndDropHandler: ImagePasteAndDropHandler;
	private editorCommands: EditorCommands;
	private quickAddCommands: QuickAddCommands;
	private marpCommands: MarpCommands;
	private ankiService: AnkiService;
	private terminalService: TerminalService;
	private quartzService: QuartzService;
	private shortcutService: ShortcutService;
	private macroCommands: MacroCommands;
	private pdfHandler: PdfHandler;
	private settingEdit: SettingEdit;
	private opacityService: OpacityService;
	private gitSummaryService: GitSummaryService;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.geminiService = new GeminiService(this.app, this, this.settings);
		this.dailyNotesManager = new DailyNotesManager(this.app, this.settings, this);
		this.blueskyService = new BlueskyService(this.app, this, this.settings, this.dailyNotesManager);
		this.pcloudService = new PCloudService(this.app, this.settings);
		this.imagePasteAndDropHandler = new ImagePasteAndDropHandler(this.app, this.settings, this);
		this.editorCommands = new EditorCommands(this.app, this.settings, this);
		this.quickAddCommands = new QuickAddCommands(this.app, this.settings);
		this.ankiService = new AnkiService(this.app);
		this.terminalService = new TerminalService(this.app);
		this.marpCommands = new MarpCommands(this.terminalService, this.settings, this);
		this.quartzService = new QuartzService(this, this.settings, this.terminalService);
		this.shortcutService = new ShortcutService(this.terminalService, this.settings, this);
		this.macroCommands = new MacroCommands(this.marpCommands, this.editorCommands, this);
		this.pdfHandler = new PdfHandler(this.app, this.terminalService, this.settings, this);
		this.settingEdit = new SettingEdit(this.app, this);
		this.opacityService = new OpacityService(this);
		this.gitSummaryService = new GitSummaryService(
			this.app, this, this.settings, this.terminalService, this.geminiService
		);

		// Load Services
		this.blueskyService.onload();
		this.quartzService.onload();
		this.dailyNotesManager.onLoad();
		this.shortcutService.onLoad();
		this.marpCommands.onload();
		this.geminiService.onload();
		this.editorCommands.onload();
		this.macroCommands.onload();
		this.pdfHandler.onload();
		this.settingEdit.onload();
		this.opacityService.onload();
		this.gitSummaryService.onload();

		// Always enable image paste and drop handler (processing depends on settings)
		this.imagePasteAndDropHandler.enable();
		this.imagePasteAndDropHandler.onload();


		// pCloud Upload Command
		this.addCommand({
			id: 'crystal-upload-clipboard-image',
			name: 'Upload Clipboard Image to pCloud Public Folder',
			editorCallback: async (editor: Editor) => {
				try {
					await this.pcloudService.uploadClipboardImage(editor);
				} catch (error) {
					console.error('Failed to upload clipboard image:', error);
				}
			}
		});

		// pCloud File Upload Command
		this.addCommand({
			id: 'crystal-upload-file-image',
			name: 'Upload Image File to pCloud Public Folder',
			editorCallback: async (editor: Editor) => {
				try {
					await this.pcloudService.promptFileUpload(editor);
				} catch (error) {
					console.error('Failed to upload image file:', error);
				}
			}
		});

		// Quick Add Commands
		this.addCommand({
			id: 'crystal-add-task-to-daily-note',
			name: 'Add Task to Daily Note',
			callback: () => {
				this.quickAddCommands.addTaskToDailyNote();
			}
		});

		this.addCommand({
			id: 'crystal-add-task-to-todo',
			name: 'Add Task to ToDo List',
			callback: () => {
				this.quickAddCommands.addTaskToTodo();
			}
		});

		// Anki Commands
		this.addCommand({
			id: 'crystal-add-note-to-anki',
			name: 'Add Note to Anki',
			callback: () => {
				this.ankiService.addNoteFromPrompt();
			}
		});

		// Anki Commands assisted by Gemini
		this.addCommand({
			id: 'crystal-add-note-to-anki-gemini-assist',
			name: 'Add Note to Anki Assisted by Gemini',
			callback: () => {
				this.geminiService.addNoteToAnki();
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
			const fromStore = this.app.secretStorage.getSecret(key);
			if (fromStore !== null) {
				(this.settings as any)[field] = fromStore;
			} else if ((this.settings as any)[field]) {
				// Migrate: move value from data.json into SecretStorage
				this.app.secretStorage.setSecret(key, (this.settings as any)[field]);
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
	}

}
