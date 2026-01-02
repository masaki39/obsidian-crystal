import { App, TFile } from 'obsidian';
import { CrystalPluginSettings } from '../../settings';
import { TimelineCalendar } from '../calendar';
import { collectDailyNoteFiles, DailyNotesConfig, getDateKeyFromFile, getDateFromKey, toISODateKey } from '../data';
import { TimelineFilterMode } from '../filters';
import { TimelineFlowContext, jumpToDateKey, refreshTimeline, scrollToToday } from './flow';
import { buildTimelineHeader } from './header';
import { TimelineRenderManager } from './render-manager';
import { TimelineScrollManager } from './scroll-manager';
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
    private filterTabButtons: HTMLButtonElement[] = [];
    private filterHeadingInputEl: HTMLInputElement | null = null;
    private searchInputEl: HTMLInputElement | null = null;
    private calendar: TimelineCalendar | null = null;
    private noteFiles: TFile[] = [];
    private startIndex = 0;
    private endIndex = -1;
    private refreshTimer: number | null = null;
    private readonly pageSize = 5;
    private readonly maxRendered = 20;
    private activeFilter: TimelineFilterMode = 'all';
    private headingFilterText = '';
    private searchQuery = '';
    private settingsSaveTimer: number | null = null;
    private debugLog: (message: string, details?: Record<string, unknown>) => void;
    private pendingRefresh = false;
    private dailyNotesConfig: DailyNotesConfig | null = null;
    private noteFilesCache: TFile[] | null = null;
    private noteFilesCacheKey: string | null = null;
    private renderManager: TimelineRenderManager;
    private scrollManager: TimelineScrollManager;

    constructor(options: ControllerOptions) {
        this.app = options.app;
        this.contentEl = options.contentEl;
        this.registerDomEvent = options.registerDomEvent;
        this.settings = options.settings;
        this.onSettingsChange = options.onSettingsChange ?? null;
        this.markdownComponent = options.markdownComponent;
        this.isLeafDeferred = options.isLeafDeferred ?? null;
        this.debugLog = options.debugLog;
        this.renderManager = new TimelineRenderManager({
            app: options.app,
            markdownComponent: options.markdownComponent,
            registerDomEvent: options.registerDomEvent,
            onOpenFile: (file, openInNewLeaf) => {
                void this.app.workspace.getLeaf(openInNewLeaf).openFile(file);
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
            resolveLinkSourcePath: (targetFile) => targetFile.path,
            resolveDateKey: (targetFile) => this.getDateKeyFromFile(targetFile),
            getActiveFilter: () => this.activeFilter,
            getHeadingFilterText: () => this.headingFilterText,
            getSearchQuery: () => this.searchQuery
        });
        this.scrollManager = new TimelineScrollManager({
            contentEl: options.contentEl,
            registerDomEvent: options.registerDomEvent,
            getNoteFiles: () => this.noteFiles,
            getStartIndex: () => this.startIndex,
            setStartIndex: (value) => {
                this.startIndex = value;
            },
            getEndIndex: () => this.endIndex,
            setEndIndex: (value) => {
                this.endIndex = value;
            },
            getPageSize: () => this.pageSize,
            getMaxRendered: () => this.maxRendered,
            renderNote: (file, position, noteIndex) => this.renderNote(file, position, noteIndex),
            hasFilteredContent: (file) => this.hasFilteredContent(file),
            onRemoveRenderedNote: (element) => this.renderManager.cleanupRenderedNote(element),
            resolveDateKey: (file) => this.getDateKeyFromFile(file),
            onTopVisibleDateChange: (dateKey) => {
                this.calendar?.updateForDate(dateKey);
            },
            debugLog: (message, details) => this.debugLog(message, details)
        });
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
        this.renderManager.clearRenderedNotes();
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
        this.scheduleRefresh({ preserveScroll: true, clearFilteredCache: true });
    }

    handleViewActivated(): Promise<void> {
        if (this.pendingRefresh) {
            this.pendingRefresh = false;
            return this.refresh({ preserveScroll: true, clearFilteredCache: false });
        }
        return this.refresh({ preserveScroll: false, clearFilteredCache: false });
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
                this.renderManager.clearFilteredContentCache();
                void this.refresh({ preserveScroll: true, alignTop: true, clearFilteredCache: true });
            },
            onHeadingInput: (value) => {
                this.headingFilterText = value;
                this.settings.dailyNoteTimelineFilterHeadingDefault = this.headingFilterText;
                this.queueSettingsSave();
                this.renderManager.clearFilteredContentCache();
                if (this.activeFilter === 'heading') {
                    void this.refresh({ preserveScroll: true, alignTop: true, clearFilteredCache: true });
                }
            },
            onSearchInput: (value) => {
                this.searchQuery = value.trim();
                void this.refresh({ preserveScroll: true, alignTop: true, clearFilteredCache: false });
            },
            onToday: () => {
                void this.scrollToToday();
            }
        });
        this.filterTabButtons = elements.filterTabButtons;
        this.filterHeadingInputEl = elements.filterHeadingInputEl;
        this.searchInputEl = elements.searchInputEl;
        this.updateFilterUi();
    }

    private buildScroller() {
        this.scrollManager.buildScroller();
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

    private scheduleRefresh(options: { preserveScroll: boolean; clearFilteredCache?: boolean }) {
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
        for (const button of this.filterTabButtons) {
            const mode = (button.dataset.filter as TimelineFilterMode) ?? 'all';
            button.toggleClass('is-active', mode === this.activeFilter);
        }
    }

    private collectDailyNoteFiles(): TFile[] {
        const config = this.getDailyNotesConfig();
        if (!config) {
            this.noteFilesCache = null;
            this.noteFilesCacheKey = null;
            return [];
        }
        const cacheKey = `${config.folder}::${config.format}`;
        if (this.noteFilesCache && this.noteFilesCacheKey === cacheKey) {
            return this.noteFilesCache;
        }
        const files = collectDailyNoteFiles(this.app, config);
        this.noteFilesCache = files;
        this.noteFilesCacheKey = cacheKey;
        return files;
    }

    private async getInitialTargetIndex(): Promise<number> {
        const todayKey = toISODateKey(new Date());
        return await this.findNearestIndexWithContent(todayKey);
    }

    private async refresh(options: { preserveScroll?: boolean; alignTop?: boolean; clearFilteredCache?: boolean } = {}): Promise<void> {
        await refreshTimeline(this.getFlowContext(), options);
    }

    private async renderRange(start: number, end: number): Promise<void> {
        const listEl = this.scrollManager.getListEl();
        if (!listEl) {
            return;
        }
        this.renderManager.clearRenderedNotes();
        listEl.empty();
        this.startIndex = start;
        this.endIndex = end;
        for (let i = start; i <= end; i += 1) {
            await this.renderNote(this.noteFiles[i], 'append', i);
        }
        this.updateRenderedRangeFromDom();
    }

    private async renderNote(file: TFile, position: 'append' | 'prepend', noteIndex: number): Promise<void> {
        const listEl = this.scrollManager.getListEl();
        if (!listEl) {
            return;
        }
        await this.renderManager.renderNote(listEl, file, position, noteIndex);
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
        this.renderManager.invalidateFile(file.path);
    }

    private async scrollToToday(): Promise<void> {
        await scrollToToday(this.getFlowContext());
    }

    private updateRenderedRangeFromDom() {
        const listEl = this.scrollManager.getListEl();
        if (!listEl || listEl.children.length === 0) {
            return;
        }
        const first = listEl.firstElementChild as HTMLElement | null;
        const last = listEl.lastElementChild as HTMLElement | null;
        const firstIndex = first?.dataset.index ? Number(first.dataset.index) : Number.NaN;
        const lastIndex = last?.dataset.index ? Number(last.dataset.index) : Number.NaN;
        if (Number.isFinite(firstIndex)) {
            this.startIndex = firstIndex;
        }
        if (Number.isFinite(lastIndex)) {
            this.endIndex = lastIndex;
        }
    }

    private async jumpToDateKey(dateKey: string) {
        await jumpToDateKey(this.getFlowContext(), dateKey);
    }

    private async hasFilteredContent(file: TFile): Promise<boolean> {
        return await this.renderManager.hasFilteredContent(file);
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
            getListEl: () => this.scrollManager.getListEl(),
            getScrollerEl: () => this.scrollManager.getScrollerEl(),
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
                this.renderManager.clearFilteredContentCache();
            },
            clearRenderedNotes: () => this.renderManager.clearRenderedNotes(),
            collectDailyNoteFiles: () => this.collectDailyNoteFiles(),
            getInitialTargetIndex: () => this.getInitialTargetIndex(),
            getTopVisibleDateKey: () => this.scrollManager.getTopVisibleDateKey(),
            getTopVisibleOffset: () => this.scrollManager.getTopVisibleOffset(),
            findIndexByDateKey: (targetKey: string) => this.findIndexByDateKey(targetKey),
            hasFilteredContent: (file: TFile) => this.hasFilteredContent(file),
            findNearestIndexWithContent: (targetKey: string) => this.findNearestIndexWithContent(targetKey),
            renderRange: (start: number, end: number) => this.renderRange(start, end),
            getListTopOffset: () => this.scrollManager.getListTopOffset(),
            scrollToTargetIndex: (targetIndex: number, offset: number) => this.scrollManager.scrollToTargetIndex(targetIndex, offset),
            ensureScrollable: () => this.scrollManager.ensureScrollable(),
            scheduleTopVisibleUpdate: () => this.scrollManager.scheduleTopVisibleUpdate(),
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

    private invalidateNoteFilesCache() {
        this.noteFilesCache = null;
        this.noteFilesCacheKey = null;
    }

    onVaultModify(file: TFile | any) {
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
        this.renderManager.invalidateFile(file.path);
        this.scheduleRefresh({ preserveScroll: true, clearFilteredCache: false });
    }

    onVaultCreate(file: TFile | any) {
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
        this.invalidateNoteFilesCache();
        this.renderManager.invalidateFile(file.path);
        this.scheduleRefresh({ preserveScroll: true, clearFilteredCache: false });
    }

    onVaultDelete(file: TFile | any) {
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
        this.invalidateNoteFilesCache();
        this.renderManager.invalidateFile(file.path);
        this.scheduleRefresh({ preserveScroll: true, clearFilteredCache: false });
    }

    onVaultRename(file: TFile | any, oldPath?: string) {
        if (!(file instanceof TFile)) {
            return;
        }
        const config = this.getDailyNotesConfig();
        if (!config) {
            return;
        }
        const wasInFolder = oldPath ? this.isInDailyNotesFolder(oldPath, config.folder) : false;
        const isInFolder = this.isInDailyNotesFolder(file.path, config.folder);
        if (!wasInFolder && !isInFolder) {
            return;
        }
        this.invalidateNoteFilesCache();
        if (oldPath) {
            this.renderManager.invalidateFile(oldPath);
        }
        this.renderManager.invalidateFile(file.path);
        this.scheduleRefresh({ preserveScroll: true, clearFilteredCache: false });
    }

    // Notice removed: view already shows "No daily notes found."
}
