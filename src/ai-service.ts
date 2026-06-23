import { GoogleGenAI } from '@google/genai';
import { requestUrl } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS } from './settings';

export type AIProvider = 'gemini' | 'openai';

/**
 * Provider-agnostic text generation client.
 * Dispatches to Gemini (@google/genai) or OpenAI based on settings.
 */
export class AIService {
	private settings: CrystalPluginSettings;
	private genAI: GoogleGenAI | null = null;

	constructor(settings: CrystalPluginSettings) {
		this.settings = settings;
		this.updateSettings(settings);
	}

	/**
	 * 設定に基づいてクライアントを更新する
	 */
	updateSettings(settings: CrystalPluginSettings): void {
		this.settings = settings;
		const apiKey = settings.GeminiAPIKey || '';
		this.genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
	}

	/**
	 * 現在選択されているプロバイダーを取得する
	 */
	getProvider(): AIProvider {
		return this.settings.aiProvider === 'openai' ? 'openai' : 'gemini';
	}

	/**
	 * 選択中のプロバイダーが利用可能かチェックする
	 */
	isAvailable(): boolean {
		if (this.getProvider() === 'openai') {
			return !!this.settings.OpenAIAPIKey?.trim();
		}
		return !!this.settings.GeminiAPIKey?.trim();
	}

	/**
	 * プロンプトからテキストを生成する（選択中のプロバイダーを使用）
	 */
	async generateText(prompt: string): Promise<string> {
		if (this.getProvider() === 'openai') {
			return this.generateWithOpenAI(prompt);
		}
		return this.generateWithGemini(prompt);
	}

	private getGeminiModel(): string {
		return this.settings.GeminiModel || DEFAULT_SETTINGS.GeminiModel;
	}

	private getOpenAIModel(): string {
		return this.settings.OpenAIModel || DEFAULT_SETTINGS.OpenAIModel;
	}

	private async generateWithGemini(prompt: string): Promise<string> {
		if (!this.genAI) {
			throw new Error('Gemini API Key is not configured');
		}
		const response = await this.genAI.models.generateContent({
			model: this.getGeminiModel(),
			contents: prompt,
		});
		return (response.text ?? '').trim();
	}

	private async generateWithOpenAI(prompt: string): Promise<string> {
		const apiKey = this.settings.OpenAIAPIKey?.trim();
		if (!apiKey) {
			throw new Error('OpenAI API Key is not configured');
		}
		// ObsidianのrequestUrlを使用してCORS制限を回避する
		const response = await requestUrl({
			url: 'https://api.openai.com/v1/chat/completions',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: this.getOpenAIModel(),
				messages: [{ role: 'user', content: prompt }],
			}),
			throw: false,
		});

		if (response.status < 200 || response.status >= 300) {
			let message = `HTTP ${response.status}`;
			// response.json throws if the error body is not JSON (e.g. an HTML
			// error page); fall back to the status code in that case.
			try {
				message = response.json?.error?.message || message;
			} catch {
				// keep the HTTP status message
			}
			throw new Error(`OpenAI API error: ${message}`);
		}

		const text = response.json?.choices?.[0]?.message?.content ?? '';
		return String(text).trim();
	}
}
