import { App, TFile } from 'obsidian';
import { CrystalPluginSettings } from '../../settings';
import { TimelineCalendar } from '../calendar';
import { collectDailyNoteFiles, DailyNotesConfig, getDateKeyFromFile, getDateFromKey, toISODateKey } from '../data';
import { filterTimelineContent, TimelineFilterMode } from '../filters';
import {
    ensureScrollable,
    getListTopOffset,
    getTopVisibleDateKey,
    getTopVisibleOffset,
    loadNext,
    loadPrevious,
    scrollElementToOffset
} from '../scroll';
import { TimelineFlowContext, jumpToDateKey, refreshTimeline, scrollToToday } from './flow';
import { buildTimelineHeader } from './header';
import { renderNote } from './render-range';
import { appHasDailyNotesPluginLoaded, DEFAULT_DAILY_NOTE_FORMAT, getDailyNoteSettings } from 'obsidian-daily-notes-interface';

type ControllerOptions = {
    app: App;
    contentEl: HTMLElement;
    registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    onSettingsChange?: () => Promise<void>;
    settings: CrystalPluginSettings;
    debugLog: (message: string, details?: Record<string, unknown>) => void;
    markdownComponent: any;
    isLeafDeferred?: () => boolean;
};

export class DailyNotesTimelineController {
    private app: App;
    private contentEl: HTMLElement;
    private registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    private settings: CrystalPluginSettings;
    private onSettingsChange: (() => Promise<void>) | null = null;
    private markdownComponent: any;
    private isLeafDeferred: (() => boolean) | null = null;
    private scrollerEl: HTMLDivElement | null = null;
    private listEl: HTMLDivElement | null = null;
    private filterSelectEl: HTMLSelectElement | null = null;
    private filterHeadingInputEl: HTMLInputElement | null = null;
    private searchInputEl: HTMLInputElement | null = null;
    private calendar: TimelineCalendar | null = null;
    private noteFiles: TFile[] = [];
    private startIndex = 0;
    private endIndex = -1;
    private isLoading = false;
    private refreshTimer: number | null = null;
    private topVisibleRaf: number | null = null;
    private currentTopDateKey: string | null = null;
    private readonly pageSize = 5;
    private readonly maxRendered = 20;
    private activeFilter: TimelineFilterMode = 'all';
    private headingFilterText = '';
    private searchQuery = '';
    private filteredContentCache = new Map<string, string | null>();
    private settingsSaveTimer: number | null = null;
    private debugLog: (message: string, details?: Record<string, unknown>) => void;
    private pendingRefresh = false;
    private dailyNotesConfig: DailyNotesConfig | null = null;

    constructor(options: ControllerOptions) {
        this.app = options.app;
        this.contentEl = options.contentEl;
        this.registerDomEvent = options.registerDomEvent;
        this.settings = options.settings;
        this.onSettingsChange = options.onSettingsChange ?? null;
        this.markdownComponent = options.markdownComponent;
        this.isLeafDeferred = options.isLeafDeferred ?? null;
        this.debugLog = options.debugLog;
    }

    async onOpen(): Promise<void> {
        this.contentEl.empty();
        this.contentEl.addClass('daily-note-timeline-root');
        this.activeFilter = this.settings.dailyNoteTimelineDefaultFilter ?? 'all';
        if (this.headingFilterText.trim().length === 0) {
            this.headingFilterText = this.settings.dailyNoteTimelineFilterHeadingDefault?.trim() ?? '';
        }
        this.buildHeader();
        this.buildScroller();
        this.buildCalendar();
        await this.refresh({ preserveScroll: false });
    }

    async onClose(): Promise<void> {
        this.contentEl.empty();
    }

    setSettings(settings: CrystalPluginSettings) {
        this.settings = settings;
        if (this.headingFilterText.trim().length === 0) {
            this.headingFilterText = this.settings.dailyNoteTimelineFilterHeadingDefault?.trim() ?? '';
            if (this.filterHeadingInputEl) {
                this.filterHeadingInputEl.value = this.headingFilterText;
            }
        }
        this.scheduleRefresh({ preserveScroll: true });
    }

    handleViewActivated(): Promise<void> {
        if (this.pendingRefresh) {
            this.pendingRefresh = false;
            return this.refresh({ preserveScroll: true });
        }
        return this.refresh({ preserveScroll: false });
    }

