import { App, Editor, MarkdownView, Notice, TFile } from 'obsidian';
import { GeminiService } from './gemini-service';

export class FileProcessor {
	constructor(private app: App) {}

	/**
	 * ファイルの内容からフロントマターを除去して取得する
	 */
	async getContentWithoutFrontmatter(file: TFile): Promise<string> {
		const fileContent = await this.app.vault.read(file);
		// フロントマターを除去
		return fileContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
	}

	/**
	 * フロントマターにdescriptionを追加する
	 */
	async updateFrontmatterDescription(file: TFile, description: string): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.description = description;
		});
	}

	/**
	 * 現在のファイルでdescription生成を実行する
	 */
	async generateDescription(
		editor: Editor, 
		view: MarkdownView, 
		geminiService: GeminiService | null
	): Promise<void> {
		if (!geminiService) {
			new Notice('Gemini API Keyが設定されていません。設定からAPIキーを入力してください。');
			return;
		}

		if (!view.file) {
			new Notice('現在のファイルが見つかりません。');
			return;
		}

		try {
			new Notice('Descriptionを生成中...');

			// フロントマターを除去したコンテンツを取得
			const contentForAnalysis = await this.getContentWithoutFrontmatter(view.file);
			
			if (!contentForAnalysis.trim()) {
				new Notice('ファイル内容が空のため、descriptionを生成できません。');
				return;
			}

			// Geminiを使用してdescriptionを生成
			const description = await geminiService.generateDescription(contentForAnalysis);

			// フロントマターを更新
			await this.updateFrontmatterDescription(view.file, description);

			new Notice(`Description生成完了: ${description}`);

		} catch (error) {
			console.error('Error generating description:', error);
			new Notice(`Description生成エラー: ${error.message}`);
		}
	}
} 