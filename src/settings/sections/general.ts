import { App, Setting } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import type { OpacityService } from '../../features/workspace/opacity';
import { sectionHeading, textSetting, toggleSetting } from '../components';

export function renderGeneralSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'General settings', 'settings-2');

	textSetting(containerEl, plugin, 'Export Folder Path', 'Folder where this plugin exports files (used by PDF and Marp features)', 'exportFolderPath', 'Enter Export Folder Path');

	new Setting(containerEl)
		.setName('Window opacity')
		.setDesc('Opacity of the Obsidian window (1.0 = fully opaque). Desktop only; reset to 1.0 when the plugin is disabled.')
		.addSlider(slider => slider
			.setLimits(0.5, 1.0, 0.05)
			.setValue(plugin.settings.windowOpacity)
			.setDynamicTooltip()
			.onChange(async (value) => {
				plugin.settings.windowOpacity = value;
				await plugin.saveSettings();
				const opacityService = (plugin as unknown as { opacityService?: OpacityService }).opacityService;
				opacityService?.applyOpacity(value);
			}));

	toggleSetting(containerEl, plugin, 'Auto open/close sidebars', 'Open or close the sidebars as the window is resized so the editor keeps at least the width below. The sidebar set in Sidebar priority opens first.', 'sidebarAutoToggleEnabled');

	new Setting(containerEl)
		.setName('Minimum editor width')
		.setDesc('Narrowest the editor may get, in pixels. Run "Sidebar: Show measured widths" with the editor at a width you like to see its current width.')
		.addText(text => {
			text.inputEl.type = 'number';
			text.setValue(String(plugin.settings.sidebarAutoToggleMinEditorWidth))
				.onChange(async (value) => {
					const width = Number(value);
					if (!Number.isFinite(width) || width < 200) return;
					plugin.settings.sidebarAutoToggleMinEditorWidth = Math.round(width);
					await plugin.saveSettings();
				});
		});

	new Setting(containerEl)
		.setName('Sidebar priority')
		.setDesc('Which sidebar opens first as the window widens (and closes last as it narrows).')
		.addDropdown(dropdown => dropdown
			.addOption('left', 'Left')
			.addOption('right', 'Right')
			.setValue(plugin.settings.sidebarAutoTogglePriority)
			.onChange(async (value) => {
				plugin.settings.sidebarAutoTogglePriority = value === 'right' ? 'right' : 'left';
				await plugin.saveSettings();
			}));
}
