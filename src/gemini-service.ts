import { GoogleGenerativeAI } from '@google/generative-ai';
import { App, Editor, MarkdownView, Notice, TFile, Plugin } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { promptForText } from './utils';
import { AnkiService } from './anki-service';

export class GeminiService {
	private genAI: GoogleGenerativeAI | null = null;
	private app: App;
	private plugin: Plugin;
	private settings: CrystalPluginSettings | null = null;

	constructor(app: App, plugin: Plugin, apiKey?: string) {
		this.app = app;
		this.plugin = plugin;
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
		this.settings = settings;
		this.updateApiKey(settings.GeminiAPIKey || '');
	}

	/**
	 * Geminiサービスが利用可能かチェックする
	 */
	isAvailable(): boolean {
		return this.genAI !== null;
	}

	/**
	 * 設定からモデル名を取得する（設定がない場合はデフォルトモデルを返す）
	 */
	private getModelName(): string {
		return this.settings?.GeminiModel || 'gemini-2.0-flash';
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
			const model = this.genAI.getGenerativeModel({ model: this.getModelName() });
			
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
			
			const model = this.genAI!.getGenerativeModel({ model: this.getModelName() });
			
			const prompt = `以下のテキストを翻訳してください。日本語の場合は英語に、英語の場合は日本語に翻訳してください。翻訳結果のみを出力し、余計な説明は含めないでください。

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

	async translateAdjacentText(editor: Editor, view: MarkdownView, direction: 'above' | 'below'): Promise<void> {
		if (!this.isAvailable()) {
			new Notice('Gemini API Keyが設定されていません。設定からAPIキーを入力してください。');
			return;
		}
		
		const cursor = editor.getCursor();
		const currentLine = cursor.line;
		const totalLines = editor.lineCount();
		
		// 境界チェック
		if (direction === 'above' && currentLine === 0) {
			new Notice('カーソルが最初の行にあるため、上の行が存在しません。');
			return;
		}
		
		if (direction === 'below' && currentLine === totalLines - 1) {
			new Notice('カーソルが最後の行にあるため、下の行が存在しません。');
			return;
		}
		
		// 隣接行のテキストを取得
		const targetLineIndex = direction === 'above' ? currentLine - 1 : currentLine + 1;
		const targetLineText = editor.getLine(targetLineIndex);
		const targetLinePureText = await this.getPureTextFromLine(targetLineText);

		if (!targetLinePureText) {
			const directionText = direction === 'above' ? '上' : '下';
			new Notice(`${directionText}の行が空行のため、翻訳できません。`);
			return;
		}
		
		try {
			const directionText = direction === 'above' ? '上' : '下';
			new Notice(`${directionText}の行を翻訳中...`);
			
			const model = this.genAI!.getGenerativeModel({ model: this.getModelName() });
			
			const prompt = `以下のテキストを翻訳してください。日本語の場合は英語に、英語の場合は日本語に翻訳してください。翻訳結果のみを出力し、余計な説明は含めないでください。

${targetLinePureText}`;

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

	async translateAboveCursorText(editor: Editor, view: MarkdownView): Promise<void> {
		await this.translateAdjacentText(editor, view, 'above');
	}

	async translateBelowCursorText(editor: Editor, view: MarkdownView): Promise<void> {
		await this.translateAdjacentText(editor, view, 'below');
	}

	private async promptRewriteInstruction(mode: 'replace' | 'append'): Promise<string | null> {
		const title = mode === 'append' ? 'Geminiへの追記指示' : 'Geminiへの書き換え指示';
		const placeholder =
			mode === 'append'
				? '例: 要約を3行で追加してください / 次の手順を書いてください'
				: '例: 箇条書きでまとめてください / ですます調に直してください';
		const buttonText = mode === 'append' ? '追記を生成' : '書き換え';
		return promptForText(
			this.app,
			title,
			placeholder,
			buttonText,
			'',
			true
		);
	}

	private async rewriteWithInstruction(
		editor: Editor,
		view: MarkdownView,
		mode: 'replace' | 'append'
	): Promise<void> {
		if (!this.isAvailable()) {
			new Notice('Gemini API Keyが設定されていません。設定からAPIキーを入力してください。');
			return;
		}

		const instruction = await this.promptRewriteInstruction(mode);
		if (!instruction || !instruction.trim()) {
			new Notice('指示が入力されていません。');
			return;
		}

		const selection = editor.getSelection();
		const useSelection = !!selection && selection.trim().length > 0;
		const targetText = useSelection ? selection : editor.getValue();

		if (!targetText.trim()) {
			new Notice('変換対象のテキストがありません。');
			return;
		}

		const basePromptReplace = `以下の指示に従ってMarkdownテキストを書き換えてください。Markdownの構造やコードブロックはできるだけ維持してください。結果のみを出力し、説明文は不要です。

指示:
${instruction}

テキスト:
${targetText}`;

		const basePromptAppend = `以下のテキストを参照し、指示に沿った「追記用のMarkdownテキスト」を生成してください。元のテキストを繰り返したり書き換えたりしないで、追加すべき内容だけを返してください。結果のみを出力し、説明文は不要です。

指示:
${instruction}

テキスト:
${targetText}`;

		try {
			new Notice('Geminiで書き換え中...');
			const model = this.genAI!.getGenerativeModel({ model: this.getModelName() });
			const prompt = mode === 'replace' ? basePromptReplace : basePromptAppend;

			const result = await model.generateContent(prompt);
			const response = await result.response;
			const rewritten = response.text().trim();

			if (!rewritten) {
				new Notice('Geminiから結果が返りませんでした。');
				return;
			}

			if (mode === 'replace') {
				if (useSelection) {
					editor.replaceSelection(rewritten);
				} else {
					editor.setValue(rewritten);
				}
				new Notice('書き換え完了（置換）。');
			} else {
				const needsBreak = editor.getValue().endsWith('\n') ? '' : '\n';
				const appendText = `${needsBreak}${rewritten}\n`;
				editor.replaceRange(appendText, { line: editor.lineCount(), ch: 0 });
				new Notice('結果を末尾に追記しました。');
			}
		} catch (error) {
			console.error('Error rewriting text:', error);
			new Notice(`書き換えエラー: ${error.message}`);
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

			const model = this.genAI!.getGenerativeModel({ model: this.getModelName() });

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
		const front = await promptForText(this.app, '表面', '英単語を入力してください', '追加', this.app.workspace.getActiveViewOfType(MarkdownView)?.editor?.getSelection() || '');
        if (!front) {
			return;
        }
		const model = this.genAI!.getGenerativeModel({ model: this.getModelName() });
		const prompt = `以下のテキストの日本語訳を出力してください。日本語訳のみを出力し、余計な説明は含めないでください。複数の意味がある場合はコンマ+半角スペース区切り(, )にしてください。不明の場合は何も返さないでください('')。
		
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
		const ankiService = new AnkiService(this.app);
		await ankiService.addNote(front, back);
        new Notice('Note added to Anki');

	}

