import type { Plugin } from 'obsidian';
import type { DailyNotesManager } from './manager';

export function registerDailyNoteCommands(plugin: Plugin, manager: DailyNotesManager) {
	plugin.addCommand({
		id: 'crystal-open-today',
		name: 'Daily: Open today\'s note',
		icon: 'calendar-days',
		callback: () => manager.openToday()
	});

	plugin.addCommand({
		id: 'crystal-open-yesterday',
		name: 'Daily: Open yesterday\'s note',
		icon: 'calendar-minus',
		callback: () => manager.openYesterday()
	});

	plugin.addCommand({
		id: 'crystal-open-tomorrow',
		name: 'Daily: Open tomorrow\'s note',
		icon: 'calendar-plus',
		callback: () => manager.openTomorrow()
	});

	plugin.addCommand({
		id: 'crystal-add-task-to-daily-note',
		name: 'Daily: Add task to daily note',
		icon: 'list-plus',
		callback: () => manager.addTaskToDailyNote()
	});

	plugin.addCommand({
		id: 'crystal-roll-over-tasks',
		name: 'Daily: Roll over yesterday\'s undone tasks',
		icon: 'list-todo',
		editorCallback: (editor) => manager.rollOverYesterdayUndoTaskList(editor)
	});
}
