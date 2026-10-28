import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { sectionHeading, textSetting, toggleSetting } from '../components';

export function renderDailyNotesSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'Daily notes', 'calendar-days');

	toggleSetting(containerEl, plugin, 'Auto Sort Tasks', 'Sort tasks in daily notes automatically', 'dailyNoteAutoSort');
	toggleSetting(containerEl, plugin, 'Auto Link Notes', 'Add link to today\'s daily note when create any note', 'dailyNoteAutoLink');
	toggleSetting(containerEl, plugin, 'Newest First (Daily Notes)', 'Place new daily note entries at the top (tasks, links, timeline)', 'dailyNoteNewestFirst');
	toggleSetting(containerEl, plugin, 'Show weekday after inline title', 'Display the day of the week next to the inline title of daily notes', 'dailyNoteShowWeekday');
	textSetting(containerEl, plugin, 'Weekday format', 'moment.js format for the weekday label (e.g. dddd, ddd, (ddd)). Follows Obsidian\'s language', 'dailyNoteWeekdayFormat', 'dddd');
	textSetting(containerEl, plugin, 'Draft note path', 'Note opened by "Daily: Open draft". "Daily: Post draft to timeline" appends its text to today\'s timeline and empties it', 'dailyNoteDraftPath', 'tmp.md');
}
