import { App, Setting } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { sectionHeading } from '../components';

export function renderFileOrganizationSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'File organization rules', 'folder-tree')
		.setDesc('Configure rules for file organization. You can set display name, tag, folder, prefix, and date inclusion.');

	const rulesContainer = containerEl.createDiv({ cls: 'file-organization-rules' });
	displayFileOrganizationRules(rulesContainer, plugin);

	new Setting(containerEl)
		.setName('Add New Rule')
		.setDesc('Add an empty rule')
		.addButton(button => button
			.setButtonText('Add')
			.onClick(async () => {
				plugin.settings.fileOrganizationRules.push({
					displayName: '',
					tag: '',
					folder: '',
					prefix: '',
					includeDate: false
				});
				await plugin.saveSettings();
				displayFileOrganizationRules(rulesContainer, plugin);
			}));
}

function displayFileOrganizationRules(container: HTMLElement, plugin: CrystalPluginHost) {
	container.empty();

	plugin.settings.fileOrganizationRules.forEach((rule, index) => {
		const ruleContainer = container.createDiv({ cls: 'file-organization-rule-row' });

		new Setting(ruleContainer)
			.setName(`Rule ${index + 1}`)
			.addText(text => {
				text.setPlaceholder('Display name')
					.setValue(rule.displayName)
					.onChange(async (value) => {
						rule.displayName = value;
						await plugin.saveSettings();
					});
				text.inputEl.style.width = '140px';
				return text;
			})
			.addText(text => {
				text.setPlaceholder('Tag')
					.setValue(rule.tag)
					.onChange(async (value) => {
						rule.tag = value;
						await plugin.saveSettings();
					});
				text.inputEl.style.width = '100px';
				return text;
			})
			.addText(text => {
				text.setPlaceholder('Folder')
					.setValue(rule.folder)
					.onChange(async (value) => {
						rule.folder = value;
						await plugin.saveSettings();
					});
				text.inputEl.style.width = '80px';
				return text;
			})
			.addText(text => {
				text.setPlaceholder('Prefix')
					.setValue(rule.prefix)
					.onChange(async (value) => {
						rule.prefix = value;
						await plugin.saveSettings();
					});
				text.inputEl.style.width = '60px';
				return text;
			})
			.addToggle(toggle => toggle
				.setTooltip('Include date in filename')
				.setValue(rule.includeDate)
				.onChange(async (value) => {
					rule.includeDate = value;
					await plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('↑')
				.setTooltip('Move up')
				.onClick(async () => {
					if (index > 0) {
						const temp = plugin.settings.fileOrganizationRules[index];
						plugin.settings.fileOrganizationRules[index] = plugin.settings.fileOrganizationRules[index - 1];
						plugin.settings.fileOrganizationRules[index - 1] = temp;
						await plugin.saveSettings();
						displayFileOrganizationRules(container, plugin);
					}
				}))
			.addButton(button => button
				.setButtonText('↓')
				.setTooltip('Move down')
				.onClick(async () => {
					if (index < plugin.settings.fileOrganizationRules.length - 1) {
						const temp = plugin.settings.fileOrganizationRules[index];
						plugin.settings.fileOrganizationRules[index] = plugin.settings.fileOrganizationRules[index + 1];
						plugin.settings.fileOrganizationRules[index + 1] = temp;
						await plugin.saveSettings();
						displayFileOrganizationRules(container, plugin);
					}
				}))
			.addButton(button => button
				.setButtonText('-')
				.setClass('mod-destructive')
				.setTooltip('Delete rule')
				.onClick(async () => {
					plugin.settings.fileOrganizationRules.splice(index, 1);
					await plugin.saveSettings();
					displayFileOrganizationRules(container, plugin);
				}));
	});
}
