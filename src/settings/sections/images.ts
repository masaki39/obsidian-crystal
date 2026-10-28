import { App, Setting } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addVerifyButton, secretSetting, sectionHeading } from '../components';
import { verifyGyazoToken } from '../verifiers';

export function renderImageSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'Image processor', 'image');

	new Setting(containerEl)
		.setName('Auto Convert Images to WebP on Paste')
		.setDesc('Automatically convert pasted images to WebP format and save to vault')
		.addToggle(toggle => toggle
			.setValue(plugin.settings.autoWebpPaste)
			.onChange(async (value) => {
				plugin.settings.autoWebpPaste = value;
				await plugin.saveSettings();
			}));

	new Setting(containerEl)
		.setName('WebP Compression Quality')
		.setDesc('Quality for WebP compression (0.1 = lowest quality/smallest file, 1.0 = highest quality/largest file)')
		.addSlider(slider => slider
			.setLimits(0.1, 1.0, 0.05)
			.setValue(plugin.settings.webpQuality)
			.setDynamicTooltip()
			.onChange(async (value) => {
				plugin.settings.webpQuality = value;
				await plugin.saveSettings();
			}));

	new Setting(containerEl)
		.setName('Image Default Resize Scale')
		.setDesc('Default scale for resizing images (0.1 = 10%, 1.0 = 100%)')
		.addSlider(slider => slider
			.setLimits(0.1, 1.0, 0.05)
			.setValue(plugin.settings.imageResizeScale)
			.setDynamicTooltip()
			.onChange(async (value) => {
				plugin.settings.imageResizeScale = value;
				await plugin.saveSettings();
			}));

	new Setting(containerEl)
		.setName('Image Max Size')
		.setDesc('Maximum size for images (in pixels)')
		.addText(text => text
			.setPlaceholder('1024')
			.setValue(plugin.settings.imageMaxSize.toString())
			.onChange(async (value) => {
				plugin.settings.imageMaxSize = parseInt(value) || 1024;
				await plugin.saveSettings();
			}));

	// Gyazo settings
	sectionHeading(containerEl, 'Gyazo uploader', 'upload-cloud', true);

	const gyazoDesc = document.createDocumentFragment();
	gyazoDesc.append('Access token from ');
	gyazoDesc.createEl('a', { text: 'gyazo.com/oauth/applications', href: 'https://gyazo.com/oauth/applications' });
	gyazoDesc.append(' (create an app → copy the access token)');
	addVerifyButton(
		secretSetting(containerEl, plugin, 'Gyazo access token', gyazoDesc, 'Enter Gyazo access token', 'gyazoAccessToken'),
		() => verifyGyazoToken(plugin.settings.gyazoAccessToken)
	);
}
