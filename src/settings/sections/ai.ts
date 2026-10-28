import { App, Setting } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addVerifyButton, secretSetting, sectionHeading, textSetting } from '../components';
import { verifyGeminiKey, verifyOllama, verifyOpenAIKey } from '../verifiers';

export function renderAiSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'AI editor commands', 'bot');

	new Setting(containerEl)
		.setName('AI Provider')
		.setDesc('Select which AI provider to use for editor commands')
		.addDropdown(dropdown => dropdown
			.addOption('openai', 'OpenAI')
			.addOption('gemini', 'Gemini')
			.addOption('ollama', 'Ollama (local)')
			.setValue(plugin.settings.aiProvider)
			.onChange(async (value) => {
				plugin.settings.aiProvider = value as 'gemini' | 'openai' | 'ollama';
				await plugin.saveSettings();
			}));

	addVerifyButton(
		secretSetting(containerEl, plugin, 'OpenAI API Key', 'Enter your OpenAI API Key', 'Enter your OpenAI API Key', 'OpenAIAPIKey'),
		() => verifyOpenAIKey(plugin.settings.OpenAIAPIKey)
	);

	new Setting(containerEl)
		.setName('OpenAI Model')
		.setDesc('Select the OpenAI model to use')
		.addDropdown(dropdown => dropdown
			.addOption('gpt-5', 'gpt-5')
			.addOption('gpt-5-mini', 'gpt-5-mini')
			.addOption('gpt-5-nano', 'gpt-5-nano')
			.addOption('gpt-4.1', 'gpt-4.1')
			.addOption('gpt-4.1-mini', 'gpt-4.1-mini')
			.addOption('gpt-4o', 'gpt-4o')
			.addOption('gpt-4o-mini', 'gpt-4o-mini')
			.setValue(plugin.settings.OpenAIModel)
			.onChange(async (value) => {
				plugin.settings.OpenAIModel = value;
				await plugin.saveSettings();
			}));

	addVerifyButton(
		secretSetting(containerEl, plugin, 'Gemini API Key', 'Enter your Gemini API Key', 'Enter your Gemini API Key', 'GeminiAPIKey'),
		() => verifyGeminiKey(plugin.settings.GeminiAPIKey)
	);

	new Setting(containerEl)
		.setName('Gemini Model')
		.setDesc('Select the Gemini model to use')
		.addDropdown(dropdown => dropdown
			.addOption('gemini-flash-latest', 'gemini-flash-latest')
			.addOption('gemini-flash-lite-latest', 'gemini-flash-lite-latest')
			.addOption('gemini-2.5-flash', 'gemini-2.5-flash')
			.addOption('gemini-2.5-flash-lite', 'gemini-2.5-flash-lite')
			.addOption('gemini-2.0-flash', 'gemini-2.0-flash')
			.addOption('gemini-2.0-flash-lite', 'gemini-2.0-flash-lite')
			.addOption('gemma-4-31b-it', 'gemma-4-31b-it')
			.addOption('gemma-4-26b-a4b-it', 'gemma-4-26b-a4b-it')
			.setValue(plugin.settings.GeminiModel)
			.onChange(async (value) => {
				plugin.settings.GeminiModel = value;
				await plugin.saveSettings();
			}));

	addVerifyButton(
		textSetting(containerEl, plugin, 'Ollama Base URL', 'Base URL of your local Ollama server. Runs fully offline; no data leaves your machine.', 'OllamaBaseUrl', 'http://localhost:11434'),
		() => verifyOllama(plugin.settings.OllamaBaseUrl)
	);

	textSetting(containerEl, plugin, 'Ollama Model', 'Name of a model already pulled with `ollama pull` (e.g. llama3.1, gemma3, qwen2.5).', 'OllamaModel', 'llama3.1');
}
