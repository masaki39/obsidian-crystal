// Refactoring safety net: these pin values that are persisted (data.json,
// SecretStorage) or referenced from outside the code (CSS, other plugins).
// A change here means user data or styling would silently break.
import CrystalPlugin from '../main';
import { DEFAULT_SETTINGS } from '../src/settings';
import { VIEW_TYPE_GAMIFICATION, GAMIFICATION_FLASH_EVENT } from '../src/gamification';
import { PROPERTY_COLOR_STYLE_ID } from '../src/property-color';
import { WEEKDAY_ATTR } from '../src/daily-note-weekday';

describe('settings invariants', () => {
	it('keeps the set of setting keys', () => {
		expect(Object.keys(DEFAULT_SETTINGS).sort()).toMatchSnapshot();
	});

	it('keeps every default value', () => {
		expect(DEFAULT_SETTINGS).toMatchSnapshot();
	});
});

describe('constant invariants', () => {
	it('keeps view type, event name, style id and DOM attribute', () => {
		expect({
			VIEW_TYPE_GAMIFICATION,
			GAMIFICATION_FLASH_EVENT,
			PROPERTY_COLOR_STYLE_ID,
			WEEKDAY_ATTR,
		}).toEqual({
			VIEW_TYPE_GAMIFICATION: 'crystal-gamification-view',
			GAMIFICATION_FLASH_EVENT: 'crystal:gamification-flash',
			PROPERTY_COLOR_STYLE_ID: 'crystal-property-colors',
			WEEKDAY_ATTR: 'data-crystal-weekday',
		});
	});
});

describe('SecretStorage invariants', () => {
	const SECRET_KEYS = {
		GeminiAPIKey: 'crystal-gemini-api-key',
		OpenAIAPIKey: 'crystal-openai-api-key',
		blueskyIdentifier: 'crystal-bluesky-identifier',
		blueskyPassword: 'crystal-bluesky-password',
		gyazoAccessToken: 'crystal-gyazo-access-token',
	};

	function createPlugin(stored: Record<string, unknown>, secrets: Record<string, string>) {
		const plugin = new (CrystalPlugin as any)();
		const saved: unknown[] = [];
		const store = { ...secrets };
		plugin.loadData = async () => stored;
		plugin.saveData = async (data: unknown) => { saved.push(data); };
		plugin.app.secretStorage = {
			getSecret: async (key: string) => (key in store ? store[key] : null),
			setSecret: async (key: string, value: string) => { store[key] = value; },
		};
		return { plugin, saved, store };
	}

	it('reads secrets from the same SecretStorage keys', async () => {
		const secrets = Object.fromEntries(Object.values(SECRET_KEYS).map(key => [key, `value-of-${key}`]));
		const { plugin } = createPlugin({}, secrets);
		await plugin.loadSettings();
		for (const [field, key] of Object.entries(SECRET_KEYS)) {
			expect(plugin.settings[field]).toBe(`value-of-${key}`);
		}
	});

	it('migrates secrets from data.json into SecretStorage and strips them', async () => {
		const stored = { ...Object.fromEntries(Object.keys(SECRET_KEYS).map(field => [field, `old-${field}`])), dailyNoteAutoSort: false };
		const { plugin, saved, store } = createPlugin(stored, {});
		await plugin.loadSettings();
		for (const [field, key] of Object.entries(SECRET_KEYS)) {
			expect(store[key]).toBe(`old-${field}`);
		}
		expect(saved).toEqual([{ dailyNoteAutoSort: false }]);
	});
});
