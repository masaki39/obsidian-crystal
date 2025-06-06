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
	 * リンクを相対パスに変換し、ファイル名に▶️プレフィックスを追加し、slideタグを追加し、Marpコマンドをクリップボードにコピーする
	 */
	async prepareMarpSlide(editor: Editor, view: MarkdownView) {
		if (!view.file) {
			new Notice('ファイルが開かれていません');
			return;
		}

		try {
			// 1. crystal-convert-links-to-relative-pathsを実行
			await this.editorCommands.convertLinksToRelativePaths(editor, view);

			// 2. ファイル名のプレフィックスを▶️に変更
			await this.addSlidePrefix(view);

			// 3. タグにslideを追加
			await this.addSlideTag(view);

			// 4. Marpコマンドをクリップボードにコピー
			await this.copyMarpCommand(view);

			// 成功通知
			new Notice('Marpスライド準備完了・コマンドをコピーしました');

		} catch (error) {
			console.error('Marp slide preparation failed:', error);
			new Notice('Marpスライド準備に失敗しました: ' + error.message);
		}
	}

	/**
	 * ファイル名に▶️プレフィックスを追加する
	 */
	private async addSlidePrefix(view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		let basename = file.basename;
		
		// 既存の絵文字プレフィックスを削除
		const emojiPrefixes = ["📒", "🧠", "📜", "📰", "📘", "▶️"];
		for (const emoji of emojiPrefixes) {
			if (basename.startsWith(emoji)) {
				basename = basename.slice(emoji.length).trim();
				break;
			}
		}

		// ▶️プレフィックスを追加
		const newFilename = `▶️${basename}`;
		
		if (newFilename !== file.basename) {
			try {
				const newPath = file.parent ? `${file.parent.path}/${newFilename}.md` : `${newFilename}.md`;
				await this.app.fileManager.renameFile(file, newPath);
			} catch (error) {
				console.error('Failed to rename file:', error);
				throw new Error('ファイル名の変更に失敗しました: ' + error.message);
			}
		}
	}

	/**
	 * タグにslideを追加する
	 */
	private async addSlideTag(view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			await this.app.fileManager.processFrontMatter(file, (fm) => {
				if (!fm.tags) {
					fm.tags = [];
				} else if (!Array.isArray(fm.tags)) {
					fm.tags = [fm.tags];
				}
				
				// slideタグが既に存在しない場合のみ追加
				if (!fm.tags.includes('slide')) {
					fm.tags.push('slide');
				}
			});
		} catch (error) {
			console.error('Failed to add slide tag:', error);
			throw new Error('slideタグの追加に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpコマンドをクリップボードにコピーする
	 */
	private async copyMarpCommand(view: MarkdownView) {
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
