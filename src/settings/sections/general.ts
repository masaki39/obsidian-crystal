import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addSetting, settingGroup, textSetting } from '../components';

export function renderGeneralSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const group = settingGroup(containerEl);

	textSetting(group, plugin, 'Home page', 'Note opened by the "Open home page" command, e.g. Home or Notes/Home.md.', 'homePagePath', 'e.g. Home');

	textSetting(group, plugin, 'Export folder', 'Folder where this plugin exports files (used by PDF and Marp features).', 'exportFolderPath', 'e.g. Exports');

	addSetting(group, setting => setting
		.setName('Window opacity')
		.setDesc('Opacity of the Obsidian window (1.0 = fully opaque). Desktop only; reset to 1.0 when the plugin is disabled.')
		.addSlider(slider => slider
			.setLimits(0.5, 1.0, 0.05)
			.setValue(plugin.settings.windowOpacity)
			.setDynamicTooltip()
			.onChange(async (value) => {
				plugin.settings.windowOpacity = value;
				await plugin.saveSettings();
				plugin.opacityService?.applyOpacity(value);
			})));
}
