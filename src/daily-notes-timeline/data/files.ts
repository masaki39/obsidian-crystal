import { App, TFile } from 'obsidian';
import { CrystalPluginSettings } from '../../settings';
import { extractDateFromFileName, toISODateKey } from './date';

export function getDateKeyFromFile(file: TFile, settings: CrystalPluginSettings): string | null {
    const format = settings.dailyNoteDateFormat || 'YYYY-MM-DD';
    const date = extractDateFromFileName(file.basename, format);
    return date ? toISODateKey(date) : null;
}

export function collectDailyNoteFiles(app: App, settings: CrystalPluginSettings): TFile[] {
    const folder = settings.dailyNotesFolder || 'DailyNotes';
    const files = app.vault.getFiles().filter(file => {
        return file.extension === 'md' && file.path.startsWith(`${folder}/`);
    });
    const withDates = files
        .map(file => ({
            file,
            date: extractDateFromFileName(file.basename, settings.dailyNoteDateFormat || 'YYYY-MM-DD')
        }))
        .filter(entry => entry.date !== null) as Array<{ file: TFile; date: Date }>;

    withDates.sort((a, b) => b.date.getTime() - a.date.getTime());
    return withDates.map(entry => entry.file);
}
