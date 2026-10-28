import { type IconName, Notice, Setting, setIcon } from 'obsidian';
import type { CrystalPluginHost } from '../types';
import type { CrystalPluginSettings } from './types';

// Small builders shared by every settings section.

export function sectionHeading(containerEl: HTMLElement, name: string, icon: IconName, sub = false) {
	const setting = new Setting(containerEl).setName(name).setHeading();
	setting.settingEl.addClass('crystal-section-heading');
	if (sub) setting.settingEl.addClass('crystal-section-heading-sub');
	const iconEl = createSpan({ cls: 'crystal-section-icon' });
	setIcon(iconEl, icon);
	setting.nameEl.prepend(iconEl);
	return setting;
}

export function textSetting(containerEl: HTMLElement, plugin: CrystalPluginHost, name: string, desc: string, key: string, value: string) {
	return new Setting(containerEl)
		.setName(name)
		.setDesc(desc)
		.addText(text => text
			.setPlaceholder(value)
			.setValue((plugin.settings as any)[key])
			.onChange(async (value) => {
				(plugin.settings as any)[key] = value;
				await plugin.saveSettings();
			}));
}

export function toggleSetting(containerEl: HTMLElement, plugin: CrystalPluginHost, name: string, desc: string, key: string) {
	return new Setting(containerEl)
		.setName(name)
		.setDesc(desc)
		.addToggle(toggle => toggle
			.setValue((plugin.settings as any)[key])
			.onChange(async (value) => {
				(plugin.settings as any)[key] = value;
				await plugin.saveSettings();
			}));
}

export function secretSetting(containerEl: HTMLElement, plugin: CrystalPluginHost, name: string, desc: string | DocumentFragment, placeholder: string, field: keyof CrystalPluginSettings) {
	// Persist through saveSettings() so the secret is written to SecretStorage
	// and the affected services are refreshed immediately (no reload required).
	return new Setting(containerEl)
		.setName(name)
		.setDesc(desc)
		.addText(text => {
			text.setPlaceholder(placeholder)
				.setValue(plugin.settings[field] as string)
				.onChange(async (value) => {
					(plugin.settings as any)[field] = value;
					await plugin.saveSettings();
				});
			text.inputEl.type = 'password';
			return text;
		});
}

export function addVerifyButton(setting: Setting, verify: () => Promise<void>) {
	setting.addButton(button => button
		.setButtonText('Verify')
		.onClick(async () => {
			button.setDisabled(true);
			button.setButtonText('Verifying…');
			try {
				await verify();
				new Notice('✅ Valid: the credential works.');
			} catch (error) {
				new Notice(`❌ Invalid: ${error.message}`);
			} finally {
				button.setDisabled(false);
				button.setButtonText('Verify');
			}
		}));
}
