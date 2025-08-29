import { Editor, MarkdownView, Notice, Plugin, normalizePath, TFile } from 'obsidian';
const { shell } = require('electron');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
import { TerminalService } from './terminal-service';
import { CrystalPluginSettings } from './settings';

export class MarpCommands {
	private terminalService: TerminalService;
	private settings: CrystalPluginSettings;
	private plugin: Plugin;

	constructor(terminalService: TerminalService, settings: CrystalPluginSettings, plugin: Plugin) {
		this.terminalService = terminalService;
		this.settings = settings;
		this.plugin = plugin;
	}

	/**
	 * Marpプレビューコマンドを直接実行する
	 */
	async executeMarpPreviewCommand(_editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの相対パス
			const activeFilePath = normalizePath(file.path);
			
			// 出力ファイル名 - Markdownファイルと同じディレクトリに出力
			const parentPath = file.parent?.path === '/' ? '' : (file.parent?.path || '');
			const outputPath = parentPath ? `${parentPath}/marp-preview.html` : 'marp-preview.html';

			// テーマオプションの追加
			const themeOption = this.settings.marpThemePath 
				? ` --theme "${this.settings.marpThemePath}"` 
				: '';

			// Marpコマンドを生成
			const marpCommand = `marp -p${themeOption} "${activeFilePath}" -o "${outputPath}"`;

			new Notice('Marpプレビューを実行中...');
			
			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);
			
