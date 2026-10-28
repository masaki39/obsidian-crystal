import type { App } from 'obsidian';
import type { CrystalPluginSettings } from '../settings';

// Settings stored in Obsidian's SecretStorage instead of data.json.
export const SECRET_FIELDS: (keyof CrystalPluginSettings)[] = [
	'GeminiAPIKey',
	'OpenAIAPIKey',
	'blueskyIdentifier',
	'blueskyPassword',
	'gyazoAccessToken',
];

const SECRET_KEY_MAP: Record<keyof CrystalPluginSettings, string> = {
	GeminiAPIKey: 'crystal-gemini-api-key',
	OpenAIAPIKey: 'crystal-openai-api-key',
	blueskyIdentifier: 'crystal-bluesky-identifier',
	blueskyPassword: 'crystal-bluesky-password',
	gyazoAccessToken: 'crystal-gyazo-access-token',
} as any;

export function secretKey(field: keyof CrystalPluginSettings): string {
	return SECRET_KEY_MAP[field];
}

/** Load secrets from SecretStorage into `settings`; migrate from old data.json if needed. */
export async function loadSecrets(app: App, settings: CrystalPluginSettings): Promise<void> {
	for (const field of SECRET_FIELDS) {
		const key = secretKey(field);
		const fromStore = await app.secretStorage.getSecret(key);
		if (fromStore !== null) {
			(settings as any)[field] = fromStore;
		} else if ((settings as any)[field]) {
			// Migrate: move value from data.json into SecretStorage
			await app.secretStorage.setSecret(key, (settings as any)[field]);
		}
	}
}

/** Shallow copy of `data` without the secret fields, for data.json. */
export function withoutSecrets(data: any): any {
	const clean: any = Object.assign({}, data);
	for (const field of SECRET_FIELDS) {
		delete clean[field];
	}
	return clean;
}

/** Write secrets to SecretStorage (fire-and-forget, as before). */
export function saveSecrets(app: App, settings: CrystalPluginSettings): void {
	for (const field of SECRET_FIELDS) {
		const value = (settings as any)[field] as string;
		app.secretStorage.setSecret(secretKey(field), value ?? '');
	}
}
