import { GeminiService } from './gemini-service';
import { CrystalPluginSettings } from './settings';

export class ServiceManager {
	private geminiService: GeminiService | null = null;

	/**
	 * 設定に基づいてGeminiサービスを更新する
	 */
	updateGeminiService(settings: CrystalPluginSettings): void {
		if (settings.GeminiAPIKey) {
			this.geminiService = new GeminiService(settings.GeminiAPIKey);
		} else {
			this.geminiService = null;
		}
	}

	/**
	 * 現在のGeminiサービスインスタンスを取得する
	 */
	getGeminiService(): GeminiService | null {
		return this.geminiService;
	}

	/**
	 * Geminiサービスが利用可能かチェックする
	 */
	isGeminiServiceAvailable(): boolean {
		return this.geminiService !== null;
	}
} 