			if (result.exitCode === 0) {
				new Notice('Marpプレビューが完了しました');
			} else {
				new Notice(`Marpプレビューでエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp preview command:', error);
			new Notice('Marpプレビューの実行に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpエクスポートコマンドを直接実行する
	 */
	async executeMarpExportCommand(_editor: Editor, view: MarkdownView, format: string = 'pptx', editable: boolean = false) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの相対パス
			const activeFilePath = normalizePath(file.path);

			// エクスポート先フォルダの決定
			const parentPath = file.parent?.path === '/' ? '' : (file.parent?.path || '');
			const exportFolderPath = this.settings.exportFolderPath || parentPath;
			
			// 出力ファイルパス
			const outputPath = exportFolderPath 
				? `${exportFolderPath}/${file.basename}.${format}`
				: `${file.basename}.${format}`;

			// テーマオプションの追加
			const themeOption = this.settings.marpThemePath 
				? ` --theme "${this.settings.marpThemePath}"` 
				: '';

			// Marpエクスポートコマンドを生成
			const editableOption = (editable && format === 'pptx') ? ' --pptx-editable' : '';
			const marpCommand = `marp --allow-local-files${editableOption}${themeOption} "${activeFilePath}" -o "${outputPath}"`;
			console.log('Executing Marp command:', marpCommand);

			const noticeMessage = (editable && format === 'pptx') 
				? `Marpエクスポート（${format.toUpperCase()}・編集可能）を実行中...` 
				: `Marpエクスポート（${format.toUpperCase()}）を実行中...`;
			new Notice(noticeMessage);
			
			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);
			
			if (result.exitCode === 0) {
				const successMessage = (editable && format === 'pptx') 
					? `Marpエクスポート（${format.toUpperCase()}・編集可能）が完了しました` 
					: `Marpエクスポート（${format.toUpperCase()}）が完了しました`;
				new Notice(successMessage);
			} else {
				new Notice(`Marpエクスポートでエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp export command:', error);
			new Notice('Marpエクスポートの実行に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marp Presenter Notesをテキストファイルとして出力する
	 */
	async executeMarpNotesCommand(_editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの相対パス
			const activeFilePath = normalizePath(file.path);

			// エクスポート先フォルダの決定
			const parentPath = file.parent?.path === '/' ? '' : (file.parent?.path || '');
			const exportFolderPath = this.settings.exportFolderPath || parentPath;
			
			// 出力ファイルパス（.txtファイル）
			const outputPath = exportFolderPath 
				? `${exportFolderPath}/${file.basename}-notes.txt`
				: `${file.basename}-notes.txt`;

			// Marp notesコマンドを生成
			const marpCommand = `marp --notes "${activeFilePath}" -o "${outputPath}"`;
			console.log('Executing Marp notes command:', marpCommand);

			new Notice('Marp Presenter Notesを出力中...');
			
			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);
			
			if (result.exitCode === 0) {
				new Notice('Marp Presenter Notesの出力が完了しました');
			} else {
				new Notice(`Marp Presenter Notesの出力でエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp notes command:', error);
			new Notice('Marp Presenter Notesの出力に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpサーバーを起動してSlidesフォルダ全体を対象にする
	 */
	async executeMarpServerCommand() {
		// 設定チェック
		if (!this.settings.marpSlideFolderPath) {
			new Notice('Marp Slide Folder Path is not configured in settings');
			return;
		}

		try {
			// テーマオプションの追加
			const themeOption = this.settings.marpThemePath 
				? ` --theme "${this.settings.marpThemePath}"` 
				: '';

			// Marpサーバーコマンドを生成
			const marpCommand = `marp -s --allow-local-files${themeOption} "${this.settings.marpSlideFolderPath}"`;

			new Notice('Marpサーバーを起動中...');
			
			// サーバーをバックグラウンドで実行（非同期で起動、結果は待たない）
			this.terminalService.executeCommand(marpCommand);
			
			// サーバーの応答を確認してからブラウザを開く
			this.waitForServerAndOpen();
		} catch (error) {
			console.error('Failed to start Marp server:', error);
			new Notice('Marpサーバーの起動に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpサーバーを停止する
	 */
	async stopMarpServerCommand() {
		try {
			new Notice('Marpサーバーを停止中...');
			
			// ポート8080を使用しているプロセスのみを終了
			const killCommand = process.platform === 'win32' 
				? 'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :8080\') do taskkill /F /PID %a'
				: 'lsof -ti:8080 | xargs kill -9';
			
			const result = await this.terminalService.executeCommand(killCommand);
			
			if (result.exitCode === 0) {
				new Notice('Marpサーバーを停止しました');
			} else {
				// プロセスが見つからない場合も正常とみなす
				new Notice('Marpサーバーを停止しました');
			}
		} catch (error) {
			console.error('Failed to stop Marp server:', error);
			new Notice('Marpサーバーの停止に失敗しました: ' + error.message);
		}
	}

	/**
	 * サーバーの応答を確認してからブラウザを開く
	 */
	private async waitForServerAndOpen(): Promise<void> {
		const maxAttempts = 30; // 最大30回試行（30秒）
		let attempts = 0;

		const checkServer = async (): Promise<boolean> => {
			return new Promise((resolve) => {
				const req = http.get('http://localhost:8080', (res: any) => {
					resolve(res.statusCode === 200);
				});

				req.on('error', () => {
					resolve(false);
				});

				req.setTimeout(1000, () => {
					req.destroy();
					resolve(false);
				});
			});
		};

		const tryOpenBrowser = async () => {
			attempts++;
			
			if (await checkServer()) {
				// サーバーが応答したらブラウザを開く
				const isWebViewerEnabled = (this.plugin.app as any).internalPlugins.getEnabledPluginById?.('webviewer');
				
				if (isWebViewerEnabled) {
					try {
						const leaf = this.plugin.app.workspace.getLeaf("tab");
						await leaf.setViewState({
							type: 'webviewer',
							state: {
								url: 'http://localhost:8080',
								navigate: true,
							},
							active: true,
						});
						console.log('WebViewer opened successfully');
					} catch (error) {
						console.log('WebViewer failed to open, falling back to external browser:', error);
						shell.openExternal('http://localhost:8080');
					}
				} else {
					console.log('WebViewer core plugin is disabled, opening in external browser');
					shell.openExternal('http://localhost:8080');
				}
				
				new Notice('Marpサーバーが起動しました');
				return;
			}

			if (attempts >= maxAttempts) {
				new Notice('Marpサーバーの起動を確認できませんでしたが、ブラウザを開きます');
				shell.openExternal('http://localhost:8080');
				return;
			}

			// 1秒後に再試行
			setTimeout(tryOpenBrowser, 1000);
		};

		tryOpenBrowser();
	}

	/**
	 * マークダウンファイル内の画像リンクを検出して移動する
	 */
	async moveImagesToMarpFolder(_editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) {
			new Notice('アクティブなファイルが見つかりません');
			return;
		}

		try {
			// 設定からmarp用のattachmentフォルダパスを取得
			const marpAttachmentFolder = this.settings.marpAttachmentFolderPath;
			if (!marpAttachmentFolder) {
				new Notice('Marp Attachment Folder Path が設定されていません');
				return;
			}

			// フォルダの存在確認
			const folder = this.plugin.app.vault.getAbstractFileByPath(marpAttachmentFolder);
			if (!folder) {
				new Notice(`Marp Attachment Folder が存在しません: ${marpAttachmentFolder}`);
				return;
			}

			// ファイルの内容を読み取り
			const content = await this.plugin.app.vault.read(file);
			
			// 画像リンクを検出
			const imageLinks = this.extractImageLinks(content);
			
			if (imageLinks.length === 0) {
				new Notice('画像リンクが見つかりませんでした');
				return;
			}

			let movedCount = 0;
			let updatedContent = content;

			// 各画像を処理
			for (const imageLink of imageLinks) {
				// パスからファイル名を抽出
				const fileName = imageLink.includes('/') ? path.basename(imageLink) : imageLink;
				
				// 既に正しいディレクトリにある場合はスキップ
				const expectedPath = normalizePath(`${marpAttachmentFolder}/${fileName}`);
				const existingFile = this.plugin.app.vault.getAbstractFileByPath(expectedPath);
				
				if (existingFile) {
					continue;
				}
				
				const moveResult = await this.moveImage(fileName, marpAttachmentFolder);
				if (moveResult) {
					movedCount++;
					// ファイル内のリンクを更新
					updatedContent = this.updateImageLink(updatedContent, imageLink);
				}
			}

			// ファイルを更新
			if (movedCount > 0) {
				await this.plugin.app.vault.modify(file, updatedContent);
				new Notice(`${movedCount}個の画像をMarpフォルダに移動しました`);
			} else {
				new Notice('移動できる画像がありませんでした');
			}

		} catch (error) {
			console.error('Failed to move images to Marp folder:', error);
			new Notice('画像の移動に失敗しました: ' + error.message);
		}
	}

	/**
	 * マークダウンテキストから画像リンクを抽出
	 */
	private extractImageLinks(content: string): string[] {
		const imageLinks: string[] = [];
		
		// Wikilink形式の画像 ![[image.jpg]]
		const wikilinkRegex = /!\[\[([^\]]+\.(jpg|jpeg|png|gif|bmp|svg|webp))\]\]/gi;
		let match;
		while ((match = wikilinkRegex.exec(content)) !== null) {
			imageLinks.push(match[1]);
		}

		// マークダウンリンク形式の画像 ![alt](image.jpg)
		const markdownLinkRegex = /!\[[^\]]*\]\(([^)]+\.(jpg|jpeg|png|gif|bmp|svg|webp))\)/gi;
		while ((match = markdownLinkRegex.exec(content)) !== null) {
			imageLinks.push(match[1]);
		}

		return [...new Set(imageLinks)]; // 重複を除去
	}

	/**
	 * 画像ファイルを移動
	 */
	private async moveImage(imagePath: string, destinationFolder: string): Promise<boolean> {
		try {
			// ファイル名で検索
			const allFiles = this.plugin.app.vault.getFiles();
			const imageFile = allFiles.find(f => f.name === imagePath);
			
			if (!imageFile || !(imageFile instanceof TFile)) {
				return false;
			}

			// 移動先パスを作成（imagePathはファイル名の場合があるため）
			const fileName = imagePath.includes('/') ? path.basename(imagePath) : imagePath;
			const destinationPath = normalizePath(`${destinationFolder}/${fileName}`);

			// 既に移動先に存在する場合はスキップ
			const existingFile = this.plugin.app.vault.getAbstractFileByPath(destinationPath);
			if (existingFile) {
				return true; // 既に存在するので移動済みとみなす
			}

			// ファイルを移動
			await this.plugin.app.fileManager.renameFile(imageFile, destinationPath);
			return true;

		} catch (error) {
			console.error(`Failed to move image ${imagePath}:`, error);
			return false;
		}
	}

	/**
	 * ファイル内の画像リンクを更新
	 */
	private updateImageLink(content: string, originalPath: string): string {
		const fileName = originalPath.includes('/') ? path.basename(originalPath) : originalPath;
		
		// Wikilink形式を更新（ファイル名のみ使用）
		const wikilinkRegex = new RegExp(`!\\[\\[${originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'gi');
		content = content.replace(wikilinkRegex, `![[${fileName}]]`);
		
		// マークダウンリンク形式を更新（ファイル名のみ使用）
		const markdownLinkRegex = new RegExp(`(!\\[[^\\]]*\\]\\()${originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\))`, 'gi');
		content = content.replace(markdownLinkRegex, `$1${fileName}$2`);
		
		return content;
	}

	async onload() {
		this.plugin.addCommand({
			id: 'crystal-preview-marp-slide',
			name: 'Preview Marp Slide',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpPreviewCommand(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide',
			name: 'Export Marp Slide (PPTX)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view, 'pptx');
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide-editable',
			name: 'Export Marp Slide (PPTX Editable)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view, 'pptx', true);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide-html',
			name: 'Export Marp Slide (HTML)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view, 'html');
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide-pdf',
			name: 'Export Marp Slide (PDF)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view, 'pdf');
			}
		});

		this.plugin.addCommand({
			id: 'crystal-marp-server',
			name: 'Start Marp Server',
			callback: () => {
				this.executeMarpServerCommand();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-stop-marp-server',
			name: 'Stop Marp Server',
			callback: () => {
				this.stopMarpServerCommand();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-move-images-to-marp-folder',
			name: 'Move Images to Marp Folder',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.moveImagesToMarpFolder(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-notes',
			name: 'Export Marp Presenter Notes',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpNotesCommand(editor, view);
			}
		});
	}
}
