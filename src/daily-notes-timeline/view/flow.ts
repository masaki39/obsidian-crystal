import { TFile } from 'obsidian';
import { toISODateKey } from '../data';

export type TimelineFlowContext = {
    getListEl: () => HTMLDivElement | null;
    getScrollerEl: () => HTMLDivElement | null;
    getNoteFiles: () => TFile[];
    setNoteFiles: (files: TFile[]) => void;
    getStartIndex: () => number;
    setStartIndex: (value: number) => void;
    getEndIndex: () => number;
    setEndIndex: (value: number) => void;
    getPageSize: () => number;
    clearFilteredContentCache: () => void;
    collectDailyNoteFiles: () => TFile[];
    getInitialTargetIndex: () => Promise<number>;
    getTopVisibleDateKey: () => string | null;
    getTopVisibleOffset: () => number | null;
    findIndexByDateKey: (dateKey: string) => number;
    hasFilteredContent: (file: TFile) => Promise<boolean>;
    findNearestIndexWithContent: (dateKey: string) => Promise<number>;
    renderRange: (start: number, end: number) => Promise<void>;
    getListTopOffset: () => number;
    scrollToTargetIndex: (targetIndex: number, offset: number) => void;
    ensureScrollable: () => Promise<void>;
    scheduleTopVisibleUpdate: () => void;
    debugLog: (message: string, details?: Record<string, unknown>) => void;
};

export async function refreshTimeline(
    ctx: TimelineFlowContext,
    options: { preserveScroll?: boolean; alignTop?: boolean } = {}
): Promise<void> {
    const listEl = ctx.getListEl();
    if (!listEl) {
        return;
    }
    const preserveScroll = options.preserveScroll ?? false;
    const alignTop = options.alignTop ?? false;
    const anchorKey = preserveScroll ? ctx.getTopVisibleDateKey() : null;
    const anchorOffset = preserveScroll && !alignTop ? ctx.getTopVisibleOffset() : null;
    ctx.debugLog('refresh:start', { preserveScroll, alignTop, anchorKey, anchorOffset });
    ctx.clearFilteredContentCache();
    ctx.setNoteFiles(ctx.collectDailyNoteFiles());
    listEl.empty();
    ctx.setStartIndex(0);
    ctx.setEndIndex(-1);

    const noteFiles = ctx.getNoteFiles();
    if (noteFiles.length === 0) {
        listEl.createDiv({ text: 'No daily notes found.', cls: 'daily-note-timeline-empty' });
        return;
    }

    if (preserveScroll && anchorKey) {
        const anchorIndex = ctx.findIndexByDateKey(anchorKey);
        let targetIndex = -1;
        if (anchorIndex !== -1 && await ctx.hasFilteredContent(noteFiles[anchorIndex])) {
            targetIndex = anchorIndex;
        } else {
            const todayKey = toISODateKey(new Date());
            const todayIndex = ctx.findIndexByDateKey(todayKey);
            if (todayIndex !== -1 && await ctx.hasFilteredContent(noteFiles[todayIndex])) {
                targetIndex = todayIndex;
            } else {
                targetIndex = await ctx.findNearestIndexWithContent(anchorKey);
            }
        }
        if (targetIndex !== -1) {
            const start = Math.max(0, targetIndex - ctx.getPageSize());
            const end = Math.min(noteFiles.length - 1, targetIndex + ctx.getPageSize());
            await ctx.renderRange(start, end);
            const offset = alignTop ? ctx.getListTopOffset() : (anchorOffset ?? 0);
            ctx.debugLog('refresh:scroll-preserve', { targetIndex, start, end, offset });
            ctx.scrollToTargetIndex(targetIndex, offset);
            await ctx.ensureScrollable();
            return;
        }
    }

    const targetIndex = await ctx.getInitialTargetIndex();
    ctx.debugLog('refresh:initial-target', { targetIndex, noteCount: noteFiles.length });
    if (targetIndex === -1) {
        ctx.scheduleTopVisibleUpdate();
        return;
    }
    const start = Math.max(0, targetIndex - ctx.getPageSize());
    const end = Math.min(noteFiles.length - 1, targetIndex + ctx.getPageSize());
    await ctx.renderRange(start, end);
    if (targetIndex !== -1) {
        const offset = ctx.getListTopOffset();
        ctx.debugLog('refresh:scroll-initial', { targetIndex, start, end, offset });
        ctx.scrollToTargetIndex(targetIndex, offset);
    } else {
        ctx.scheduleTopVisibleUpdate();
    }
    await ctx.ensureScrollable();
}

export async function scrollToToday(ctx: TimelineFlowContext): Promise<void> {
    const listEl = ctx.getListEl();
    if (!listEl) {
        return;
    }
    ctx.debugLog('scrollToToday:start');
    ctx.setNoteFiles(ctx.collectDailyNoteFiles());
    listEl.empty();
    ctx.setStartIndex(0);
    ctx.setEndIndex(-1);

    const noteFiles = ctx.getNoteFiles();
    if (noteFiles.length === 0) {
        listEl.createDiv({ text: 'No daily notes found.', cls: 'daily-note-timeline-empty' });
        return;
    }

    const targetIndex = await ctx.getInitialTargetIndex();
    if (targetIndex === -1) {
        return;
    }

    const start = Math.max(0, targetIndex - ctx.getPageSize());
    const end = Math.min(noteFiles.length - 1, targetIndex + ctx.getPageSize());
    await ctx.renderRange(start, end);
    const offset = ctx.getListTopOffset();
    ctx.debugLog('scrollToToday:scroll', { targetIndex, start, end, offset });
    ctx.scrollToTargetIndex(targetIndex, offset);
}

export async function jumpToDateKey(ctx: TimelineFlowContext, dateKey: string): Promise<void> {
    const noteFiles = ctx.getNoteFiles().length > 0 ? ctx.getNoteFiles() : ctx.collectDailyNoteFiles();
    if (noteFiles.length === 0) {
        return;
    }
    ctx.setNoteFiles(noteFiles);
    const targetIndex = await ctx.findNearestIndexWithContent(dateKey);
    if (targetIndex === -1) {
        return;
    }
    const start = Math.max(0, targetIndex - ctx.getPageSize());
    const end = Math.min(noteFiles.length - 1, targetIndex + ctx.getPageSize());
    await ctx.renderRange(start, end);
    const offset = ctx.getListTopOffset();
    ctx.scrollToTargetIndex(targetIndex, offset);
}
