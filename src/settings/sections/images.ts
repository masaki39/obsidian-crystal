import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addSetting, addVerifyButton, secretSetting, settingGroup } from '../components';
import { verifyGyazoToken } from '../verifiers';
import { DEFAULT_SETTINGS } from '../defaults';

export function renderImageSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const processor = settingGroup(containerEl);

	addSetting(processor, setting => setting
		.setName('Convert pasted images to WebP')
		.setDesc('Automatically convert pasted images to WebP and save them to the vault.')
		.addToggle(toggle => toggle
			.setValue(plugin.settings.autoWebpPaste)
			.onChange(async (value) => {
				plugin.settings.autoWebpPaste = value;
				await plugin.saveSettings();
			})));

	addSetting(processor, setting => setting
		.setName('WebP quality')
		.setDesc('Quality for WebP compression (0.1 = lowest quality and smallest file, 1.0 = highest quality and largest file).')
		.addSlider(slider => slider
			.setLimits(0.1, 1.0, 0.05)
			.setValue(plugin.settings.webpQuality)
			.setDynamicTooltip()
			.onChange(async (value) => {
				plugin.settings.webpQuality = value;
				await plugin.saveSettings();
			})));

	addSetting(processor, setting => setting
		.setName('Default resize scale')
		.setDesc('Default scale for resizing images (0.1 = 10%, 1.0 = 100%).')
		.addSlider(slider => slider
			.setLimits(0.1, 1.0, 0.05)
			.setValue(plugin.settings.imageResizeScale)
			.setDynamicTooltip()
			.onChange(async (value) => {
				plugin.settings.imageResizeScale = value;
				await plugin.saveSettings();
			})));

	addSetting(processor, setting => setting
		.setName('Max image size')
		.setDesc('Maximum size for images, in pixels.')
		.addText(text => text
			.setPlaceholder(DEFAULT_SETTINGS.imageMaxSize.toString())
			.setValue(plugin.settings.imageMaxSize.toString())
			.onChange(async (value) => {
				plugin.settings.imageMaxSize = parseInt(value) || DEFAULT_SETTINGS.imageMaxSize;
				await plugin.saveSettings();
			})));

	const gyazo = settingGroup(containerEl, 'Gyazo');
	const gyazoDesc = createFragment(fragment => {
		fragment.append('Access token from ');
		fragment.createEl('a', { text: 'gyazo.com/oauth/applications', href: 'https://gyazo.com/oauth/applications' });
		fragment.append(' (create an app, then copy its access token).');
	});
	addVerifyButton(
		secretSetting(gyazo, plugin, 'Access token', gyazoDesc, 'Enter your Gyazo access token', 'gyazoAccessToken'),
		() => verifyGyazoToken(plugin.settings.gyazoAccessToken)
	);
}
