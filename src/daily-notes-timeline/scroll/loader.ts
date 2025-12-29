import { TFile } from 'obsidian';
import { getAnchorOffset, restoreAnchorOffset } from './scroll-utils';

type LoaderOptions = {
    listEl: HTMLDivElement;
    noteFiles: TFile[];
    pageSize: number;
    maxRendered: number;
    startIndex: number;
    endIndex: number;
    scrollerEl: HTMLDivElement | null;
    hasFilteredContent: (file: TFile) => Promise<boolean>;
    renderNote: (file: TFile, position: 'append' | 'prepend') => Promise<void>;
};

type LoaderResult = {
    startIndex: number;
    endIndex: number;
};

function trimRendered(listEl: HTMLDivElement, maxRendered: number, direction: 'top' | 'bottom', scrollerEl: HTMLDivElement | null, startIndex: number, endIndex: number): LoaderResult {
    const currentCount = listEl.children.length;
    if (currentCount <= maxRendered) {
        return { startIndex, endIndex };
    }
    const removeCount = currentCount - maxRendered;
    if (removeCount <= 0) {
        return { startIndex, endIndex };
    }

    if (direction === 'top') {
        const anchor = listEl.children[removeCount] as HTMLElement | undefined;
        const anchorOffset = getAnchorOffset(anchor, scrollerEl);
        for (let i = 0; i < removeCount; i += 1) {
            listEl.firstElementChild?.remove();
        }
        const nextStartIndex = Math.min(startIndex + removeCount, endIndex + 1);
        restoreAnchorOffset(anchor, anchorOffset, scrollerEl);
        return { startIndex: nextStartIndex, endIndex };
    }

    for (let i = 0; i < removeCount; i += 1) {
        listEl.lastElementChild?.remove();
    }
    const nextEndIndex = Math.max(startIndex - 1, endIndex - removeCount);
    return { startIndex, endIndex: nextEndIndex };
}

export async function loadPrevious(options: LoaderOptions): Promise<LoaderResult> {
    if (options.startIndex === 0) {
        return { startIndex: options.startIndex, endIndex: options.endIndex };
    }
    let newStart = options.startIndex;
    let renderedCount = 0;
    const targetCount = options.pageSize;
    const anchor = options.listEl.firstElementChild as HTMLElement | null;
    const anchorOffset = getAnchorOffset(anchor, options.scrollerEl);

    for (let i = options.startIndex - 1; i >= 0 && renderedCount < targetCount; i -= 1) {
        newStart = i;
        if (!await options.hasFilteredContent(options.noteFiles[i])) {
            continue;
        }
        await options.renderNote(options.noteFiles[i], 'prepend');
        renderedCount += 1;
    }

    const trimmed = trimRendered(options.listEl, options.maxRendered, 'bottom', options.scrollerEl, newStart, options.endIndex);
    restoreAnchorOffset(anchor, anchorOffset, options.scrollerEl);
    return trimmed;
}

export async function loadNext(options: LoaderOptions): Promise<LoaderResult> {
    if (options.endIndex >= options.noteFiles.length - 1) {
        return { startIndex: options.startIndex, endIndex: options.endIndex };
    }
    let newEnd = options.endIndex;
    let renderedCount = 0;
    const targetCount = options.pageSize;

    for (let i = options.endIndex + 1; i < options.noteFiles.length && renderedCount < targetCount; i += 1) {
        newEnd = i;
        if (!await options.hasFilteredContent(options.noteFiles[i])) {
            continue;
        }
        await options.renderNote(options.noteFiles[i], 'append');
        renderedCount += 1;
    }

    const trimmed = trimRendered(options.listEl, options.maxRendered, 'top', options.scrollerEl, options.startIndex, newEnd);
    return trimmed;
}
