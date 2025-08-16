import { Editor, MarkdownView, Notice, Plugin, normalizePath } from 'obsidian';
import { EditorCommands } from './editor-commands';
import { TerminalService } from './terminal-service';
import * as path from 'path';
import { CrystalPluginSettings } from './settings';

export class MarpCommands {
	private editorCommands: EditorCommands;
	private terminalService: TerminalService;
	private settings: CrystalPluginSettings;
	private plugin: Plugin;

	constructor(editorCommands: EditorCommands, terminalService: TerminalService, settings: CrystalPluginSettings, plugin: Plugin) {
		this.editorCommands = editorCommands;
		this.terminalService = terminalService;
		this.settings = settings;
		this.plugin = plugin;
	}


	/**
	 * Marpプレビューコマンドを直接実行する
	 */
	async executeMarpPreviewCommand(editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの相対パス
			const activeFilePath = normalizePath(file.path);
			
			// 出力ファイル名（固定）- アクティブファイルと同じディレクトリに出力
			const outputFileName = 'marp-preview.html';
			// ファイルの親ディレクトリを安全に取得（rootの場合は空文字列に）
			const fileDirectory = file.parent?.path === '/' ? '' : (file.parent?.path || '');
			// 出力パスを生成
			const outputPath = fileDirectory 
				? `${fileDirectory}/${outputFileName}`
				: outputFileName;

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
	async executeMarpExportCommand(editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの相対パス
			const activeFilePath = normalizePath(file.path);

			// エクスポート先フォルダの決定
			const parentPath = file.parent?.path === '/' ? '' : (file.parent?.path || '');
			const exportFolderPath = this.settings.exportFolderPath || parentPath;
			
			// 出力ファイルパス（.pptx形式）
			const outputPath = exportFolderPath 
				? `${exportFolderPath}/${file.basename}.pptx`
				: `${file.basename}.pptx`;

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
				this.executeMarpPreviewCommand(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide',
			name: 'Export Marp Slide',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view);
			}
		});
	}	
}
