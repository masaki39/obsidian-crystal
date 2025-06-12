import { GoogleGenerativeAI } from '@google/generative-ai';
import { App, Editor, MarkdownView, Notice, TFile } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { promptForText } from './utils';
import { AnkiService } from './anki-service';

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

	private async getPureTextFromLine(lineText: string): Promise<string> {
		// インデント部分を抽出（先頭の空白、タブ、リストマーカーなど）
		const indentMatch = lineText.match(/^(\s*(?:[-*+]\s+|\d+\.\s+|>\s*)*)/);
		const indent = indentMatch ? indentMatch[1] : '';
		return lineText.slice(indent.length).trim();
	}

	/**
	 * Gemini APIを使用してdescriptionを生成する
	 */
	async generateDescription(title: string, content: string): Promise<string> {
		if (!this.genAI) {
			throw new Error('Gemini API Key is not configured');
		}

		try {
			const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
			
			const prompt = `以下のMarkdownファイルの内容を読んで、一文で簡潔な説明（description）を日本語で生成してください。検索用のキーワードを意識した説明にしてください。説明のみを出力し、余計な文言は含めないでください。
ファイル名:
${title}
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
			const titleForAnalysis = view.file.basename;
			const contentForAnalysis = await this.getContentWithoutFrontmatter(view.file);
			
			if (!contentForAnalysis.trim()) {
				new Notice('ファイル内容が空のため、descriptionを生成できません。');
				return;
			}

			// Geminiを使用してdescriptionを生成
			const description = await this.generateDescription(titleForAnalysis, contentForAnalysis);

			// フロントマターを更新
			await this.updateFrontmatterDescription(view.file, description);

			new Notice(`Description生成完了: ${description}`);

		} catch (error) {
			console.error('Error generating description:', error);
			new Notice(`Description生成エラー: ${error.message}`);
		}
	}

	async translateSelectedText(editor: Editor, view: MarkdownView): Promise<void> {
		if (!this.isAvailable()) {
			new Notice('Gemini API Keyが設定されていません。設定からAPIキーを入力してください。');
			return;
		}

		const selectedText = editor.getSelection();
		
		if (!selectedText.trim()) {
			new Notice('選択されたテキストが空のため、翻訳できません。');
			return;
		}
		
		try {
			new Notice('翻訳中...');
			
			const model = this.genAI!.getGenerativeModel({ model: "gemini-2.0-flash" });
			
			const prompt = `以下の日本語テキストを自然な英語に翻訳してください。翻訳結果のみを出力し、余計な説明は含めないでください。

${selectedText}`;

			const result = await model.generateContent(prompt);
			const response = await result.response;
			const translatedText = response.text().trim();
			
			// 選択範囲を翻訳結果で置換
			editor.replaceSelection(translatedText);
			new Notice(`翻訳完了: ${translatedText}`);
			
		} catch (error) {
			console.error('Error translating text:', error);
			new Notice(`翻訳エラー: ${error.message}`);
		}
	}

	async translateAboveCursorText(editor: Editor, view: MarkdownView): Promise<void> {
		if (!this.isAvailable()) {
			new Notice('Gemini API Keyが設定されていません。設定からAPIキーを入力してください。');
			return;
		}
		
		const cursor = editor.getCursor();
		const currentLine = cursor.line;
		
		// カーソルが最初の行にある場合は処理できない
		if (currentLine === 0) {
			new Notice('カーソルが最初の行にあるため、上の行が存在しません。');
			return;
		}
		
		// 上の行のテキストを取得
		const previousLineText = editor.getLine(currentLine - 1);
		const previousLinePureText = await this.getPureTextFromLine(previousLineText);

		if (!previousLinePureText) {
			new Notice('上の行が空行のため、翻訳できません。');
			return;
		}
		
		try {
			new Notice('翻訳中...');
			
			const model = this.genAI!.getGenerativeModel({ model: "gemini-2.0-flash" });
			
			const prompt = `以下の日本語テキストを自然な英語に翻訳してください。翻訳結果のみを出力し、余計な説明は含めないでください。

${previousLinePureText}`;

			const result = await model.generateContent(prompt);
			const response = await result.response;
			const translatedText = response.text().trim();
			

			if (editor.getSelection()) {
				// 選択範囲を翻訳結果で置換
				editor.replaceSelection(translatedText);
			} else {
				// カーソル位置に翻訳結果を挿入
				editor.replaceRange(translatedText, cursor);
			}
			
			new Notice(`翻訳完了: ${translatedText}`);
			
		} catch (error) {
			console.error('Error translating text:', error);
			new Notice(`翻訳エラー: ${error.message}`);
		}
	}

	async grammarCheckCurrentLine(editor: Editor, view: MarkdownView): Promise<void> {
		if (!this.isAvailable()) {
			new Notice('Gemini API Keyが設定されていません。設定からAPIキーを入力してください。');
			return;
		}

		const cursor = editor.getCursor();
		const currentLine = cursor.line;
		const currentLineText = editor.getLine(currentLine);

		if (!currentLineText.trim()) {
			new Notice('現在の行が空のため、文法チェックできません。');
			return;
		}

		// インデント部分を抽出（先頭の空白、タブ、リストマーカーなど）
		const indentMatch = currentLineText.match(/^(\s*(?:[-*+]\s+|\d+\.\s+|>\s*)*)/);
		const indent = indentMatch ? indentMatch[1] : '';
		const pureText = await this.getPureTextFromLine(currentLineText);

		if (!pureText.trim()) {
			new Notice('校正対象のテキストが空のため、文法チェックできません。');
			return;
		}

		try {
			new Notice('文法チェック中...');

			const model = this.genAI!.getGenerativeModel({ model: "gemini-2.0-flash" });

			const prompt = `以下のテキストの文法をチェックして、より自然で正しい文に校正してください。言語は変更せず、日本語の場合は日本語のまま、英語の場合は英語のまま校正してください。校正結果のみを出力し、余計な説明は含めないでください。

${pureText}`;

			const result = await model.generateContent(prompt);
			const response = await result.response;
			const correctedText = response.text().trim();

			// インデントを保持して校正結果を適用
			const finalText = indent + correctedText;
			const lineStart = { line: currentLine, ch: 0 };
			const lineEnd = { line: currentLine, ch: currentLineText.length };
			editor.replaceRange(finalText, lineStart, lineEnd);

			new Notice(`文法チェック完了: ${correctedText}`);

		} catch (error) {
			console.error('Error checking grammar:', error);
			new Notice(`文法チェックエラー: ${error.message}`);
		}
	}

	async addNoteToAnki() {
		if (!this.isAvailable()) {
			new Notice('Gemini API Keyが設定されていません。設定からAPIキーを入力してください。');
			return;
		}
		const front = await promptForText(this.app, '表面', '英単語を入力してください', '追加');
        if (!front) {
			return;
        }
		const model = this.genAI!.getGenerativeModel({ model: "gemini-2.0-flash" });
		const prompt = `以下のテキストの日本語訳を出力してください。日本語訳のみを出力し、余計な説明は含めないでください。不明の場合は何も返さないでください('')。
		
${front}`;
        const result = await model.generateContent(prompt);
		if (!result){
			new Notice(`不明な英単語`);
			return;
		}
        const response = await result.response;
        const translatedText = response.text().trim();
        const back = await promptForText(this.app, '裏面', '日本語を入力してください', '追加', translatedText);
        if (!back) {
			return;
        }
		await AnkiService.addNote(front, back);
        new Notice('Note added to Anki');

	}

} 