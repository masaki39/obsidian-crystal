import { type App, Setting } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { sectionHeading, toggleSetting } from '../components';

export function renderEditorSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'Editor', 'list');

	const triggers: Setting[] = [];
	const refreshTriggers = () => triggers.forEach(setting => setting.setDisabled(!plugin.settings.autoBulletEnabled));

	new Setting(containerEl)
		.setName('Auto bullet')
		.setDesc('Turn a space typed at the start of a line into a "- " bullet, like Cosense. Skipped in frontmatter, code and math blocks, headings, quotes, tables and existing lists. Disable the Auto Bullet plugin if you use it, or bullets are added twice.')
		.addToggle(toggle => toggle
			.setValue(plugin.settings.autoBulletEnabled)
			.onChange(async (value) => {
				plugin.settings.autoBulletEnabled = value;
				await plugin.saveSettings();
				refreshTriggers();
			}));

	triggers.push(
		toggleSetting(containerEl, plugin, 'Half-width space', 'Trigger auto bullet with a half-width space.', 'autoBulletHalfWidthSpace'),
		toggleSetting(containerEl, plugin, 'Full-width space', 'Trigger auto bullet with a full-width space (e.g. Space with a Japanese IME on).', 'autoBulletFullWidthSpace'),
		toggleSetting(containerEl, plugin, 'Tab', 'Trigger auto bullet with Tab. Tab on an existing list item still indents it.', 'autoBulletTab'),
	);
	refreshTriggers();
}
