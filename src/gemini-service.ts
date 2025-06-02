import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiService {
	private genAI: GoogleGenerativeAI | null = null;

	constructor(apiKey: string) {
		if (apiKey) {
			this.genAI = new GoogleGenerativeAI(apiKey);
		}
	}

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
} 