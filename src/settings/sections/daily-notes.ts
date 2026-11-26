import type { App } from 'obsidian';
import { parseExcludeFolders } from '../../features/daily-notes/auto-link-exclude';
import type { CrystalPluginHost } from '../../types';
import { addSetting, settingGroup, textSetting, toggleSetting } from '../components';
import { DEFAULT_SETTINGS } from '../defaults';

export function renderDailyNotesSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const group = settingGroup(containerEl);

	toggleSetting(group, plugin, 'Auto sort tasks', 'Sort tasks in daily notes automatically.', 'dailyNoteAutoSort');
	toggleSetting(group, plugin, 'Auto link notes', 'Add a link to today\'s daily note whenever you create a note.', 'dailyNoteAutoLink');
	addSetting(group, setting => setting
		.setName('Auto link exclude folders')
		.setDesc('Notes created in these folders are not linked from the daily note. One folder per line, relative to the vault root (subfolders included).')
		.addTextArea(text => {
			text.setPlaceholder('kaname/logs')
				.setValue(plugin.settings.dailyNoteAutoLinkExcludeFolders.join('\n'))
				.onChange(async (value) => {
					plugin.settings.dailyNoteAutoLinkExcludeFolders = parseExcludeFolders(value);
					await plugin.saveSettings();
				});
			text.inputEl.rows = 4;
		}));
	toggleSetting(group, plugin, 'Newest first', 'Place new daily note entries at the top (tasks, links, timeline).', 'dailyNoteNewestFirst');

	const weekday = settingGroup(containerEl, 'Weekday');
	toggleSetting(weekday, plugin, 'Show weekday after inline title', 'Display the day of the week next to the inline title of daily notes.', 'dailyNoteShowWeekday');
	textSetting(weekday, plugin, 'Weekday format', 'moment.js format for the weekday label (e.g. dddd, ddd, (ddd)). Follows Obsidian\'s language.', 'dailyNoteWeekdayFormat', 'dddd');

	const draft = settingGroup(containerEl, 'Draft');
	textSetting(draft, plugin, 'Draft note path', 'Note opened by "Daily: Open draft". "Daily: Post draft to timeline" appends its text to today\'s timeline and empties it.', 'dailyNoteDraftPath', DEFAULT_SETTINGS.dailyNoteDraftPath);
}
