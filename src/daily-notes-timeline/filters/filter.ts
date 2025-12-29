import { extractHeadingSectionFromContent } from './header';
import { filterTasksContent } from './tasks';

export type TimelineFilterMode = 'all' | 'tasks' | 'heading';

export function filterTimelineContent(content: string, mode: TimelineFilterMode, headingText: string): string | null {
    if (mode === 'tasks') {
        return filterTasksContent(content);
    }
    if (mode === 'heading') {
        return extractHeadingSectionFromContent(content, headingText);
    }
    return content;
}
