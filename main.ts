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

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.geminiService = new GeminiService(this.app, this, this.settings.GeminiAPIKey);
		this.blueskyService = new BlueskyService(this.app, this, this.settings.blueskyIdentifier, this.settings.blueskyPassword);
		this.dailyNotesManager = new DailyNotesManager(this.app, this.settings, this);
		this.pcloudService = new PCloudService(this.app, this.settings);
		this.imagePasteAndDropHandler = new ImagePasteAndDropHandler(this.app, this.settings);
		this.editorCommands = new EditorCommands(this.app, this.settings);
		this.quickAddCommands = new QuickAddCommands(this.app, this.settings);
		this.marpCommands = new MarpCommands(this.app, this.editorCommands, this.settings, this);
		this.ankiService = new AnkiService(this.app);
		this.terminalService = new TerminalService();
		this.quartzService = new QuartzService(this.app, this, this.settings, this.terminalService);
		this.shortcutService = new ShortcutService(this.terminalService, this.settings, this);
		this.claudeService = new ClaudeService(this.app, this);

		// Load Services
		this.blueskyService.onload();
		this.quartzService.onload();
		this.dailyNotesManager.onLoad();
		this.shortcutService.onLoad();
		this.marpCommands.onload();
		this.claudeService.onload();
		this.geminiService.onload();

		// Enable image paste and drop handler if auto paste is enabled
		if (this.settings.autoWebpPaste) {
			this.imagePasteAndDropHandler.enable();
		}

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

		// pCloud File Upload Command
		this.addCommand({
			id: 'crystal-upload-file-image',
			name: 'Upload Image File to pCloud Public Folder',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					await this.pcloudService.promptFileUpload(editor);
				} catch (error) {
					console.error('Failed to upload image file:', error);
				}
			}
		});

		// Editor Commands
		this.addCommand({
			id: 'crystal-create-timestamp-file',
			name: 'Create New File with Timestamp',
			callback: () => {
				this.editorCommands.createTimestampFile();
			}
		});

		this.addCommand({
			id: 'crystal-create-linked-timestamp-file',
			name: 'Create New File with Link at Cursor',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.editorCommands.createLinkedTimestampFile(editor, view);
			}
		});

		this.addCommand({
			id: 'crystal-copy-file-link',
			name: 'Copy File Link to Clipboard',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.editorCommands.copyFileLink(editor, view);
			}
		});

		this.addCommand({
			id: 'crystal-copy-file-link-with-alias',
			name: 'Copy File Link with Alias to Clipboard',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.editorCommands.copyFileLinkWithAlias(editor, view);
			}
		});

		this.addCommand({
			id: 'crystal-wrap-subscript',
			name: 'Wrap Selection with Subscript',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.editorCommands.wrapWithSubscript(editor, view);
			}
		});

		this.addCommand({
			id: 'crystal-wrap-superscript',
			name: 'Wrap Selection with Superscript',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.editorCommands.wrapWithSuperscript(editor, view);
			}
		});

		this.addCommand({
			id: 'crystal-organize-file-with-tags',
			name: 'Organize File with Prefix and Tags',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.editorCommands.organizeFileWithTags(editor, view);
			}
		});

		// Convert Links Command
		this.addCommand({
			id: 'crystal-convert-links-to-relative-paths',
			name: 'Convert Links to Relative Paths',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.editorCommands.convertLinksToRelativePaths(editor, view);
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
		
		// Toggle image paste and drop handler based on settings
		if (this.settings.autoWebpPaste) {
			this.imagePasteAndDropHandler.enable();
		} else {
			this.imagePasteAndDropHandler.disable();
		}
	}
}
