import { Editor, MarkdownView, Plugin, Notice } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { GeminiService } from './src/gemini-service';
import { DailyNotesManager } from './src/daily-notes';
import { PCloudService } from './src/pcloud-service';
import { ImagePasteAndDropHandler } from './src/clipboard-paste-handler';
import { EditorCommands } from './src/editor-commands';
import { QuickAddCommands } from './src/quick-add-commands';

// Crystal Plugin for Obsidian

export default class CrystalPlugin extends Plugin {
	settings: CrystalPluginSettings;
	private geminiService: GeminiService;
	private dailyNotesManager: DailyNotesManager;
	private pcloudService: PCloudService;
	private imagePasteAndDropHandler: ImagePasteAndDropHandler;
	private editorCommands: EditorCommands;
	private quickAddCommands: QuickAddCommands;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.geminiService = new GeminiService(this.app, this.settings.GeminiAPIKey);
		this.dailyNotesManager = new DailyNotesManager(this.app, this.settings);
		this.pcloudService = new PCloudService(this.app, this.settings.pcloudUsername, this.settings.pcloudPassword, this.settings.pcloudPublicFolderId, this.settings.webpQuality);
		this.imagePasteAndDropHandler = new ImagePasteAndDropHandler(this.app, this.settings);
		this.editorCommands = new EditorCommands(this.app, this.settings);
		this.quickAddCommands = new QuickAddCommands(this.app, this.settings);

		// Enable image paste and drop handler if auto paste is enabled
		if (this.settings.autoWebpPaste) {
			this.imagePasteAndDropHandler.enable();
		}

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

		// Editor Commands
		this.addCommand({
			id: 'crystal-create-timestamp-file',
			name: 'Create New File with Timestamp',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.editorCommands.createTimestampFile(editor, view);
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
		this.dailyNotesManager.updateSettings(this.settings);
		this.pcloudService.updateCredentials(this.settings.pcloudUsername, this.settings.pcloudPassword, this.settings.pcloudPublicFolderId, this.settings.webpQuality);
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
