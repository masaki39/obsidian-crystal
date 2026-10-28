import { Editor, MarkdownView, Notice, Plugin, normalizePath, TFile } from 'obsidian';
const path = require('path');
import type { CrystalPluginSettings } from '../../settings';
import { normalizeSettingPath } from './export';

/**
 * マークダウンテキストから画像リンクを抽出
 */
export function extractImageLinks(content: string): string[] {
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

/** Collects a slide deck's images into the Marp attachment folder. */
export class MarpImages {
	constructor(
		private plugin: Plugin,
		private getSettings: () => CrystalPluginSettings
	) {}

	private get settings(): CrystalPluginSettings {
		return this.getSettings();
	}

	/**
	 * マークダウンファイル内の画像リンクを検出して移動する
	 */
	async moveImagesToMarpFolder(_editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) {
			new Notice('⚠️ アクティブなファイルが見つかりません');
			return;
		}

		try {
			// 設定からmarp用のattachmentフォルダパスを取得
			const marpAttachmentFolder = normalizeSettingPath(this.settings.marpAttachmentFolderPath);
			if (!marpAttachmentFolder) {
				new Notice('⚠️ Marp Attachment Folder Path が設定されていません');
				return;
			}

			// フォルダの存在確認
			const folder = this.plugin.app.vault.getAbstractFileByPath(marpAttachmentFolder);
			if (!folder) {
				new Notice(`⚠️ Marp Attachment Folder が存在しません: ${marpAttachmentFolder}`);
				return;
			}

			// ファイルの内容を読み取り
			const content = await this.plugin.app.vault.read(file);
			
			// 画像リンクを検出
			const imageLinks = extractImageLinks(content);
			
			if (imageLinks.length === 0) {
				new Notice('⚠️ 画像リンクが見つかりませんでした');
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
				new Notice(`✅ ${movedCount}個の画像をMarpフォルダに移動しました`);
			} else {
				new Notice('⚠️ 移動できる画像がありませんでした');
			}

		} catch (error) {
			console.error('Failed to move images to Marp folder:', error);
			new Notice('❌ 画像の移動に失敗しました: ' + error.message);
		}
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
}
