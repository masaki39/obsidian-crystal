import type { App, Editor, MarkdownView, Plugin } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import { AIService } from './ai-service';
import { generateDescriptionForCurrentFile } from './description';
import { grammarCheckCurrentLine } from './grammar';
import { rewriteWithInstruction } from './rewrite';
import { translateAboveCursorText, translateBelowCursorText, translateSelectedText } from './translate';

export class AiCommands {
	private ai: AIService;
	private app: App;
	private plugin: Plugin;

	constructor(app: App, plugin: Plugin, settings: CrystalPluginSettings) {
		this.app = app;
		this.plugin = plugin;
		this.ai = new AIService(settings);
	}

	/**
	 * 設定に基づいてサービスを更新する
	 */
	updateSettings(settings: CrystalPluginSettings): void {
		this.ai.updateSettings(settings);
	}

	/**
	 * 選択中のAIプロバイダーが利用可能かチェックする
	 */
	isAvailable(): boolean {
		return this.ai.isAvailable();
	}

	async generateGitSummary(diff: string, date: string): Promise<string> {
		const prompt = `${date}の活動内容について、以下のgit diffを読んで1〜2文の日本語で簡潔に要約してください。要約のみを出力し、余計な説明は含めないでください。\n\n${diff}`;
		return await this.ai.generateText(prompt);
	}

	async onload() {

		// AI Description Generation Command
		this.plugin.addCommand({
			id: 'crystal-generate-description',
			name: 'AI: Generate description for current file',
			icon: 'sparkles',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				generateDescriptionForCurrentFile(this.app, this.ai, editor, view);
			}
		});

		// AI Translate Selected Text Command
		this.plugin.addCommand({
			id: 'crystal-translate-selected-text',
			name: 'AI: Translate selected text',
			icon: 'languages',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				translateSelectedText(this.ai, editor, view);
			}
		});

		// AI Translate Above Cursor Text Command
		this.plugin.addCommand({
			id: 'crystal-translate-above-cursor-text',
			name: 'AI: Translate above cursor text',
			icon: 'arrow-up',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				translateAboveCursorText(this.ai, editor, view);
			}
		});

		// AI Grammar Check Command
		this.plugin.addCommand({
			id: 'crystal-grammar-check-current-line',
			name: 'AI: Grammar check current line',
			icon: 'spell-check',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				grammarCheckCurrentLine(this.ai, editor, view);
			}
		});


		this.plugin.addCommand({
			id: 'crystal-translate-below-cursor-text',
			name: 'AI: Translate below cursor text',
			icon: 'arrow-down',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				translateBelowCursorText(this.ai, editor, view);
			}
		});

		// Rewrite selected text or whole note (replace)
		this.plugin.addCommand({
			id: 'crystal-gemini-rewrite-replace',
			name: 'AI: Rewrite (replace selection or whole note)',
			icon: 'wand-sparkles',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				rewriteWithInstruction(this.app, this.ai, editor, view, 'replace');
			}
		});

		// Rewrite selected text or whole note (append result)
		this.plugin.addCommand({
			id: 'crystal-gemini-rewrite-append',
			name: 'AI: Rewrite (append result at end)',
			icon: 'text-cursor-input',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				rewriteWithInstruction(this.app, this.ai, editor, view, 'append');
			}
		});
	}
}
