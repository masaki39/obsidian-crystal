import { App, Editor, MarkdownView, Notice, SuggestModal, Plugin } from 'obsidian';
import { CrystalPluginSettings, FileOrganizationRule } from './settings';
import { parseFrontmatter, promptForText } from './utils';
import * as path from 'path';

class RuleSuggestModal extends SuggestModal<FileOrganizationRule> {
	constructor(app: App, private rules: FileOrganizationRule[], private onChoose: (rule: FileOrganizationRule) => void) {
		super(app);
	}

	getSuggestions(query: string): FileOrganizationRule[] {
		return this.rules.filter(rule => 
			this.getDisplayText(rule).toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(rule: FileOrganizationRule, el: HTMLElement) {
		el.createEl("div", { text: this.getDisplayText(rule) });
	}

	onChooseSuggestion(rule: FileOrganizationRule) {
		this.onChoose(rule);
	}

	private getDisplayText(rule: FileOrganizationRule): string {
		const index = this.rules.indexOf(rule) + 1;
		return rule.displayName || rule.tag || `Rule ${index}`;
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
		
		// Case 1: Selection contains complete tags - remove them
		if (regex.test(selection)) {
			const unwrappedSelection = selection.replace(regex, '$1');
			editor.replaceSelection(unwrappedSelection);
			return;
		}
		
		// Case 2: Check if cursor/selection is inside a tag on current line
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const tagRegex = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 'g');
		let match;
		
		while ((match = tagRegex.exec(line)) !== null) {
			const tagStart = match.index;
			const tagEnd = match.index + match[0].length;
			
			// Check if cursor is inside this tag
			if (cursor.ch >= tagStart && cursor.ch <= tagEnd) {
				const from = { line: cursor.line, ch: tagStart };
				const to = { line: cursor.line, ch: tagEnd };
				editor.replaceRange(match[1], from, to);
				return;
			}
		}
		
		// Case 3: Add tag to selection
		const wrappedSelection = `<${tag}>${selection}</${tag}>`;
		editor.replaceSelection(wrappedSelection);
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

		// 設定からルールを取得
		const rules = this.settings.fileOrganizationRules;

		if (rules.length === 0) {
			new Notice('ファイル整理ルールが設定されていません');
			return;
		}

		// ルール選択モーダルを表示
		const ruleModal = new RuleSuggestModal(this.app, rules, async (selectedRule: FileOrganizationRule) => {
			if (!selectedRule) {
				return;
			}

			try {
				// フロントマターのタグを処理
				await this.app.fileManager.processFrontMatter(view.file!, (fm) => {
					if (!fm.tags) {
						fm.tags = [];
					} else if (!Array.isArray(fm.tags)) {
						fm.tags = [fm.tags];
					}
					
					// 既存のルールのタグを削除
					const allRuleTags = this.settings.fileOrganizationRules.map(rule => rule.tag).filter(tag => tag.trim());
					fm.tags = fm.tags.filter((tag: string) => !allRuleTags.includes(tag));
					
					// 新しいタグを追加（設定されている場合のみ）
					if (selectedRule.tag.trim()) {
						fm.tags.push(selectedRule.tag);
					}
				});

				// ファイル名処理
				await this.processFileNameWithRule(view.file!, selectedRule);

				new Notice('ファイルが正常に分類されました');
			} catch (error) {
				new Notice('ファイル整理中にエラーが発生しました: ' + error.message);
				console.error('File organization error:', error);
			}

			requestAnimationFrame(() => {
				editor.setCursor(editor.getValue().length);
			});

		});

		ruleModal.open();
	}

	private async processFileNameWithRule(file: any, rule: FileOrganizationRule) {
		// 既存の装飾を削除してベースファイル名を取得
		let basename = this.cleanFileName(file.basename);
		
		// 新しいファイル名を構築
		let newname = this.buildFileName(basename, rule, file);
		
		// ファイルの移動とリネーム
		await this.moveAndRenameFile(file, newname, rule.folder);
	}

	private cleanFileName(filename: string): string {
		// 既存のプレフィックスを削除
		const prefixes = this.settings.fileOrganizationRules.map(r => r.prefix).filter(Boolean);
		for (const prefix of prefixes) {
			if (filename.startsWith(prefix)) {
				filename = filename.slice(prefix.length).trim();
				break;
			}
		}
		
		// 既存の日付を削除
		return filename.replace(/^\d{4}-\d{2}-\d{2}[_ ]?/, '').trim();
	}

	private buildFileName(basename: string, rule: FileOrganizationRule, file: any): string {
		let filename = basename;
		
		if (rule.includeDate) {
			const date = this.getFileDate(file);
			filename = `${date}_${filename}`;
		}
		
		if (rule.prefix) {
			filename = `${rule.prefix}${filename}`;
		}
		
		return filename;
	}

	private getFileDate(file: any): string {
		// フロントマターから日付を取得、なければファイル作成日を使用
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (fileCache?.frontmatter?.date) {
			return fileCache.frontmatter.date;
		}
		
		const date = new Date(file.stat.ctime);
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
	}

	private async moveAndRenameFile(file: any, newname: string, folder: string) {
		const targetPath = folder ? `${folder}/${newname}.md` : `${newname}.md`;
		
		if (file.path !== targetPath) {
			try {
				await this.app.fileManager.renameFile(file, targetPath);
			} catch (error) {
				console.error('File operation error:', error);
				new Notice('ファイル操作に失敗しました: ' + error.message);
			}
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

	/**
	 * Convert active file content into a bullet list
	 */
	async convertActiveFileToBulletList(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('ファイルが開かれていません');
			return;
		}

		const rawContent = await this.app.vault.read(view.file);
		const { frontmatter, content } = parseFrontmatter(rawContent);

		const bulletLines = content
			.split(/\r?\n/)
			.map((line: string) => {
				const trimmed = line.trim();
				if (trimmed.length === 0) {
					return null;
				}

				const indentMatch = line.match(/^\s*/);
				const indent = indentMatch ? indentMatch[0] : '';
				const withoutHeading = trimmed.replace(/^#+\s*/, '').trim();

				if (withoutHeading.startsWith('-')) {
					const item = withoutHeading.replace(/^\-\s*/, '').trim();
					return `${indent}- ${item}`;
				}

				return `${indent}- ${withoutHeading}`;
			})
			.filter((line: string | null): line is string => line !== null);

		editor.setValue(`${frontmatter}${bulletLines.join('\n')}`);
		new Notice('コンテンツをバレットリストに変換しました');
	}

	/**
	 * Insert OGP link at cursor position
	 */
	async insertOgpLink(editor: Editor, view: MarkdownView) {
		const url = await promptForText(
			this.app,
			'URLを入力してください',
			'https://example.com',
			'挿入'
		);

		if (!url) {
			return;
		}

		// Validate URL format
		try {
			new URL(url);
		} catch (error) {
			new Notice('無効なURLです');
			return;
		}

		// Create OGP link markdown
		const ogpLink = `[![](https://ogpf.vercel.app/c?url=${url})](${url})`;

		// Insert at cursor position
		editor.replaceSelection(ogpLink);

		new Notice('OGPリンクを挿入しました');
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

		this.plugin.addCommand({
			id: 'crystal-convert-active-file-to-bullet-list',
			name: 'Convert Active File to Bullet List',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.convertActiveFileToBulletList(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-insert-ogp-link',
			name: 'Insert OGP Link',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insertOgpLink(editor, view);
			}
		});
	}
}