    onVaultChange(file: TFile | any) {
        if (!(file instanceof TFile)) {
            return;
        }
        const config = this.getDailyNotesConfig();
        if (!config) {
            return;
        }
        if (!this.isInDailyNotesFolder(file.path, config.folder)) {
            return;
        }
        this.filteredContentCache.clear();
        this.scheduleRefresh({ preserveScroll: true });
    }

    onActiveLeafChange(leaf: any, isCurrentLeaf: boolean) {
        if (isCurrentLeaf && this.pendingRefresh) {
            void this.handleViewActivated();
        }
    }

    private buildHeader() {
        const elements = buildTimelineHeader({
            contentEl: this.contentEl,
            registerDomEvent: this.registerDomEvent,
            activeFilter: this.activeFilter,
            headingFilterText: this.headingFilterText,
            searchQuery: this.searchQuery,
            onFilterChange: (mode) => {
                this.activeFilter = mode;
                this.settings.dailyNoteTimelineDefaultFilter = this.activeFilter;
                this.queueSettingsSave();
                this.updateFilterUi();
                this.filteredContentCache.clear();
                void this.refresh({ preserveScroll: true, alignTop: true });
            },
            onHeadingInput: (value) => {
                this.headingFilterText = value;
                this.settings.dailyNoteTimelineFilterHeadingDefault = this.headingFilterText;
                this.queueSettingsSave();
                this.filteredContentCache.clear();
                if (this.activeFilter === 'heading') {
                    void this.refresh({ preserveScroll: true, alignTop: true });
                }
            },
            onSearchInput: (value) => {
                this.searchQuery = value.trim();
                void this.refresh({ preserveScroll: true, alignTop: true });
            },
            onToday: () => {
                void this.scrollToToday();
            }
        });
        this.filterSelectEl = elements.filterSelectEl;
        this.filterHeadingInputEl = elements.filterHeadingInputEl;
        this.searchInputEl = elements.searchInputEl;
        this.updateFilterUi();
    }

    private buildScroller() {
        this.scrollerEl = this.contentEl.createDiv('daily-note-timeline-scroll');
        this.listEl = this.scrollerEl.createDiv('daily-note-timeline-list');
        this.registerDomEvent(this.scrollerEl, 'scroll', () => this.onScroll());
    }

    private buildCalendar() {
        this.calendar = new TimelineCalendar({
            contentEl: this.contentEl,
            settings: this.settings,
            registerDomEvent: this.registerDomEvent,
            onScrollToToday: () => {
                void this.scrollToToday();
            },
            onJumpToDateKey: (dateKey) => {
                void this.jumpToDateKey(dateKey);
            },
            onQueueSettingsSave: () => this.queueSettingsSave()
        });
        this.calendar.build();
        this.calendar.setVisible(this.settings.dailyNoteTimelineCalendarDefaultOpen ?? false);
    }

    private scheduleRefresh(options: { preserveScroll: boolean }) {
        if (this.refreshTimer !== null) {
            window.clearTimeout(this.refreshTimer);
        }
        this.refreshTimer = window.setTimeout(() => {
            this.refreshTimer = null;
            if (!this.isViewActive()) {
                this.pendingRefresh = true;
                return;
            }
            void this.refresh(options);
        }, 200);
    }

    private isViewActive(): boolean {
        if (this.isLeafDeferred?.()) {
            return false;
        }
        if (!this.contentEl?.isConnected) {
            return false;
        }
        return this.contentEl.offsetParent !== null || this.contentEl.getClientRects().length > 0;
    }

    private queueSettingsSave() {
        if (!this.onSettingsChange) {
            return;
        }
        if (this.settingsSaveTimer !== null) {
            window.clearTimeout(this.settingsSaveTimer);
        }
        this.settingsSaveTimer = window.setTimeout(() => {
            this.settingsSaveTimer = null;
            void this.onSettingsChange?.();
        }, 300);
    }

    private updateFilterUi() {
        if (!this.filterHeadingInputEl) {
            return;
        }
        this.filterHeadingInputEl.toggleClass('is-hidden', this.activeFilter !== 'heading');
    }

    private collectDailyNoteFiles(): TFile[] {
        const config = this.getDailyNotesConfig();
        if (!config) {
            return [];
        }
        return collectDailyNoteFiles(this.app, config);
    }

