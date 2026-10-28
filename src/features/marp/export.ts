import { Editor, MarkdownView, Notice, Plugin, normalizePath } from 'obsidian';
const fs = require('fs').promises;
const path = require('path');
import type { TerminalService } from '../../shared/terminal-service';
import type { CrystalPluginSettings } from '../../settings';
import { extractImageLinks, wikilinkImageRegex } from './images';

/**
 * 設定済みのテーマディレクトリからMarp CLIの --theme-set オプションを生成
 */
export function getThemeSetOption(settings: CrystalPluginSettings): string {
	const normalizedThemePath = normalizeSettingPath(settings.marpThemePath);
	if (!normalizedThemePath) {
		return '';
	}

	return ` --theme-set "${normalizedThemePath}"`;
}

/**
 * 設定に保存されたパス（相対/絶対）を正規化して返す
 */
export function normalizeSettingPath(settingPath?: string): string | null {
	const trimmed = settingPath?.trim();
	return trimmed ? normalizePath(trimmed) : null;
}

/** Marp CLI one-shot runs: preview, export (pptx/pdf/html…), HTML folder and presenter notes. */
export class MarpExporter {
	constructor(
		private terminalService: TerminalService,
		private plugin: Plugin,
		private getSettings: () => CrystalPluginSettings
	) {}

	private get settings(): CrystalPluginSettings {
		return this.getSettings();
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

			const themeOption = getThemeSetOption(this.settings);

				// Marpコマンドを生成（-- 以降でMarkdownファイルを指定）
				const marpCommand = `marp -p${themeOption} -o "${outputPath}" -- "${activeFilePath}"`;

			new Notice('⏳ Marpプレビューを実行中...');
			
			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);
			
			if (result.exitCode === 0) {
				new Notice('✅ Marpプレビューが完了しました');
			} else {
				new Notice(`❌ Marpプレビューでエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp preview command:', error);
			new Notice('❌ Marpプレビューの実行に失敗しました: ' + error.message);
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

			const themeOption = getThemeSetOption(this.settings);

			// Marpエクスポートコマンドを生成
			const editableOption = (editable && format === 'pptx') ? ' --pptx-editable' : '';
				const marpCommand = `marp --allow-local-files${editableOption}${themeOption} -o "${outputPath}" -- "${activeFilePath}"`;
			console.log('Executing Marp command:', marpCommand);

			const noticeMessage = (editable && format === 'pptx')
				? `⏳ Marpエクスポート（${format.toUpperCase()}・編集可能）を実行中...`
				: `⏳ Marpエクスポート（${format.toUpperCase()}）を実行中...`;
			new Notice(noticeMessage);

			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);

			if (result.exitCode === 0) {
				const successMessage = (editable && format === 'pptx')
					? `✅ Marpエクスポート（${format.toUpperCase()}・編集可能）が完了しました`
					: `✅ Marpエクスポート（${format.toUpperCase()}）が完了しました`;
				new Notice(successMessage);
			} else {
				new Notice(`❌ Marpエクスポートでエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp export command:', error);
			new Notice('❌ Marpエクスポートの実行に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marp HTML + 画像をフォルダにまとめてエクスポートする
	 */
	async executeMarpExportHtmlFolderCommand(_editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			const vaultBase = (this.plugin.app.vault.adapter as any).basePath as string;

			// markdown を読み込み画像リンクを抽出
			const content = await this.plugin.app.vault.read(file);
			const imageLinks = extractImageLinks(content);

			// 出力フォルダの絶対パスを決定（exportFolderPath が絶対/相対どちらでも正しく解決する）
			const parentPath = file.parent?.path === '/' ? '' : (file.parent?.path || '');
			const folderName = `${file.basename}-html`;
			const exportSetting = this.settings.exportFolderPath;
			let baseAbsPath: string;
			if (exportSetting) {
				baseAbsPath = path.isAbsolute(exportSetting)
					? exportSetting
					: path.join(vaultBase, exportSetting);
			} else {
				baseAbsPath = parentPath ? path.join(vaultBase, parentPath) : vaultBase;
			}
			const outputFolderAbsPath = path.join(baseAbsPath, folderName);

			// フォルダ作成
			await fs.mkdir(outputFolderAbsPath, { recursive: true });

			// 画像をフォルダにコピー
			const allFiles = this.plugin.app.vault.getFiles();
			for (const imageLink of imageLinks) {
				const fileName = path.basename(imageLink);
				const imageFile = allFiles.find(f => f.name === fileName || f.path === imageLink);
				if (imageFile) {
					const srcAbsPath = path.join(vaultBase, imageFile.path);
					const destAbsPath = path.join(outputFolderAbsPath, fileName);
					await fs.copyFile(srcAbsPath, destAbsPath);
				}
			}

			// wikilink・markdownリンクを相対パス（basenameのみ）に変換
			let modifiedContent = content;
			modifiedContent = modifiedContent.replace(
				wikilinkImageRegex(),
				(_match: string, imagePath: string) => `![](${path.basename(imagePath)})`
			);
			modifiedContent = modifiedContent.replace(
				/!\[([^\]]*)\]\(([^)]+\.(jpg|jpeg|png|gif|bmp|svg|webp))\)/gi,
				(_match: string, alt: string, imagePath: string) => `![${alt}](${path.basename(imagePath)})`
			);

			// 変換済み markdown をコピーとして書き込み
			const mdCopyAbsPath = path.join(outputFolderAbsPath, file.name);
			await fs.writeFile(mdCopyAbsPath, modifiedContent, 'utf-8');

			// marp コマンド実行（絶対パスを使用）
			const mdCopyPath = path.join(outputFolderAbsPath, file.name);
			const htmlOutputPath = path.join(outputFolderAbsPath, `${file.basename}.html`);
			const themeOption = getThemeSetOption(this.settings);
			const marpCommand = `marp --allow-local-files${themeOption} -o "${htmlOutputPath}" -- "${mdCopyPath}"`;

			new Notice('⏳ Marp HTML（添付ファイル付き）をエクスポート中...');

			const result = await this.terminalService.executeCommand(marpCommand);

			if (result.exitCode === 0) {
				new Notice(`✅ エクスポート完了: ${outputFolderAbsPath}`);
			} else {
				new Notice(`❌ Marpエクスポートでエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to export Marp HTML with attachments:', error);
			new Notice('❌ エクスポートに失敗しました: ' + error.message);
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

			new Notice('⏳ Marp Presenter Notesを出力中...');
			
			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);
			
			if (result.exitCode === 0) {
				new Notice('✅ Marp Presenter Notesの出力が完了しました');
			} else {
				new Notice(`❌ Marp Presenter Notesの出力でエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp notes command:', error);
			new Notice('❌ Marp Presenter Notesの出力に失敗しました: ' + error.message);
		}
	}
}
