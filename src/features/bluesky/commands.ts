import type { Plugin } from 'obsidian';
import type { BlueskyService } from './service';

export function registerBlueskyCommands(plugin: Plugin, service: BlueskyService) {
    plugin.addCommand({
        id: 'crystal-post-to-bluesky',
        name: 'Bluesky: Post to Bluesky',
        icon: 'cloud',
        callback: () => {
            service.promptAndPost();
        }
    });

    plugin.addCommand({
        id: 'crystal-post-to-daily-note',
        name: 'Bluesky: Post to daily note timeline',
        icon: 'calendar-days',
        callback: () => {
            service.promptAndAppendToDailyNote();
        }
    });
}
