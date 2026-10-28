import { App, Editor, MarkdownView, Notice, TFile } from 'obsidian';
import { AI_KEY_MISSING_NOTICE, type AIService } from './ai-service';

/**
 * ファイルの内容からフロントマターを除去して取得する
 */
async function getContentWithoutFrontmatter(app: App, file: TFile): Promise<string> {
	const fileContent = await app.vault.read(file);
	// フロントマターを除去
	return fileContent.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

/**
 * フロントマターにdescriptionを追加する
 */
async function updateFrontmatterDescription(app: App, file: TFile, description: string): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.description = description;
	});
}

/**
 * AIを使用してdescriptionを生成する
 */
export async function generateDescription(ai: AIService, title: string, content: string): Promise<string> {
	try {
		const prompt = `以下のMarkdownファイルの内容を読んで、一文で簡潔な説明（description）を日本語で生成してください。検索用のキーワードを意識した説明にしてください。説明のみを出力し、余計な文言は含めないでください。
ファイル名:
${title}
ファイル内容:
${content}`;

		return await ai.generateText(prompt);
	} catch (error) {
		console.error('Error generating description:', error);
		throw new Error('Failed to generate description');
	}
}

/**
 * 現在のファイルでdescription生成を実行する
 */
export async function generateDescriptionForCurrentFile(app: App, ai: AIService, editor: Editor, view: MarkdownView): Promise<void> {
	if (!ai.isAvailable()) {
		new Notice(AI_KEY_MISSING_NOTICE);
		return;
	}

	if (!view.file) {
		new Notice('⚠️ 現在のファイルが見つかりません。');
		return;
	}

	try {
		new Notice('⏳ Descriptionを生成中...');

		// フロントマターを除去したコンテンツを取得
		const titleForAnalysis = view.file.basename;
		const contentForAnalysis = await getContentWithoutFrontmatter(app, view.file);

		// AIを使用してdescriptionを生成
		const description = await generateDescription(ai, titleForAnalysis, contentForAnalysis);

		// フロントマターを更新
		await updateFrontmatterDescription(app, view.file, description);

		new Notice(`✅ Description生成完了: ${description}`);

	} catch (error) {
		console.error('Error generating description:', error);
		new Notice(`❌ Description生成エラー: ${error.message}`);
	}
}