    private async getInitialTargetIndex(): Promise<number> {
        const todayKey = toISODateKey(new Date());
        return await this.findNearestIndexWithContent(todayKey);
    }

    private async refresh(options: { preserveScroll?: boolean; alignTop?: boolean } = {}): Promise<void> {
        await refreshTimeline(this.getFlowContext(), options);
    }

    private async renderRange(start: number, end: number): Promise<void> {
        if (!this.listEl) {
            return;
        }
        this.listEl.empty();
        this.startIndex = start;
        this.endIndex = end;
        for (let i = start; i <= end; i += 1) {
            await this.renderNote(this.noteFiles[i], 'append');
        }
    }

    private async renderNote(file: TFile, position: 'append' | 'prepend'): Promise<void> {
        if (!this.listEl) {
            return;
        }
        await renderNote({
            listEl: this.listEl,
            file,
            position,
            registerDomEvent: this.registerDomEvent,
            onOpenFile: (targetFile, openInNewLeaf) => {
                void this.app.workspace.getLeaf(openInNewLeaf).openFile(targetFile);
            },
            onOpenLink: (href, source, openInNewLeaf, isExternal) => {
                if (isExternal) {
                    window.open(href, '_blank');
                    return;
                }
                this.app.workspace.openLinkText(href, source, openInNewLeaf);
            },
            onToggleTask: async (targetFile, lineIndex, checked) => {
                await this.updateTaskLine(targetFile, lineIndex, checked);
            },
            activeFilter: this.activeFilter,
            headingFilterText: this.headingFilterText,
            searchQuery: this.searchQuery,
            markdownComponent: this.markdownComponent,
            resolveFilteredContent: (targetFile) => this.getFilteredContent(targetFile),
            resolveLinkSourcePath: (targetFile) => targetFile.path,
            resolveDateKey: (targetFile) => this.getDateKeyFromFile(targetFile)
        });
    }

    private applyFilter(content: string): string | null {
        return filterTimelineContent(content, this.activeFilter, this.headingFilterText.trim());
    }

    private async getFilteredContent(file: TFile): Promise<string | null> {
        const cached = this.filteredContentCache.get(file.path);
        if (cached !== undefined) {
            return this.applySearch(cached);
        }
        const content = await this.app.vault.cachedRead(file);
        const filtered = this.applyFilter(content);
        this.filteredContentCache.set(file.path, filtered);
        return this.applySearch(filtered);
    }

    private applySearch(content: string | null): string | null {
        if (content === null) {
            return null;
        }
        if (this.searchQuery.length === 0) {
            return content;
        }
        const haystack = content.toLowerCase();
        const needle = this.searchQuery.toLowerCase();
        return haystack.includes(needle) ? content : null;
    }

    private async updateTaskLine(file: TFile, lineIndex: number, checked: boolean): Promise<void> {
        await this.app.vault.process(file, (content) => {
            const lines = content.split('\n');
            if (lineIndex < 0 || lineIndex >= lines.length) {
                return content;
            }
            const line = lines[lineIndex];
            const updated = line.replace(/^(\s*[-*]\s+\[)([ xX])(\])/, `$1${checked ? 'x' : ' '}$3`);
            if (updated === line) {
                return content;
            }
            lines[lineIndex] = updated;
            return lines.join('\n');
        });
        this.filteredContentCache.delete(file.path);
    }

    private async scrollToToday(): Promise<void> {
        await scrollToToday(this.getFlowContext());
    }

    private async ensureScrollable() {
        if (!this.scrollerEl || this.isLoading || this.noteFiles.length === 0) {
            return;
        }
        await ensureScrollable({
            scrollerEl: this.scrollerEl,
            getStartIndex: () => this.startIndex,
            getEndIndex: () => this.endIndex,
            getNoteFilesLength: () => this.noteFiles.length,
            loadNext: () => this.loadNext(),
            loadPrevious: () => this.loadPrevious(),
            scheduleTopVisibleUpdate: () => this.scheduleTopVisibleUpdate()
        });
    }

