import { App, TFile } from 'obsidian';
import { findHeadingSectionRange, isTaskLine, TimelineFilterMode } from '../filters';

type TaskToggleOptions = {
    app: App;
    container: HTMLElement;
    file: TFile;
    registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    activeFilter: TimelineFilterMode;
    headingFilterText: string;
    onToggleTask: (file: TFile, lineIndex: number, checked: boolean) => Promise<void>;
};

function getTaskLineIndicesForFilter(content: string, activeFilter: TimelineFilterMode, headingFilterText: string): number[] {
    const lines = content.split('\n');
    if (activeFilter === 'heading') {
        const range = findHeadingSectionRange(lines, headingFilterText.trim());
        if (!range) {
            return [];
        }
        const indices: number[] = [];
        for (let i = range.start; i < range.end; i += 1) {
            if (isTaskLine(lines[i])) {
                indices.push(i);
            }
        }
        return indices;
    }

    const indices: number[] = [];
    for (let i = 0; i < lines.length; i += 1) {
        if (isTaskLine(lines[i])) {
            if (activeFilter === 'tasks' || activeFilter === 'all') {
                indices.push(i);
            }
        }
    }
    return indices;
}

export async function attachTaskToggleHandler(options: TaskToggleOptions): Promise<void> {
    const checkboxes = Array.from(options.container.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
    if (checkboxes.length === 0) {
        return;
    }

    const content = await options.app.vault.cachedRead(options.file);
    const taskLineIndices = getTaskLineIndicesForFilter(content, options.activeFilter, options.headingFilterText);
    const mappedCount = Math.min(taskLineIndices.length, checkboxes.length);
    for (let i = 0; i < mappedCount; i += 1) {
        checkboxes[i].dataset.crystalTaskLine = String(taskLineIndices[i]);
    }

    options.registerDomEvent(options.container, 'change', async (event: Event) => {
        const target = event.target as HTMLInputElement | null;
        if (!target || target.type !== 'checkbox') {
            return;
        }
        const lineAttr = target.dataset.crystalTaskLine ?? target.closest('[data-line]')?.getAttribute('data-line');
        const lineIndex = lineAttr !== null && lineAttr !== undefined ? Number(lineAttr) : Number.NaN;
        if (!Number.isFinite(lineIndex)) {
            return;
        }
        await options.onToggleTask(options.file, lineIndex, target.checked);
    });
}
