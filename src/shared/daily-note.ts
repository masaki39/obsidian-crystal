import type { TFile } from 'obsidian';
import { getDateFromFile } from 'obsidian-daily-notes-interface';

/** Whether `file` is a daily note (its name parses as a date in the Daily notes format). */
export function isDailyNoteFile(file: TFile): boolean {
	return getDateFromFile(file, 'day') !== null;
}
