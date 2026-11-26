import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addSetting, settingGroup, toggleSetting } from '../components';

export function renderPropertyLinkSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const general = settingGroup(containerEl);
	toggleSetting(general, plugin, 'Enable property link', 'When a listed property links to another note, automatically add a reciprocal link back on that note (created as a list property if it doesn\'t exist). Existing property values are never removed or overwritten.', 'propertyLinkEnabled');

	const pairsEl = containerEl.createDiv();
	renderPairs(pairsEl, plugin);
}

function renderPairs(rootEl: HTMLElement, plugin: CrystalPluginHost) {
	rootEl.empty();
	const redraw = () => renderPairs(rootEl, plugin);
	const group = settingGroup(rootEl, 'Pairs');

	plugin.settings.propertyLinkPairs.forEach((pair, index) => {
		addSetting(group, setting => setting
			.setName(`Pair ${index + 1}`)
			.addText(text => {
				text.setPlaceholder('Source (e.g. next)')
					.setValue(pair.source)
					.onChange(async (value) => {
						pair.source = value.trim();
						await plugin.saveSettings();
					});
				text.inputEl.addClass('crystal-property-link-input');
			})
			.addText(text => {
				text.setPlaceholder('Target (e.g. previous)')
					.setValue(pair.target)
					.onChange(async (value) => {
						pair.target = value.trim();
						await plugin.saveSettings();
					});
				text.inputEl.addClass('crystal-property-link-input');
			})
			.addExtraButton(button => button
				.setIcon('trash-2')
				.setTooltip('Delete pair')
				.onClick(async () => {
					plugin.settings.propertyLinkPairs.splice(index, 1);
					await plugin.saveSettings();
					redraw();
				})));
	});

	addSetting(group, setting => setting
		.setName('Add pair')
		.setDesc('Directed pair (e.g. next → previous), or use the same name for both to make a symmetric relation (e.g. friends → friends).')
		.addButton(button => button
			.setButtonText('Add')
			.setCta()
			.onClick(async () => {
				plugin.settings.propertyLinkPairs.push({ source: '', target: '' });
				await plugin.saveSettings();
				redraw();
			})));
}
