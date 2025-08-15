import { App, Editor, MarkdownView, Notice, Plugin, normalizePath } from 'obsidian';
import { EditorCommands } from './editor-commands';
import * as path from 'path';
import { CrystalPluginSettings } from './settings';

export class MarpCommands {
	private app: App;
	private editorCommands: EditorCommands;
	private settings: CrystalPluginSettings;
	private plugin: Plugin;

	constructor(app: App, editorCommands: EditorCommands, settings: CrystalPluginSettings, plugin: Plugin) {
		this.app = app;
		this.editorCommands = editorCommands;
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

			// 2. Marpコマンドをクリップボードにコピー
			await this.copyMarpPreviewCommand(view);

			// 成功通知
			new Notice('Marpコマンドをコピーしました');

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
	 * Marpコマンドをクリップボードにコピーする
	 */
	private async copyMarpPreviewCommand(view: MarkdownView) {
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

			// クリップボードにコピー
			await navigator.clipboard.writeText(marpCommand);
		} catch (error) {
			console.error('Failed to copy Marp command:', error);
			throw new Error('Marpコマンドのコピーに失敗しました: ' + error.message);
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

			// 2. Marpエクスポートコマンドをクリップボードにコピー
			await this.copyMarpExportCommand(view);

			// 成功通知
			new Notice('Marpコマンドをコピーしました');

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
	 * Marpエクスポートコマンドをクリップボードにコピーする
	 */
	private async copyMarpExportCommand(view: MarkdownView) {
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

			// クリップボードにコピー
			await navigator.clipboard.writeText(marpCommand);
		} catch (error) {
			console.error('Failed to copy Marp export command:', error);
			throw new Error('Marpエクスポートコマンドのコピーに失敗しました: ' + error.message);
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
