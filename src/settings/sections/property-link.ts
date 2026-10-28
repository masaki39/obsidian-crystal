import { App, Setting } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { sectionHeading, toggleSetting } from '../components';

export function renderPropertyLinkSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'Property link', 'link');

	toggleSetting(containerEl, plugin, 'Enable Property Link', 'When a listed property links to another note, automatically add a reciprocal link back on that note (created as a list property if it doesn\'t exist). Existing property values are never removed or overwritten.', 'propertyLinkEnabled');

	const propertyLinkContainer = containerEl.createDiv({ cls: 'property-link-pairs' });
	displayPropertyLinkPairs(propertyLinkContainer, plugin);

	new Setting(containerEl)
		.setName('Add New Pair')
		.setDesc('Directed pair (e.g. next → previous), or use the same name for both to make a symmetric relation (e.g. friends → friends)')
		.addButton(button => button
			.setButtonText('Add')
			.onClick(async () => {
				plugin.settings.propertyLinkPairs.push({ source: '', target: '' });
				await plugin.saveSettings();
				displayPropertyLinkPairs(propertyLinkContainer, plugin);
			}));
}

function displayPropertyLinkPairs(container: HTMLElement, plugin: CrystalPluginHost) {
	container.empty();

	plugin.settings.propertyLinkPairs.forEach((pair, index) => {
		new Setting(container)
			.setName(`Pair ${index + 1}`)
			.addText(text => {
				text.setPlaceholder('Source (e.g. next)')
					.setValue(pair.source)
					.onChange(async (value) => {
						pair.source = value.trim();
						await plugin.saveSettings();
					});
				text.inputEl.style.width = '140px';
				return text;
			})
			.addText(text => {
				text.setPlaceholder('Target (e.g. previous)')
					.setValue(pair.target)
					.onChange(async (value) => {
						pair.target = value.trim();
						await plugin.saveSettings();
					});
				text.inputEl.style.width = '140px';
				return text;
			})
			.addButton(button => button
				.setButtonText('-')
				.setClass('mod-destructive')
				.setTooltip('Delete pair')
				.onClick(async () => {
					plugin.settings.propertyLinkPairs.splice(index, 1);
					await plugin.saveSettings();
					displayPropertyLinkPairs(container, plugin);
				}));
	});
}