	async onload() {

		// AI Description Generation Command
		this.plugin.addCommand({
			id: 'crystal-generate-description',
			name: 'Generate Description for Current File',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.generateDescriptionForCurrentFile(editor, view);
			}
		});

		// AI Translate Selected Text Command
		this.plugin.addCommand({
			id: 'crystal-translate-selected-text',
			name: 'Translate Selected Text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.translateSelectedText(editor, view);
			}
		});

		// AI Translate Above Cursor Text Command
		this.plugin.addCommand({
			id: 'crystal-translate-above-cursor-text',
			name: 'Translate Above Cursor Text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.translateAboveCursorText(editor, view);
			}
		});

		// AI Grammar Check Command
		this.plugin.addCommand({
			id: 'crystal-grammar-check-current-line',
			name: 'Grammar Check Current Line',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.grammarCheckCurrentLine(editor, view);
			}
		});


		this.plugin.addCommand({
			id: 'crystal-translate-below-cursor-text',
			name: 'Translate Below Cursor Text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.translateBelowCursorText(editor, view);
			}
		});

		// Rewrite selected text or whole note (replace)
		this.plugin.addCommand({
			id: 'crystal-gemini-rewrite-replace',
			name: 'Gemini Rewrite (Replace selection or whole note)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.rewriteWithInstruction(editor, view, 'replace');
			}
		});

		// Rewrite selected text or whole note (append result)
		this.plugin.addCommand({
			id: 'crystal-gemini-rewrite-append',
			name: 'Gemini Rewrite (Append result at end)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.rewriteWithInstruction(editor, view, 'append');
			}
		});
	}
} 
