import { Editor, MarkdownView, Notice } from 'obsidian';
import { AI_KEY_MISSING_NOTICE, type AIService } from './ai-service';
import { getPureTextFromLine } from './line-text';

export async function grammarCheckCurrentLine(ai: AIService, editor: Editor, view: MarkdownView): Promise<void> {
	if (!ai.isAvailable()) {
		new Notice(AI_KEY_MISSING_NOTICE);
		return;
	}

	const cursor = editor.getCursor();
	const currentLine = cursor.line;
	const currentLineText = editor.getLine(currentLine);

	if (!currentLineText.trim()) {
		new Notice('⚠️ 現在の行が空のため、文法チェックできません。');
		return;
	}

	// インデント部分を抽出（先頭の空白、タブ、リストマーカーなど）
	const indentMatch = currentLineText.match(/^(\s*(?:[-*+]\s+|\d+\.\s+|>\s*)*)/);
	const indent = indentMatch ? indentMatch[1] : '';
	const pureText = await getPureTextFromLine(currentLineText);

	if (!pureText.trim()) {
		new Notice('⚠️ 校正対象のテキストが空のため、文法チェックできません。');
		return;
	}

	try {
		new Notice('⏳ 文法チェック中...');

		const prompt = `以下のテキストの文法をチェックして、より自然で正しい文に校正してください。言語は変更せず、日本語の場合は日本語のまま、英語の場合は英語のまま校正してください。校正結果のみを出力し、余計な説明は含めないでください。

${pureText}`;

		const correctedText = await ai.generateText(prompt);

		// インデントを保持して校正結果を適用
		const finalText = indent + correctedText;
		const lineStart = { line: currentLine, ch: 0 };
		const lineEnd = { line: currentLine, ch: currentLineText.length };
		editor.replaceRange(finalText, lineStart, lineEnd);

		new Notice(`✅ 文法チェック完了: ${correctedText}`);

	} catch (error) {
		console.error('Error checking grammar:', error);
		new Notice(`❌ 文法チェックエラー: ${error.message}`);
	}
}
