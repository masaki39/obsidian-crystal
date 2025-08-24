import { App, Editor, MarkdownView, Notice, SuggestModal, Plugin } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import * as path from 'path';

// タグ選択のためのSuggestModal
class TagSuggestModal extends SuggestModal<string> {
	private targetTags: string[];
	private displayNames: string[];
	private onChoose: (tag: string) => void;

	constructor(app: App, onChoose: (tag: string) => void) {
		super(app);
		this.targetTags = ["note/term", "note/topic", "note/knowledge", "note/idea", "note/log", "note/report", "note/publish", "slide"];
		this.displayNames = ["1: 📖Term note", "2: 📒Topic note", "3: 📝Knowledge note", "4: 🧠Idea note", "5: 📜Log note", "6: 📰Report note", "7: 📘Publish note", "8: ▶️Slide"];
		this.onChoose = onChoose;
	}

	getSuggestions(query: string): string[] {
		return this.displayNames.filter((item) =>
			item.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(value: string, el: HTMLElement) {
		el.createEl("div", { text: value });
	}

	onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
		const index = this.displayNames.indexOf(item);
		if (index !== -1) {
			this.onChoose(this.targetTags[index]);
		}
	}
}

export class EditorCommands {
	private app: App;
	private settings: CrystalPluginSettings;
	private plugin: Plugin;

