import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addSetting, addVerifyButton, secretSetting, settingGroup, textSetting } from '../components';
import { verifyGeminiKey, verifyOllama, verifyOpenAIKey } from '../verifiers';

const OPENAI_MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'];
const GEMINI_MODELS = [
	'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite',
	'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemma-4-31b-it', 'gemma-4-26b-a4b-it',
];

export function renderAiSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const general = settingGroup(containerEl);
	addSetting(general, setting => setting
		.setName('AI provider')
		.setDesc('Provider used by the AI editor commands.')
		.addDropdown(dropdown => dropdown
			.addOption('openai', 'OpenAI')
			.addOption('gemini', 'Gemini')
			.addOption('ollama', 'Ollama (local)')
			.setValue(plugin.settings.aiProvider)
			.onChange(async (value) => {
				plugin.settings.aiProvider = value as 'gemini' | 'openai' | 'ollama';
				await plugin.saveSettings();
			})));

	const openai = settingGroup(containerEl, 'OpenAI');
	addVerifyButton(
		secretSetting(openai, plugin, 'API key', 'Your OpenAI API key.', 'sk-…', 'OpenAIAPIKey'),
		() => verifyOpenAIKey(plugin.settings.OpenAIAPIKey)
	);
	addSetting(openai, setting => setting
		.setName('Model')
		.setDesc('OpenAI model to use.')
		.addDropdown(dropdown => {
			OPENAI_MODELS.forEach(model => dropdown.addOption(model, model));
			dropdown
				.setValue(plugin.settings.OpenAIModel)
				.onChange(async (value) => {
					plugin.settings.OpenAIModel = value;
					await plugin.saveSettings();
				});
		}));

	const gemini = settingGroup(containerEl, 'Gemini');
	addVerifyButton(
		secretSetting(gemini, plugin, 'API key', 'Your Gemini API key.', 'AIza…', 'GeminiAPIKey'),
		() => verifyGeminiKey(plugin.settings.GeminiAPIKey)
	);
	addSetting(gemini, setting => setting
		.setName('Model')
		.setDesc('Gemini model to use.')
		.addDropdown(dropdown => {
			GEMINI_MODELS.forEach(model => dropdown.addOption(model, model));
			dropdown
				.setValue(plugin.settings.GeminiModel)
				.onChange(async (value) => {
					plugin.settings.GeminiModel = value;
					await plugin.saveSettings();
				});
		}));

	const ollama = settingGroup(containerEl, 'Ollama');
	addVerifyButton(
		textSetting(ollama, plugin, 'Base URL', 'Base URL of your local Ollama server. Runs fully offline; no data leaves your machine.', 'OllamaBaseUrl', 'http://localhost:11434'),
		() => verifyOllama(plugin.settings.OllamaBaseUrl)
	);
	textSetting(ollama, plugin, 'Model', 'Name of a model already pulled with `ollama pull` (e.g. llama3.1, gemma3, qwen2.5).', 'OllamaModel', 'llama3.1');
}
