import type { App, TextComponent } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addSetting, moveItem, settingGroup } from '../components';

export function renderFileOrganizationSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const rootEl = containerEl.createDiv();
	renderRules(rootEl, plugin);
}

function renderRules(rootEl: HTMLElement, plugin: CrystalPluginHost) {
	rootEl.empty();
	const redraw = () => renderRules(rootEl, plugin);
	const rules = plugin.settings.fileOrganizationRules;
	const group = settingGroup(rootEl);

	rules.forEach((rule, index) => {
		const field = (key: 'displayName' | 'tag' | 'folder' | 'prefix', placeholder: string, cls: string) =>
			(text: TextComponent) => {
				text.setPlaceholder(placeholder)
					.setValue(rule[key])
					.onChange(async (value) => {
						rule[key] = value;
						await plugin.saveSettings();
					});
				text.inputEl.addClass(cls);
			};
		const move = async (to: number) => {
			if (!moveItem(rules, index, to)) return;
			await plugin.saveSettings();
			redraw();
		};

		addSetting(group, setting => setting
			.setName(`Rule ${index + 1}`)
			.setClass('crystal-file-rule-row')
			.addText(field('displayName', 'Display name', 'crystal-file-rule-name'))
			.addText(field('tag', 'Tag', 'crystal-file-rule-tag'))
			.addText(field('folder', 'Folder', 'crystal-file-rule-folder'))
			.addText(field('prefix', 'Prefix', 'crystal-file-rule-prefix'))
			.addToggle(toggle => toggle
				.setTooltip('Include date in filename')
				.setValue(rule.includeDate)
				.onChange(async (value) => {
					rule.includeDate = value;
					await plugin.saveSettings();
				}))
			.addExtraButton(button => button
				.setIcon('arrow-up')
				.setTooltip('Move up')
				.setDisabled(index === 0)
				.onClick(() => move(index - 1)))
			.addExtraButton(button => button
				.setIcon('arrow-down')
				.setTooltip('Move down')
				.setDisabled(index === rules.length - 1)
				.onClick(() => move(index + 1)))
			.addExtraButton(button => button
				.setIcon('trash-2')
				.setTooltip('Delete rule')
				.onClick(async () => {
					rules.splice(index, 1);
					await plugin.saveSettings();
					redraw();
				})));
	});

	addSetting(group, setting => setting
		.setName('Add rule')
		.setDesc('Rules used by "Editor: Organize file with prefix and tags": each sets a display name, tag, folder, prefix, and whether the date is included.')
		.addButton(button => button
			.setButtonText('Add')
			.setCta()
			.onClick(async () => {
				rules.push({ displayName: '', tag: '', folder: '', prefix: '', includeDate: false });
				await plugin.saveSettings();
				redraw();
			})));
}
