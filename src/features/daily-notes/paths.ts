import {
	appHasDailyNotesPluginLoaded,
	DEFAULT_DAILY_NOTE_FORMAT,
	getDailyNoteSettings
} from 'obsidian-daily-notes-interface';
const moment = require('moment');

// Where daily notes live, resolved from the core Daily notes plugin settings.

export function getDailyNoteFilePath(date: Date): string | null {
	const config = getDailyNotesConfig();
	if (!config) {
		return null;
	}
	const fileName = typeof window === 'undefined'
		? formatDateForDailyNote(date, config.format)
		: moment(date).format(config.format);
	return config.folder ? `${config.folder}/${fileName}.md` : `${fileName}.md`;
}

function getDailyNotesConfig(): { folder: string; format: string } | null {
	if (!isDailyNotesPluginLoaded()) {
		return null;
	}
	if (typeof window === 'undefined') {
		return { folder: 'DailyNotes', format: DEFAULT_DAILY_NOTE_FORMAT };
	}
	try {
		const settings = getDailyNoteSettings();
		const folder = settings?.folder?.trim() ?? '';
		const format = settings?.format?.trim() || DEFAULT_DAILY_NOTE_FORMAT;
		return { folder, format };
	} catch (error) {
		return { folder: 'DailyNotes', format: DEFAULT_DAILY_NOTE_FORMAT };
	}
}

export function isDailyNotesPluginLoaded(): boolean {
	if (typeof window === 'undefined') {
		return true;
	}
	try {
		return appHasDailyNotesPluginLoaded();
	} catch (error) {
		return false;
	}
}

function formatDateForDailyNote(date: Date, format: string): string {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const paddedMonth = month.toString().padStart(2, '0');
	const paddedDay = day.toString().padStart(2, '0');
	const replacements: Record<string, string> = {
		YYYY: year.toString(),
		YY: (year % 100).toString().padStart(2, '0'),
		MM: paddedMonth,
		M: month.toString(),
		DD: paddedDay,
		D: day.toString()
	};
	return format.replace(/YYYY|YY|MM|M|DD|D/g, token => replacements[token] ?? token);
}
