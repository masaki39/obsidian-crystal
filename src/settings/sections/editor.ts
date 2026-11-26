import type { App, Setting } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addSetting, settingGroup, toggleSetting } from '../components';
import { renderVimSettings } from './vim';

export function renderEditorSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const autoBullet = settingGroup(containerEl);

	const triggers: Setting[] = [];
	const refreshTriggers = () => triggers.forEach(setting => setting.setDisabled(!plugin.settings.autoBulletEnabled));

	addSetting(autoBullet, setting => setting
		.setName('Auto bullet')
		.setDesc('Turn a space typed at the start of a line into a "- " bullet, like Cosense. Skipped in frontmatter, code and math blocks, headings, quotes, tables and existing lists. Disable the Auto Bullet plugin if you use it, or bullets are added twice.')
		.addToggle(toggle => toggle
			.setValue(plugin.settings.autoBulletEnabled)
			.onChange(async (value) => {
				plugin.settings.autoBulletEnabled = value;
				await plugin.saveSettings();
				refreshTriggers();
			})));

	triggers.push(
		toggleSetting(autoBullet, plugin, 'Half-width space', 'Trigger auto bullet with a half-width space.', 'autoBulletHalfWidthSpace'),
		toggleSetting(autoBullet, plugin, 'Full-width space', 'Trigger auto bullet with a full-width space (e.g. Space with a Japanese IME on).', 'autoBulletFullWidthSpace'),
		toggleSetting(autoBullet, plugin, 'Tab', 'Trigger auto bullet with Tab. Tab on an existing list item still indents it.', 'autoBulletTab'),
	);
	refreshTriggers();

	renderVimSettings(containerEl, app, plugin);
}