    private async onScroll(): Promise<void> {
        if (!this.scrollerEl || this.isLoading || this.noteFiles.length === 0) {
            return;
        }
        const threshold = 200;
        const { scrollTop, scrollHeight, clientHeight } = this.scrollerEl;
        const remaining = scrollHeight - (scrollTop + clientHeight);

        if (scrollTop < threshold) {
            await this.loadPrevious();
        }
        if (remaining < threshold) {
            await this.loadNext();
        }
        this.scheduleTopVisibleUpdate();
    }

    private async loadPrevious(): Promise<void> {
        if (!this.listEl || this.startIndex === 0 || this.isLoading) {
            return;
        }
        this.isLoading = true;
        const { startIndex } = await loadPrevious({
            listEl: this.listEl,
            noteFiles: this.noteFiles,
            pageSize: this.pageSize,
            maxRendered: this.maxRendered,
            startIndex: this.startIndex,
            endIndex: this.endIndex,
            scrollerEl: this.scrollerEl,
            hasFilteredContent: (file) => this.hasFilteredContent(file),
            renderNote: (file, position) => this.renderNote(file, position)
        });
        this.startIndex = startIndex;
        this.isLoading = false;
    }

    private async loadNext(): Promise<void> {
        if (!this.listEl || this.endIndex >= this.noteFiles.length - 1 || this.isLoading) {
            return;
        }
        this.isLoading = true;
        const { endIndex } = await loadNext({
            listEl: this.listEl,
            noteFiles: this.noteFiles,
            pageSize: this.pageSize,
            maxRendered: this.maxRendered,
            startIndex: this.startIndex,
            endIndex: this.endIndex,
            scrollerEl: this.scrollerEl,
            hasFilteredContent: (file) => this.hasFilteredContent(file),
            renderNote: (file, position) => this.renderNote(file, position)
        });
        this.endIndex = endIndex;
        this.isLoading = false;
    }

    private scheduleTopVisibleUpdate() {
        if (this.topVisibleRaf !== null) {
            return;
        }
        this.topVisibleRaf = window.requestAnimationFrame(() => {
            this.topVisibleRaf = null;
            this.updateTopVisibleDate();
        });
    }

    private updateTopVisibleDate() {
        let topDateKey = getTopVisibleDateKey(this.scrollerEl, this.listEl);
        if (!topDateKey) {
            topDateKey = toISODateKey(new Date());
        }

        if (topDateKey === this.currentTopDateKey) {
            return;
        }
        this.currentTopDateKey = topDateKey;
        this.calendar?.updateForDate(topDateKey);
    }

    private getTopVisibleDateKey(): string | null {
        return getTopVisibleDateKey(this.scrollerEl, this.listEl);
    }

    private getTopVisibleOffset(): number | null {
        return getTopVisibleOffset(this.scrollerEl, this.listEl);
    }

    private getListTopOffset(): number {
        return getListTopOffset(this.scrollerEl, this.listEl);
    }

    private scrollToTargetIndex(targetIndex: number, offset: number) {
        const targetKey = this.getDateKeyFromFile(this.noteFiles[targetIndex]);
        this.debugLog('scrollToTargetIndex', { targetIndex, targetKey, offset });
        if (targetKey) {
            this.scrollToDateKey(targetKey, offset);
            this.scheduleScrollCorrection(targetKey, offset);
        } else {
            this.scrollToIndex(targetIndex);
        }
    }

    private scrollToIndex(targetIndex: number) {
        if (!this.scrollerEl || !this.listEl) {
            return;
        }
        const relativeIndex = targetIndex - this.startIndex;
        const targetEl = this.listEl.children[relativeIndex] as HTMLElement | undefined;
        if (!targetEl) {
            return;
        }
        this.debugLog('scrollToIndex', { targetIndex, relativeIndex, startIndex: this.startIndex });
        requestAnimationFrame(() => {
            if (!this.scrollerEl) {
                return;
            }
            const offset = this.getListTopOffset();
            scrollElementToOffset(targetEl, this.scrollerEl, offset);
            this.scheduleTopVisibleUpdate();
        });
    }

    private scrollToDateKey(dateKey: string, offset: number) {
        if (!this.scrollerEl || !this.listEl) {
            return;
        }
        const targetEl = this.listEl.querySelector(`[data-date="${dateKey}"]`) as HTMLElement | null;
        if (!targetEl) {
            return;
        }
        this.debugLog('scrollToDateKey', { dateKey, offset });
        requestAnimationFrame(() => {
            scrollElementToOffset(targetEl, this.scrollerEl, offset);
            this.scheduleTopVisibleUpdate();
        });
    }

