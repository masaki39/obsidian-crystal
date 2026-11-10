import { App, Editor, MarkdownView, Notice } from 'obsidian';
import { promptForText } from '../../shared/ui/prompt-modal';
import { AI_KEY_MISSING_NOTICE, type AIService } from './ai-service';

async function promptRewriteInstruction(app: App, mode: 'replace' | 'append'): Promise<string | null> {
	const title = mode === 'append' ? 'Instructions for AI (append)' : 'Instructions for AI (rewrite)';
	const placeholder =
		mode === 'append'
			? 'e.g. Add a 3-line summary / Write the next steps'
			: 'e.g. Summarize as bullet points / Make the tone more formal';
	const buttonText = mode === 'append' ? 'Generate' : 'Rewrite';
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
		new Notice('⚠️ No instructions entered');
		return;
	}

	const selection = editor.getSelection();
	const useSelection = !!selection && selection.trim().length > 0;
	const targetText = useSelection ? selection : editor.getValue();

	if (!targetText.trim()) {
		new Notice('⚠️ No text to rewrite');
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
		new Notice('⏳ Rewriting with AI…');
		const prompt = mode === 'replace' ? basePromptReplace : basePromptAppend;

		const rewritten = await ai.generateText(prompt);

		if (!rewritten) {
			new Notice('⚠️ AI returned no result');
			return;
		}

		if (mode === 'replace') {
			if (useSelection) {
				editor.replaceSelection(rewritten);
			} else {
				editor.setValue(rewritten);
			}
			new Notice('✅ Rewrite complete (replaced)');
		} else {
			const needsBreak = editor.getValue().endsWith('\n') ? '' : '\n';
			const appendText = `${needsBreak}${rewritten}\n`;
			editor.replaceRange(appendText, { line: editor.lineCount(), ch: 0 });
			new Notice('✅ Result appended at the end');
		}
	} catch (error) {
		console.error('Error rewriting text:', error);
		new Notice(`❌ Rewrite failed: ${error.message}`);
	}
}
