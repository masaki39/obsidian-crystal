import { App, Plugin, TFile } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import { isDailyNoteFile } from '../../shared/daily-note';
import { orderTaskList } from './task-order';
import { transformBeforeTimeline } from './timeline';

/** Keep the task lists of a daily note sorted whenever it is modified. */
export function registerDailyNoteAutoSort(app: App, plugin: Plugin, getSettings: () => CrystalPluginSettings) {
    plugin.registerEvent(app.vault.on('modify', file => {
        if (!(file instanceof TFile)) {
            return;
        }
        if (!isDailyNoteFile(file)) {
            return;
        }
        app.vault.process(file, (content) => {
            if (!getSettings().dailyNoteAutoSort) {
                return content;
            }
            const heading = getSettings().dailyNoteTimelineHeading || '# Time Line';
            return transformBeforeTimeline(content, heading, (before) => orderTaskList(before, getSettings().dailyNoteNewestFirst));
        });
    }));
}
