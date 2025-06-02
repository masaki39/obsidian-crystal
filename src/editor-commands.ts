import { App, Editor, MarkdownView, Notice } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export class EditorCommands {
	private app: App;
	private settings: CrystalPluginSettings;

	constructor(app: App, settings: CrystalPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	/**
	 * Create a new file with timestamp filename
	 */
	async createTimestampFile(editor: Editor, view: MarkdownView) {
		const basefilename = this.generateTimestampFilename();
		try {
			const newFile = await this.app.vault.create(basefilename + '.md', '');
			await this.app.workspace.getLeaf().openFile(newFile);
		} catch (error) {
			new Notice('Failed to create new file: ' + error.message);
		}
	}

	/**
	 * Create a new file with link at cursor position
	 */
	async createLinkedTimestampFile(editor: Editor, view: MarkdownView) {
		const basefilename = this.generateTimestampFilename();
		try {
			// Insert link at cursor position
			editor.replaceSelection(`[[${basefilename}]] `);
			
			// Create new file
			const newFile = await this.app.vault.create(basefilename + '.md', '');
			await this.app.workspace.getLeaf().openFile(newFile);
		} catch (error) {
			new Notice('Failed to create linked file: ' + error.message);
		}
	}

	/**
	 * Copy current file link to clipboard
	 */
	async copyFileLink(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('No file is currently open');
			return;
		}
		
		const fileLink = `[[${view.file.basename}]]`;
		await navigator.clipboard.writeText(fileLink);
		new Notice('File link is copied!');
	}

	/**
	 * Copy current file link with alias to clipboard
	 */
	async copyFileLinkWithAlias(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('No file is currently open');
			return;
		}
		
		const fileCache = this.app.metadataCache.getFileCache(view.file);
		const aliases = fileCache?.frontmatter?.aliases;
		
		if (!aliases || !Array.isArray(aliases) || aliases.length === 0) {
			new Notice('No aliases found in frontmatter');
			return;
		}
		
		const fileLink = `[[${view.file.basename}|${aliases[0]}]]`;
		await navigator.clipboard.writeText(fileLink);
		new Notice('File link with alias is copied!');
	}

	/**
	 * Wrap selection with subscript tag or unwrap if already wrapped
	 */
	wrapWithSubscript(editor: Editor, view: MarkdownView) {
		this.wrapSelection('sub', editor);
	}

	/**
	 * Wrap selection with superscript tag or unwrap if already wrapped
	 */
	wrapWithSuperscript(editor: Editor, view: MarkdownView) {
		this.wrapSelection('sup', editor);
	}

	/**
	 * Wrap selected text with HTML tag or unwrap if already wrapped
	 */
	private wrapSelection(tag: string, editor: Editor) {
		const selection = editor.getSelection();
		const regex = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 'g');
		
		// Check if selection contains the tag
		if (regex.test(selection)) {
			// Already contains tag, remove all instances of the tag
			const unwrappedSelection = selection.replace(regex, '$1');
			editor.replaceSelection(unwrappedSelection);
		} else {
			// Not wrapped, wrap it
			const wrappedSelection = `<${tag}>${selection}</${tag}>`;
			editor.replaceSelection(wrappedSelection);
		}
	}

	/**
	 * Generate timestamp filename in YYYYMMDDHHmmss format
	 */
	private generateTimestampFilename(): string {
		const now = new Date();
		const year = now.getFullYear().toString();
		const month = (now.getMonth() + 1).toString().padStart(2, '0');
		const day = now.getDate().toString().padStart(2, '0');
		const hour = now.getHours().toString().padStart(2, '0');
		const minute = now.getMinutes().toString().padStart(2, '0');
		const second = now.getSeconds().toString().padStart(2, '0');
		
		return `${year}${month}${day}${hour}${minute}${second}`;
	}
} 