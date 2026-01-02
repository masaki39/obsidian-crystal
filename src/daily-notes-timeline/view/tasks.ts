import { App, TFile } from 'obsidian';
import { findHeadingSectionRange, isTaskLine, TimelineFilterMode } from '../filters';

type TaskToggleOptions = {
    app: App;
    container: HTMLElement;
    file: TFile;
    registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    activeFilter: TimelineFilterMode;
    headingFilterText: string;
    filteredContent: string;
    onToggleTask: (file: TFile, lineIndex: number, checked: boolean) => Promise<void>;
};

export function mapTaskLineIndices(content: string, filteredContent: string): number[] {
    const lines = content.split('\n');
    const filteredLines = filteredContent.split('\n');
    const filteredTaskLines = filteredLines.filter(line => isTaskLine(line));
    if (filteredTaskLines.length === 0) {
        return [];
    }
    const indices: number[] = [];
    let searchFrom = 0;
    for (const taskLine of filteredTaskLines) {
        let found = false;
        for (let i = searchFrom; i < lines.length; i += 1) {
            if (lines[i] === taskLine) {
                indices.push(i);
                searchFrom = i + 1;
                found = true;
                break;
            }
        }
        if (!found) {
            continue;
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
    const taskLineIndices = mapTaskLineIndices(content, options.filteredContent);
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
