import { App, Editor, MarkdownView, Notice } from 'obsidian';
import { EditorCommands } from './editor-commands';
import * as path from 'path';

export class MarpCommands {
	private app: App;
	private editorCommands: EditorCommands;

	constructor(app: App, editorCommands: EditorCommands) {
		this.app = app;
		this.editorCommands = editorCommands;
	}

	/**
	 * リンクを相対パスに変換し、Marpコマンドをクリップボードにコピーする
	 */
	async previewMarpSlide(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('ファイルが開かれていません');
			return;
		}

		try {
			// 1. crystal-convert-links-to-relative-pathsを実行
			await this.editorCommands.convertLinksToRelativePaths(editor, view);

			// 2. Marpコマンドをクリップボードにコピー
			await this.copyMarpPreviewCommand(view);

			// 成功通知
			new Notice('リンクパス変換完了・Marpコマンドをコピーしました');

		} catch (error) {
			console.error('Marp slide preparation failed:', error);
			new Notice('Marpスライド準備に失敗しました: ' + error.message);
		}
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
			const activeFilePath = path.join(vaultPath, file.path);
			
			// 出力ファイル名（固定）- アクティブファイルと同じディレクトリに出力
			const outputFileName = 'marp-preview.html';
			const fileDirectory = file.parent ? path.join(vaultPath, file.parent.path) : vaultPath;
			const outputPath = path.join(fileDirectory, outputFileName);

			// Marpコマンドを生成
			const marpCommand = `marp -p "${activeFilePath}" -o "${outputPath}"`;

			// クリップボードにコピー
			await navigator.clipboard.writeText(marpCommand);
		} catch (error) {
			console.error('Failed to copy Marp command:', error);
			throw new Error('Marpコマンドのコピーに失敗しました: ' + error.message);
		}
	}
}
