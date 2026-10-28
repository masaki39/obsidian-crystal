import { App, Plugin, TFile } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import { parseFrontmatter } from '../../shared/markdown/frontmatter';
import { isDailyNoteFile } from './paths';
import { orderTaskList } from './task-order';
import { recombineSections, splitByTimeline } from './timeline';

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
            const { frontmatter, content: parsedContent } = parseFrontmatter(content);
            const { before, timeline } = splitByTimeline(parsedContent, heading);
            const orderedBefore = orderTaskList(before, getSettings().dailyNoteNewestFirst);
            const body = recombineSections(orderedBefore, timeline);
            const newContent = `${frontmatter}${body}`;
            return newContent;
        });
    }));
}
