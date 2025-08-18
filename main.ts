import { Editor, MarkdownView, Plugin, Notice } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { GeminiService } from './src/gemini-service';
import { BlueskyService } from './src/bluesky-service';
import { DailyNotesManager } from './src/daily-notes';
import { PCloudService } from './src/pcloud-service';
import { ImagePasteAndDropHandler } from './src/clipboard-paste-handler';
import { EditorCommands } from './src/editor-commands';
import { QuickAddCommands } from './src/quick-add-commands';
import { MarpCommands } from './src/marp';
import { AnkiService } from './src/anki-service';
import { TerminalService } from './src/terminal-service';
import { QuartzService } from './src/quartz-service';
import { ShortcutService } from './src/shorcut-service';
import { ClaudeService } from './src/claude-service';
import { TabSwitcherService } from './src/tab-switcher';

// Crystal Plugin for Obsidian

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
	private claudeService: ClaudeService;
	private tabSwitcherService: TabSwitcherService;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.geminiService = new GeminiService(this.app, this, this.settings.GeminiAPIKey);
		this.blueskyService = new BlueskyService(this.app, this, this.settings.blueskyIdentifier, this.settings.blueskyPassword);
		this.dailyNotesManager = new DailyNotesManager(this.app, this.settings, this);
		this.pcloudService = new PCloudService(this.app, this.settings);
		this.imagePasteAndDropHandler = new ImagePasteAndDropHandler(this.app, this.settings);
		this.editorCommands = new EditorCommands(this.app, this.settings, this);
		this.quickAddCommands = new QuickAddCommands(this.app, this.settings);
		this.ankiService = new AnkiService(this.app);
		this.terminalService = new TerminalService(this.app);
		this.marpCommands = new MarpCommands(this.terminalService, this.settings, this);
		this.quartzService = new QuartzService(this, this.settings, this.terminalService);
		this.shortcutService = new ShortcutService(this.terminalService, this.settings, this);
		this.claudeService = new ClaudeService(this.app, this);
		this.tabSwitcherService = new TabSwitcherService(this.app, this);

		// Load Services
		this.blueskyService.onload();
		this.quartzService.onload();
		this.dailyNotesManager.onLoad();
		this.shortcutService.onLoad();
		this.marpCommands.onload();
		this.claudeService.onload();
		this.geminiService.onload();
		this.tabSwitcherService.onload();
		this.editorCommands.onload();

		// Always enable image paste and drop handler (processing depends on settings)
		this.imagePasteAndDropHandler.enable();


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

		this.addCommand({
			id: 'crystal-insert-moc',
			name: 'Insert MOC',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.quickAddCommands.insertMOC(editor, view);
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
		// Disable image paste and drop handler
		if (this.imagePasteAndDropHandler) {
			this.imagePasteAndDropHandler.disable();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.geminiService.updateSettings(this.settings);
		this.blueskyService.updateCredentials(this.settings.blueskyIdentifier, this.settings.blueskyPassword);
		this.dailyNotesManager.updateSettings(this.settings);
		this.imagePasteAndDropHandler.updateSettings(this.settings);
		this.editorCommands.updateSettings(this.settings);
		this.quickAddCommands.updateSettings(this.settings);
		
		// Handler is always enabled, processing behavior depends on autoWebpPaste setting
		// No need to enable/disable the handler itself
	}
}
