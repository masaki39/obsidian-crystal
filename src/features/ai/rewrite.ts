import { App, Editor, MarkdownView, Notice } from 'obsidian';
import { promptForText } from '../../shared/ui/prompt-modal';
import { AI_KEY_MISSING_NOTICE, type AIService } from './ai-service';

async function promptRewriteInstruction(app: App, mode: 'replace' | 'append'): Promise<string | null> {
	const title = mode === 'append' ? 'AIへの追記指示' : 'AIへの書き換え指示';
	const placeholder =
		mode === 'append'
			? '例: 要約を3行で追加してください / 次の手順を書いてください'
			: '例: 箇条書きでまとめてください / ですます調に直してください';
	const buttonText = mode === 'append' ? '追記を生成' : '書き換え';
	return promptForText(
		app,
		title,
		placeholder,
		buttonText,
		'',
		true
	);
}

export async function rewriteWithInstruction(app: App, ai: AIService, editor: Editor, view: MarkdownView, mode: 'replace' | 'append'): Promise<void> {
	if (!ai.isAvailable()) {
		new Notice(AI_KEY_MISSING_NOTICE);
		return;
	}

	const instruction = await promptRewriteInstruction(app, mode);
	if (!instruction || !instruction.trim()) {
		new Notice('⚠️ 指示が入力されていません。');
		return;
	}

	const selection = editor.getSelection();
	const useSelection = !!selection && selection.trim().length > 0;
	const targetText = useSelection ? selection : editor.getValue();

	if (!targetText.trim()) {
		new Notice('⚠️ 変換対象のテキストがありません。');
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
		new Notice('⏳ AIで書き換え中...');
		const prompt = mode === 'replace' ? basePromptReplace : basePromptAppend;

		const rewritten = await ai.generateText(prompt);

		if (!rewritten) {
			new Notice('⚠️ AIから結果が返りませんでした。');
			return;
		}

		if (mode === 'replace') {
			if (useSelection) {
				editor.replaceSelection(rewritten);
			} else {
				editor.setValue(rewritten);
			}
			new Notice('✅ 書き換え完了（置換）。');
		} else {
			const needsBreak = editor.getValue().endsWith('\n') ? '' : '\n';
			const appendText = `${needsBreak}${rewritten}\n`;
			editor.replaceRange(appendText, { line: editor.lineCount(), ch: 0 });
			new Notice('✅ 結果を末尾に追記しました。');
		}
	} catch (error) {
		console.error('Error rewriting text:', error);
		new Notice(`❌ 書き換えエラー: ${error.message}`);
	}
}
