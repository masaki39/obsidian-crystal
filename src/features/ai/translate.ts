import { Editor, MarkdownView, Notice } from 'obsidian';
import { AI_KEY_MISSING_NOTICE, type AIService } from './ai-service';
import { getLineIndent, getPureTextFromLine } from './line-text';

export async function translateSelectedText(ai: AIService, editor: Editor, view: MarkdownView): Promise<void> {
	if (!ai.isAvailable()) {
		new Notice(AI_KEY_MISSING_NOTICE);
		return;
	}

	const selectedText = editor.getSelection();

	if (!selectedText.trim()) {
		new Notice('⚠️ Selection is empty; nothing to translate');
		return;
	}

	try {
		new Notice('⏳ Translating…');

		const prompt = `以下のテキストを翻訳してください。日本語の場合は英語に、英語の場合は日本語に翻訳してください。翻訳結果のみを出力し、余計な説明は含めないでください。

${selectedText}`;

		const translatedText = await ai.generateText(prompt);

		// 選択範囲を翻訳結果で置換
		editor.replaceSelection(translatedText);
		new Notice(`✅ Translated: ${translatedText}`);

	} catch (error) {
		console.error('Error translating text:', error);
		new Notice(`❌ Translation failed: ${error.message}`);
	}
}

export async function translateAdjacentText(ai: AIService, editor: Editor, view: MarkdownView, direction: 'above' | 'below'): Promise<void> {
	if (!ai.isAvailable()) {
		new Notice(AI_KEY_MISSING_NOTICE);
		return;
	}

	const cursor = editor.getCursor();
	const currentLine = cursor.line;
	const totalLines = editor.lineCount();

	// 境界チェック
	if (direction === 'above' && currentLine === 0) {
		new Notice('⚠️ Cursor is on the first line; there is no line above');
		return;
	}

	if (direction === 'below' && currentLine === totalLines - 1) {
		new Notice('⚠️ Cursor is on the last line; there is no line below');
		return;
	}

	// 隣接行のテキストを取得
	const targetLineIndex = direction === 'above' ? currentLine - 1 : currentLine + 1;
	const targetLineText = editor.getLine(targetLineIndex);
	const targetLinePureText = await getPureTextFromLine(targetLineText);

	if (!targetLinePureText) {
		const directionText = direction === 'above' ? 'above' : 'below';
		new Notice(`⚠️ The line ${directionText} is empty; nothing to translate`);
		return;
	}

	try {
		const directionText = direction === 'above' ? 'above' : 'below';
		new Notice(`⏳ Translating the line ${directionText}…`);

		const prompt = `以下のテキストを翻訳してください。日本語の場合は英語に、英語の場合は日本語に翻訳してください。翻訳結果のみを出力し、余計な説明は含めないでください。

${targetLinePureText}`;

		const translatedText = await ai.generateText(prompt);


		if (editor.getSelection()) {
			// 選択範囲を翻訳結果で置換
			editor.replaceSelection(translatedText);
		} else {
			// カーソルのある行を翻訳結果で置換（インデント・リストマーカーは保持）
			const currentLineText = editor.getLine(currentLine);
			const indent = getLineIndent(currentLineText);
			const newLineText = indent + translatedText;
			editor.replaceRange(
				newLineText,
				{ line: currentLine, ch: 0 },
				{ line: currentLine, ch: currentLineText.length }
			);
			editor.setCursor({ line: currentLine, ch: newLineText.length });
		}

		new Notice(`✅ Translated: ${translatedText}`);

	} catch (error) {
		console.error('Error translating text:', error);
		new Notice(`❌ Translation failed: ${error.message}`);
	}
}

export async function translateAboveCursorText(ai: AIService, editor: Editor, view: MarkdownView): Promise<void> {
	await translateAdjacentText(ai, editor, view, 'above');
}

export async function translateBelowCursorText(ai: AIService, editor: Editor, view: MarkdownView): Promise<void> {
	await translateAdjacentText(ai, editor, view, 'below');
}
