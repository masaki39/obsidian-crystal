import { GoogleGenerativeAI } from '@google/generative-ai';
import { App, Editor, MarkdownView, Notice, TFile } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export class GeminiService {
	private genAI: GoogleGenerativeAI | null = null;
	private app: App;

	constructor(app: App, apiKey?: string) {
		this.app = app;
		if (apiKey) {
			this.genAI = new GoogleGenerativeAI(apiKey);
		}
	}

	/**
	 * APIキーを更新してサービスを再初期化する
	 */
	updateApiKey(apiKey: string): void {
		if (apiKey) {
			this.genAI = new GoogleGenerativeAI(apiKey);
		} else {
			this.genAI = null;
		}
	}

	/**
	 * 設定に基づいてサービスを更新する
	 */
	updateSettings(settings: CrystalPluginSettings): void {
		this.updateApiKey(settings.GeminiAPIKey || '');
	}

	/**
	 * Geminiサービスが利用可能かチェックする
	 */
	isAvailable(): boolean {
		return this.genAI !== null;
	}

	/**
	 * ファイルの内容からフロントマターを除去して取得する
	 */
	private async getContentWithoutFrontmatter(file: TFile): Promise<string> {
		const fileContent = await this.app.vault.read(file);
		// フロントマターを除去
		return fileContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
	}

	/**
	 * フロントマターにdescriptionを追加する
	 */
	private async updateFrontmatterDescription(file: TFile, description: string): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.description = description;
		});
	}

	/**
	 * Gemini APIを使用してdescriptionを生成する
	 */
	async generateDescription(content: string): Promise<string> {
		if (!this.genAI) {
			throw new Error('Gemini API Key is not configured');
		}

		try {
			const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
			
			const prompt = `以下のMarkdownファイルの内容を読んで、一文で簡潔な説明（description）を日本語で生成してください。検索用のキーワードを意識した説明にしてください。説明のみを出力し、余計な文言は含めないでください。

ファイル内容:
${content}`;

			const result = await model.generateContent(prompt);
			const response = await result.response;
			const text = response.text();
			
			return text.trim();
		} catch (error) {
			console.error('Error generating description:', error);
			throw new Error('Failed to generate description with Gemini API');
		}
	}

	/**
	 * 現在のファイルでdescription生成を実行する
	 */
	async generateDescriptionForCurrentFile(
		editor: Editor, 
		view: MarkdownView
	): Promise<void> {
		if (!this.isAvailable()) {
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
			const description = await this.generateDescription(contentForAnalysis);

			// フロントマターを更新
			await this.updateFrontmatterDescription(view.file, description);

			new Notice(`Description生成完了: ${description}`);

		} catch (error) {
			console.error('Error generating description:', error);
			new Notice(`Description生成エラー: ${error.message}`);
		}
	}
} 