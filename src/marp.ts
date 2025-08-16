import { App, Editor, MarkdownView, Notice, Plugin, normalizePath } from 'obsidian';
import { EditorCommands } from './editor-commands';
import { TerminalService } from './terminal-service';
import * as path from 'path';
import { CrystalPluginSettings } from './settings';

export class MarpCommands {
	private app: App;
	private editorCommands: EditorCommands;
	private terminalService: TerminalService;
	private settings: CrystalPluginSettings;
	private plugin: Plugin;

	constructor(app: App, editorCommands: EditorCommands, terminalService: TerminalService, settings: CrystalPluginSettings, plugin: Plugin) {
		this.app = app;
		this.editorCommands = editorCommands;
		this.terminalService = terminalService;
		this.settings = settings;
		this.plugin = plugin;
	}

	/**
	 * リンクを相対パスに変換し、Marpコマンドをクリップボードにコピーする
	 */
	async previewMarpSlide(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('ファイルが開かれていません');
			return;
		}

		// ファイルのカーソル位置を記憶
		const cursorPosition = editor.getCursor();

		try {
			// 1. crystal-convert-links-to-relative-pathsを実行
			await this.editorCommands.convertLinksToRelativePaths(editor, view);

			// 2. Marpプレビューを直接実行
			await this.executeMarpPreviewCommand(view);

		} catch (error) {
			console.error('Marp slide preparation failed:', error);
			new Notice('Marpスライド準備に失敗しました: ' + error.message);
		}
		// カーソル位置を復元
		editor.setCursor(cursorPosition);

		requestAnimationFrame(() => {
			editor.scrollIntoView({ from: cursorPosition, to: cursorPosition }, true);
		});
	}

	/**
	 * Marpプレビューコマンドを直接実行する
	 */
	private async executeMarpPreviewCommand(view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの絶対パス（Vaultのパスを使用）
			const vaultPath = (this.app.vault.adapter as any).basePath || '';
			const activeFilePath = path.join(vaultPath, normalizePath(file.path));
			
			// 出力ファイル名（固定）- アクティブファイルと同じディレクトリに出力
			const outputFileName = 'marp-preview.html';
			const fileDirectory = file.parent ? path.join(vaultPath, normalizePath(file.parent.path)) : vaultPath;
			const outputPath = path.join(fileDirectory, outputFileName);

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
	 * リンクを相対パスに変換し、Marpエクスポートコマンドをクリップボードにコピーする
	 */
	async exportMarpSlide(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('ファイルが開かれていません');
			return;
		}

		// ファイルのカーソル位置を記憶
		const cursorPosition = editor.getCursor();
		
		try {
			// 1. crystal-convert-links-to-relative-pathsを実行
			await this.editorCommands.convertLinksToRelativePaths(editor, view);

			// 2. Marpエクスポートを直接実行
			await this.executeMarpExportCommand(view);

		} catch (error) {
			console.error('Marp export command generation failed:', error);
			new Notice('Marpエクスポートコマンド生成に失敗しました: ' + error.message);
		}
		// カーソル位置を復元
		editor.setCursor(cursorPosition);

		requestAnimationFrame(() => {
			editor.scrollIntoView({ from: cursorPosition, to: cursorPosition }, true);
		});
	}


	/**
	 * Marpエクスポートコマンドを直接実行する
	 */
	private async executeMarpExportCommand(view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの絶対パス（Vaultのパスを使用）
			const vaultPath = (this.app.vault.adapter as any).basePath || '';
			const activeFilePath = path.join(vaultPath, normalizePath(file.path));

			// エクスポート先フォルダの決定
			const exportFolderPath = this.settings.exportFolderPath || 
				(file.parent ? path.join(vaultPath, normalizePath(file.parent.path)) : vaultPath);
			
			// 出力ファイルパス（.pptx形式）
			const outputPath = path.join(exportFolderPath, file.basename + '.pptx');

			// テーマオプションの追加
			const themeOption = this.settings.marpThemePath 
				? ` --theme "${this.settings.marpThemePath}"` 
				: '';

			// Marpエクスポートコマンドを生成
			const marpCommand = `marp --allow-local-files${themeOption} "${activeFilePath}" -o "${outputPath}"`;

			new Notice('Marpエクスポートを実行中...');
			
			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);
			
			if (result.exitCode === 0) {
				new Notice('Marpエクスポートが完了しました');
			} else {
				new Notice(`Marpエクスポートでエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp export command:', error);
			new Notice('Marpエクスポートの実行に失敗しました: ' + error.message);
		}
	}

	async onload() {
		this.plugin.addCommand({
			id: 'crystal-preview-marp-slide',
			name: 'Preview Marp Slide',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.previewMarpSlide(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide',
			name: 'Export Marp Slide',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.exportMarpSlide(editor, view);
			}
		});
	}	
}