	constructor(app: App, settings: CrystalPluginSettings, plugin: Plugin) {
		this.app = app;
		this.settings = settings;
		this.plugin = plugin;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	/**
	 * Create a new file with timestamp filename
	 */
	async createTimestampFile() {
		const basefilename = this.generateTimestampFilename();
		try {
			const newFile = await this.app.vault.create(basefilename + '.md', '\n');
			await this.app.workspace.getLeaf().openFile(newFile);
			await (this.app as any).commands.executeCommandById("workspace:edit-file-title");
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
			const newFile = await this.app.vault.create(basefilename + '.md', '\n');
			await this.app.workspace.getLeaf().openFile(newFile);
			await (this.app as any).commands.executeCommandById("workspace:edit-file-title");
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
	 * Increase blockquote level
	 */
	increaseBlockquote(editor: Editor, view: MarkdownView) {
		const selection = editor.listSelections()[0];
		const fromLine = Math.min(selection.anchor.line, selection.head.line);
		const toLine = Math.max(selection.anchor.line, selection.head.line);
		
		const changes = [];
		for (let lineNum = fromLine; lineNum <= toLine; lineNum++) {
			const line = editor.getLine(lineNum);
			const newLine = line.startsWith('>') ? `> ${line}` : `> ${line}`;
			changes.push({
				from: { line: lineNum, ch: 0 },
				to: { line: lineNum, ch: line.length },
				text: newLine
			});
		}
		
		editor.transaction({ changes });
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

	/**
	 * Tag-based file organization command (Templater equivalent)
	 */
	async organizeFileWithTags(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('ファイルが開かれていません');
			return;
		}

		const targetTags = ["note/term", "note/topic", "note/knowledge", "note/idea", "note/log", "note/report", "note/publish", "slide"];

		// タグ選択モーダルを表示
		const tagModal = new TagSuggestModal(this.app, async (selectedTag: string) => {
			if (!selectedTag) {
				return;
			}

			try {
				// フロントマターにタグを追加
				await this.app.fileManager.processFrontMatter(view.file!, (fm) => {
					if (!fm.tags) {
						fm.tags = [];
					} else if (!Array.isArray(fm.tags)) {
						fm.tags = [fm.tags];
					}
					// 既存のtargetTagsを削除してから新しいタグを追加
					fm.tags = fm.tags.filter((tag: string) => !targetTags.includes(tag));
					fm.tags.push(selectedTag);
				});

				// ファイル名処理
				await this.processFileName(view.file!, selectedTag);

				new Notice('ファイルが正常に分類されました');
			} catch (error) {
				new Notice('ファイル整理中にエラーが発生しました: ' + error.message);
				console.error('File organization error:', error);
			}

			requestAnimationFrame(() => {
				editor.setCursor(editor.getValue().length);
			});

		});

		tagModal.open();
	}

	/**
	 * Process filename based on selected tag
	 */
	private async processFileName(file: any, selectedTag: string) {
		let basefilename = file.basename;

		// 絵文字プレフィックスを削除
		const emojiPrefixes = ["📒", "🧠", "📜", "📰", "📘", "▶️"];
		for (const emoji of emojiPrefixes) {
			if (basefilename.startsWith(emoji)) {
				basefilename = basefilename.slice(emoji.length).trim();
				break;
			}
		}

		// 最初の日付を削除 (YYYY-MM-DD format)
		const dateMatch = basefilename.match(/^\d{4}-\d{2}-\d{2} /) || basefilename.match(/^\d{4}-\d{2}-\d{2}_/);
		if (dateMatch) {
			basefilename = basefilename.slice(dateMatch[0].length).trim(); 
		}

		// 現在の日付を取得
		const createdAt = new Date(file.stat.ctime);
		let date = `${createdAt.getFullYear()}-${(createdAt.getMonth() + 1).toString().padStart(2, '0')}-${createdAt.getDate().toString().padStart(2, '0')}`;
		
		// フロントマターのdateがあればそれを使用
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (fileCache?.frontmatter?.date) {
			date = fileCache.frontmatter.date;
		}

		// タグに基づいてファイル名を変更
		let newfilename: string;
		switch (selectedTag) {
			case "note/topic":
				newfilename = `📒${basefilename}`;
				break;
			case "note/idea":
				newfilename = `🧠${date}_${basefilename}`;
				break;
			case "note/log":
				newfilename = `📜${date}_${basefilename}`;
				break;
			case "note/report":
				newfilename = `📰${date}_${basefilename}`;
				break;
			case "note/publish":
				newfilename = `📘${basefilename}`;
				break;
			case "slide":
				newfilename = `▶️${date}_${basefilename}`;
				break;
			default:
				newfilename = basefilename;
		}

		// ファイル名が変更された場合のみリネーム
		if (newfilename !== file.basename) {
			try {
				await this.app.fileManager.renameFile(file, newfilename + '.md');
			} catch (error) {
				console.error('Rename error:', error);
				new Notice('ファイル名の変更に失敗しました: ' + error.message);
			}
		}

		// フォルダ移動
		try {
			let targetPath: string;
			
			if (selectedTag === "note/publish") {
				targetPath = this.settings.publishFolderPath ? 
					`${this.settings.publishFolderPath}/${newfilename}.md` : 
					`${newfilename}.md`;
			} else if (selectedTag === "slide") {
				targetPath = this.settings.marpSlideFolderPath ? 
					`${this.settings.marpSlideFolderPath}/${newfilename}.md` : 
					`${newfilename}.md`;
			} else {
				targetPath = `${newfilename}.md`;
			}
			
			// 現在のパスと異なる場合のみ移動
			if (file.path !== targetPath) {
				await this.app.fileManager.renameFile(file, targetPath);
			}
		} catch (error) {
			console.error('Move error:', error);
			new Notice('ファイル移動に失敗しました: ' + error.message);
		}
	}

	/**
	 * Convert Obsidian Wiki links and Markdown links to relative path Markdown links
	 */
	async convertLinksToRelativePaths(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('ファイルが開かれていません');
			return;
		}

		// ファイルのカーソル位置を記憶
		const cursorPosition = editor.getCursor();

		const content = editor.getValue();
		let convertedContent = content;
		let changeCount = 0;

		// Get current file's folder path for relative path calculation
		const currentFile = view.file;
		const currentFolder = currentFile.parent?.path || '';

		// Convert Wiki links: [[filename]] or [[filename|display]] and embed links: ![[filename]]
		const wikiLinkRegex = /(!)?\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
		convertedContent = convertedContent.replace(wikiLinkRegex, (match, embed, filename, alias) => {
			// Use Obsidian's built-in link resolution logic
			const targetFile = this.app.metadataCache.getFirstLinkpathDest(filename, currentFile.path);
			
			if (targetFile && targetFile.path) {
				// Calculate relative path
				const relativePath = this.getRelativePath(currentFolder, targetFile.path);
				// For embed links (![[...]]), use empty alt text; otherwise use alias or filename
				const displayText = embed ? '' : (alias ? alias.slice(1) : filename); // Remove | from alias
				changeCount++;
				return `${embed || ''}[${displayText}](${relativePath})`;
			}
			
			// If file not found, keep original
			return match;
		});

		// Convert Markdown links to relative if they point to vault files
		const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
		convertedContent = convertedContent.replace(markdownLinkRegex, (match, text, url) => {
			// Skip external URLs
			if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
				return match;
			}

			// Try to find the file in vault - first try as absolute path, then as filename
			let targetFile = this.app.vault.getAbstractFileByPath(url);
			
			// If not found as absolute path, try to find by filename
			if (!targetFile) {
				const filename = url.split('/').pop(); // Get filename from path
				if (filename) {
					// Search for file with this name in the vault
					const allFiles = this.app.vault.getFiles();
					const foundFile = allFiles.find(file => file.name === filename);
					if (foundFile) {
						targetFile = foundFile;
					}
				}
			}

			if (targetFile && targetFile.path) {
				// Calculate relative path
				const relativePath = this.getRelativePath(currentFolder, targetFile.path);
				// Only count as change if the path actually changed
				if (relativePath !== url) {
					changeCount++;
				}
				return `[${text}](${relativePath})`;
			}

			return match;
		});

		if (changeCount > 0) {
			editor.setValue(convertedContent);
			new Notice(`${changeCount}個のリンクを相対パスに変換済`);
		} else {
			new Notice('変換対象のリンクが見つかりませんでした');
		}

		// カーソル位置を復元
		editor.setCursor(cursorPosition);

		requestAnimationFrame(() => {
			editor.scrollIntoView({ from: cursorPosition, to: cursorPosition }, true);
		});
	}

	/**
	 * Calculate relative path from current folder to target file
	 */
	private getRelativePath(currentFolder: string, targetPath: string): string {
		// path.posix.relative を使って相対パスを計算
    	let relativePath = path.posix.relative(currentFolder, targetPath);

    	// 同じフォルダ内の場合、'./' を付け加えるとより親切
    	if (!relativePath.startsWith('../')) {
      	  relativePath = './' + relativePath;
    	}
    	return relativePath;
	}

	async onload() {
		// Editor Commands
		this.plugin.addCommand({
			id: 'crystal-create-timestamp-file',
			name: 'Create New File with Timestamp',
			callback: () => {
				this.createTimestampFile();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-create-linked-timestamp-file',
			name: 'Create New File with Link at Cursor',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.createLinkedTimestampFile(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-copy-file-link',
			name: 'Copy File Link to Clipboard',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.copyFileLink(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-copy-file-link-with-alias',
			name: 'Copy File Link with Alias to Clipboard',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.copyFileLinkWithAlias(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-wrap-subscript',
			name: 'Wrap Selection with Subscript',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.wrapWithSubscript(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-wrap-superscript',
			name: 'Wrap Selection with Superscript',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.wrapWithSuperscript(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-increase-blockquote',
			name: 'Increase Blockquote Level',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.increaseBlockquote(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-organize-file-with-tags',
			name: 'Organize File with Prefix and Tags',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.organizeFileWithTags(editor, view);
			}
		});

		// Convert Links Command
		this.plugin.addCommand({
			id: 'crystal-convert-links-to-relative-paths',
			name: 'Convert Links to Relative Paths',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.convertLinksToRelativePaths(editor, view);
			}
		});
	}
} 