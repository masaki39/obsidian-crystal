import { GoogleGenAI } from '@google/genai';
import { requestUrl } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import { DEFAULT_SETTINGS } from '../../settings/defaults';

export const AI_KEY_MISSING_NOTICE = '⚠️ AIが設定されていません。設定でプロバイダーを確認してください（OpenAI/Gemini はAPIキー、Ollama はBase URLとモデル名）。';

export type AIProvider = 'gemini' | 'openai' | 'ollama';

/**
 * Provider-agnostic text generation client.
 * Dispatches to Gemini (@google/genai), OpenAI, or a local Ollama server
 * based on settings.
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
		const provider = this.settings.aiProvider;
		return provider === 'openai' || provider === 'ollama' ? provider : 'gemini';
	}

	/**
	 * 選択中のプロバイダーが利用可能かチェックする
	 */
	isAvailable(): boolean {
		switch (this.getProvider()) {
			case 'openai':
				return !!this.settings.OpenAIAPIKey?.trim();
			case 'ollama':
				return !!this.settings.OllamaBaseUrl?.trim() && !!this.settings.OllamaModel?.trim();
			default:
				return !!this.settings.GeminiAPIKey?.trim();
		}
	}

	/**
	 * プロンプトからテキストを生成する（選択中のプロバイダーを使用）
	 */
	async generateText(prompt: string): Promise<string> {
		switch (this.getProvider()) {
			case 'openai':
				return this.generateWithOpenAI(prompt);
			case 'ollama':
				return this.generateWithOllama(prompt);
			default:
				return this.generateWithGemini(prompt);
		}
	}

	private getGeminiModel(): string {
		return this.settings.GeminiModel || DEFAULT_SETTINGS.GeminiModel;
	}

	private getOpenAIModel(): string {
		return this.settings.OpenAIModel || DEFAULT_SETTINGS.OpenAIModel;
	}

	private getOllamaModel(): string {
		return this.settings.OllamaModel?.trim() || DEFAULT_SETTINGS.OllamaModel;
	}

	private getOllamaBaseUrl(): string {
		return (this.settings.OllamaBaseUrl?.trim() || DEFAULT_SETTINGS.OllamaBaseUrl).replace(/\/+$/, '');
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

	private async generateWithOllama(prompt: string): Promise<string> {
		const baseUrl = this.getOllamaBaseUrl();
		if (!baseUrl) {
			throw new Error('Ollama Base URL is not configured');
		}
		// ObsidianのrequestUrlを使用してCORS制限を回避する
		const response = await requestUrl({
			url: `${baseUrl}/api/generate`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: this.getOllamaModel(),
				prompt,
				stream: false,
			}),
			throw: false,
		});

		if (response.status < 200 || response.status >= 300) {
			let message = `HTTP ${response.status}`;
			// response.json throws if the error body is not JSON; fall back to
			// the status code in that case.
			try {
				message = response.json?.error || message;
			} catch {
				// keep the HTTP status message
			}
			if (response.status === 404) {
				message += ` (model "${this.getOllamaModel()}" not found — run \`ollama pull ${this.getOllamaModel()}\`)`;
			}
			throw new Error(`Ollama API error: ${message}`);
		}

		const text = response.json?.response ?? '';
		return String(text).trim();
	}
}