    private scheduleScrollCorrection(dateKey: string, offset: number) {
        window.requestAnimationFrame(() => {
            this.scrollToDateKey(dateKey, offset);
            window.setTimeout(() => {
                this.scrollToDateKey(dateKey, offset);
            }, 80);
        });
    }

    private async jumpToDateKey(dateKey: string) {
        await jumpToDateKey(this.getFlowContext(), dateKey);
    }

    private async hasFilteredContent(file: TFile): Promise<boolean> {
        return await this.getFilteredContent(file) !== null;
    }

    private findIndexByDateKey(dateKey: string): number {
        return this.noteFiles.findIndex(file => this.getDateKeyFromFile(file) === dateKey);
    }

    private async findNearestIndexWithContent(dateKey: string): Promise<number> {
        if (this.noteFiles.length === 0) {
            return -1;
        }
        const targetDate = getDateFromKey(dateKey);
        let bestIndex = -1;
        let bestDiff = Number.POSITIVE_INFINITY;
        for (let i = 0; i < this.noteFiles.length; i += 1) {
            const fileDateKey = this.getDateKeyFromFile(this.noteFiles[i]);
            if (!fileDateKey) {
                continue;
            }
            if (!await this.hasFilteredContent(this.noteFiles[i])) {
                continue;
            }
            const fileDate = getDateFromKey(fileDateKey);
            const diff = Math.abs(fileDate.getTime() - targetDate.getTime());
            if (diff < bestDiff) {
                bestDiff = diff;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    private getFlowContext(): TimelineFlowContext {
        return {
            getListEl: () => this.listEl,
            getScrollerEl: () => this.scrollerEl,
            getNoteFiles: () => this.noteFiles,
            setNoteFiles: (files: TFile[]) => {
                this.noteFiles = files;
            },
            getStartIndex: () => this.startIndex,
            setStartIndex: (value: number) => {
                this.startIndex = value;
            },
            getEndIndex: () => this.endIndex,
            setEndIndex: (value: number) => {
                this.endIndex = value;
            },
            getPageSize: () => this.pageSize,
            clearFilteredContentCache: () => {
                this.filteredContentCache.clear();
            },
            collectDailyNoteFiles: () => this.collectDailyNoteFiles(),
            getInitialTargetIndex: () => this.getInitialTargetIndex(),
            getTopVisibleDateKey: () => this.getTopVisibleDateKey(),
            getTopVisibleOffset: () => this.getTopVisibleOffset(),
            findIndexByDateKey: (targetKey: string) => this.findIndexByDateKey(targetKey),
            hasFilteredContent: (file: TFile) => this.hasFilteredContent(file),
            findNearestIndexWithContent: (targetKey: string) => this.findNearestIndexWithContent(targetKey),
            renderRange: (start: number, end: number) => this.renderRange(start, end),
            getListTopOffset: () => this.getListTopOffset(),
            scrollToTargetIndex: (targetIndex: number, offset: number) => this.scrollToTargetIndex(targetIndex, offset),
            ensureScrollable: () => this.ensureScrollable(),
            scheduleTopVisibleUpdate: () => this.scheduleTopVisibleUpdate(),
            debugLog: (message: string, details?: Record<string, unknown>) => this.debugLog(message, details)
        };
    }

    private getDateKeyFromFile(file: TFile): string | null {
        const config = this.getDailyNotesConfig();
        if (!config) {
            return null;
        }
        return getDateKeyFromFile(file, config);
    }

    private getDailyNotesConfig(): DailyNotesConfig | null {
        if (!appHasDailyNotesPluginLoaded()) {
            this.dailyNotesConfig = null;
            return null;
        }
        const settings = getDailyNoteSettings();
        const folder = settings?.folder?.trim() ?? '';
        const format = settings?.format?.trim() || DEFAULT_DAILY_NOTE_FORMAT;
        this.dailyNotesConfig = { folder, format };
        return this.dailyNotesConfig;
    }

    private isInDailyNotesFolder(filePath: string, folder: string): boolean {
        if (folder.trim().length === 0) {
            return !filePath.includes('/');
        }
        return filePath.startsWith(`${folder}/`);
    }

    // Notice removed: view already shows "No daily notes found."
}
