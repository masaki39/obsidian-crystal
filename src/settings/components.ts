import { Notice, Setting, SettingGroup } from 'obsidian';
import type { CrystalPluginHost } from '../types';
import type { CrystalPluginSettings } from './types';

// Small builders shared by every settings section. Settings are laid out in
// Obsidian's own `SettingGroup`s (1.11+), like the core settings tabs.

/** A group of settings, optionally under a heading. */
export function settingGroup(containerEl: HTMLElement, heading?: string): SettingGroup {
	const group = new SettingGroup(containerEl);
	if (heading) group.setHeading(heading);
	return group;
}

/** Adds a setting to `group` and returns it, so callers can keep a reference. */
export function addSetting(group: SettingGroup, build: (setting: Setting) => void = () => {}): Setting {
	let created: Setting | null = null;
	group.addSetting(setting => {
		created = setting;
		build(setting);
	});
	return created as unknown as Setting;
}

export function textSetting(group: SettingGroup, plugin: CrystalPluginHost, name: string, desc: string, key: string, placeholder: string) {
	return addSetting(group, setting => setting
		.setName(name)
		.setDesc(desc)
		.addText(text => text
			.setPlaceholder(placeholder)
			.setValue((plugin.settings as any)[key])
			.onChange(async (value) => {
				(plugin.settings as any)[key] = value;
				await plugin.saveSettings();
			})));
}

export function toggleSetting(group: SettingGroup, plugin: CrystalPluginHost, name: string, desc: string, key: string) {
	return addSetting(group, setting => setting
		.setName(name)
		.setDesc(desc)
		.addToggle(toggle => toggle
			.setValue((plugin.settings as any)[key])
			.onChange(async (value) => {
				(plugin.settings as any)[key] = value;
				await plugin.saveSettings();
			})));
}

export function secretSetting(group: SettingGroup, plugin: CrystalPluginHost, name: string, desc: string | DocumentFragment, placeholder: string, field: keyof CrystalPluginSettings) {
	// Persist through saveSettings() so the secret is written to SecretStorage
	// and the affected services are refreshed immediately (no reload required).
	return addSetting(group, setting => setting
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
		}));
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

/** Swaps two entries of a list in place; out-of-range moves are ignored. */
export function moveItem<T>(list: T[], from: number, to: number): boolean {
	if (to < 0 || to >= list.length || from === to) return false;
	[list[from], list[to]] = [list[to], list[from]];
	return true;
}
