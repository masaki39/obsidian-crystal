import { ItemView, MarkdownRenderer, setIcon, TFile, WorkspaceLeaf } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export const DAILY_NOTE_TIMELINE_VIEW = 'daily-note-timeline-view';

export type TimelineFilterMode = 'all' | 'tasks' | 'heading';

const TASK_LINE_REGEX = /^\s*[-*]\s+\[[ xX]\]\s+/;

type HeadingSectionRange = { start: number; end: number };

function findHeadingSectionRange(lines: string[], headingText: string): HeadingSectionRange | null {
    const targetText = headingText.replace(/^#+\s*/, '').trim();
    if (!targetText) {
        return null;
    }
    let startIndex = -1;
    let level = 1;
    for (let i = 0; i < lines.length; i += 1) {
        const match = lines[i].match(/^(#+)\s+(.*)$/);
        if (!match) {
            continue;
        }
        const [, hashes, text] = match;
        if (text.trim() === targetText) {
            startIndex = i;
            level = hashes.length;
            break;
        }
    }
    if (startIndex === -1) {
        return null;
    }
    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i += 1) {
        const headingMatch = lines[i].match(/^(#+)\s/);
        if (headingMatch && headingMatch[1].length <= level) {
            endIndex = i;
            break;
        }
    }
    return { start: startIndex + 1, end: endIndex };
}

function isTaskLine(line: string): boolean {
    return TASK_LINE_REGEX.test(line);
}

export function filterTasksContent(content: string): string | null {
    const lines = content.split('\n');
    const taskLines = lines.filter(line => isTaskLine(line));
    return taskLines.length > 0 ? taskLines.join('\n') : null;
}

export function extractHeadingSectionFromContent(content: string, headingText: string): string | null {
    const lines = content.split('\n');
    const range = findHeadingSectionRange(lines, headingText);
    if (!range) {
        return null;
    }
    const sectionLines = lines.slice(range.start, range.end);
    return sectionLines.length > 0 ? sectionLines.join('\n') : null;
}

export function filterTimelineContent(content: string, mode: TimelineFilterMode, headingText: string): string | null {
    if (mode === 'tasks') {
        return filterTasksContent(content);
    }
    if (mode === 'heading') {
        return extractHeadingSectionFromContent(content, headingText);
    }
    return content;
}

export class DailyNoteTimelineView extends ItemView {
    private settings: CrystalPluginSettings;
    private scrollerEl: HTMLDivElement | null = null;
    private listEl: HTMLDivElement | null = null;
    private filterSelectEl: HTMLSelectElement | null = null;
    private filterHeadingInputEl: HTMLInputElement | null = null;
    private calendarEl: HTMLDivElement | null = null;
    private calendarGridEl: HTMLDivElement | null = null;
    private calendarTitleEl: HTMLDivElement | null = null;
    private toggleButtonEl: HTMLButtonElement | null = null;
    private isCalendarVisible = false;
    private noteFiles: TFile[] = [];
    private startIndex = 0;
    private endIndex = -1;
    private isLoading = false;
    private refreshTimer: number | null = null;
    private topVisibleRaf: number | null = null;
    private currentTopDateKey: string | null = null;
    private currentMonthKey: string | null = null;
    private currentMonthDate: Date | null = null;
    private readonly pageSize = 5;
    private readonly maxRendered = 20;
    private activeFilter: TimelineFilterMode = 'all';
    private headingFilterText = '';
    private filteredContentCache = new Map<string, string | null>();
    private readonly debugFlag = 'CRYSTAL_TIMELINE_DEBUG';
    private pendingRefresh = false;
    private onSettingsChange: (() => Promise<void>) | null = null;
    private settingsSaveTimer: number | null = null;

    constructor(leaf: WorkspaceLeaf, settings: CrystalPluginSettings, onSettingsChange?: () => Promise<void>) {
        super(leaf);
        this.settings = settings;
        this.onSettingsChange = onSettingsChange ?? null;
    }

    public async handleViewActivated(): Promise<void> {
        this.debugLog('activate');
        if (this.pendingRefresh) {
            this.pendingRefresh = false;
            await this.refresh({ preserveScroll: true });
            return;
        }
        await this.refresh({ preserveScroll: false });
    }

    getViewType(): string {
        return DAILY_NOTE_TIMELINE_VIEW;
    }

    getDisplayText(): string {
        return 'Daily Note Timeline';
    }

    getIcon(): string {
        return 'calendar';
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
        this.buildCalendarToggle();
        this.isCalendarVisible = this.settings.dailyNoteTimelineCalendarDefaultOpen ?? false;
        this.applyCalendarVisibility();

        this.registerEvent(this.app.vault.on('create', file => this.onVaultChange(file)));
        this.registerEvent(this.app.vault.on('modify', file => this.onVaultChange(file)));
        this.registerEvent(this.app.vault.on('delete', file => this.onVaultChange(file)));
        this.registerEvent(this.app.workspace.on('active-leaf-change', leaf => {
            if (leaf === this.leaf && this.pendingRefresh) {
                void this.handleViewActivated();
            }
        }));

        await this.refresh();
    }

    private buildHeader() {
        const headerEl = this.contentEl.createDiv('daily-note-timeline-header');
        headerEl.createEl('div', { cls: 'daily-note-timeline-title' });
        const headerControls = headerEl.createDiv('daily-note-timeline-controls');
        this.filterSelectEl = headerControls.createEl('select', { cls: 'daily-note-timeline-filter' });
        this.filterSelectEl.add(new Option('All', 'all'));
        this.filterSelectEl.add(new Option('Tasks', 'tasks'));
        this.filterSelectEl.add(new Option('Heading', 'heading'));
        this.filterSelectEl.value = this.activeFilter;
        this.filterHeadingInputEl = headerControls.createEl('input', {
            cls: 'daily-note-timeline-filter-heading',
            type: 'text',
            placeholder: '# Time Line'
        });
        this.filterHeadingInputEl.value = this.headingFilterText;
        this.registerDomEvent(this.filterSelectEl, 'change', () => {
            this.activeFilter = (this.filterSelectEl?.value as TimelineFilterMode) ?? 'all';
            this.settings.dailyNoteTimelineDefaultFilter = this.activeFilter;
            this.queueSettingsSave();
            this.updateFilterUi();
            this.filteredContentCache.clear();
            void this.refresh({ preserveScroll: true, alignTop: true });
        });
        this.registerDomEvent(this.filterHeadingInputEl, 'input', () => {
            this.headingFilterText = this.filterHeadingInputEl?.value ?? '';
            this.settings.dailyNoteTimelineFilterHeadingDefault = this.headingFilterText;
            this.queueSettingsSave();
            this.filteredContentCache.clear();
            if (this.activeFilter === 'heading') {
                void this.refresh({ preserveScroll: true, alignTop: true });
            }
        });
        this.updateFilterUi();
        const headerTodayButton = headerControls.createEl('button', {
            text: 'Today',
            cls: 'daily-note-timeline-today'
        });
        this.registerDomEvent(headerTodayButton, 'click', () => this.scrollToToday());
    }

    private buildScroller() {
        this.scrollerEl = this.contentEl.createDiv('daily-note-timeline-scroll');
        this.listEl = this.scrollerEl.createDiv('daily-note-timeline-list');
        this.registerDomEvent(this.scrollerEl, 'scroll', () => this.onScroll());
    }

    private buildCalendar() {
        this.calendarEl = this.contentEl.createDiv('daily-note-timeline-calendar');
        this.calendarEl.addClass('is-hidden');
        const calendarHeader = this.calendarEl.createDiv('daily-note-timeline-calendar-header');
        this.calendarTitleEl = calendarHeader.createDiv('daily-note-timeline-calendar-title');
        const calendarNav = calendarHeader.createDiv('daily-note-timeline-calendar-nav');
        const prevButton = calendarNav.createEl('button', { text: '<', cls: 'daily-note-timeline-calendar-nav-button' });
        const todayButton = calendarNav.createEl('button', { text: 'today', cls: 'daily-note-timeline-calendar-nav-button' });
        const nextButton = calendarNav.createEl('button', { text: '>', cls: 'daily-note-timeline-calendar-nav-button' });
        this.registerDomEvent(prevButton, 'click', () => this.shiftCalendarMonth(-1));
        this.registerDomEvent(todayButton, 'click', () => this.scrollToToday());
        this.registerDomEvent(nextButton, 'click', () => this.shiftCalendarMonth(1));
        this.calendarGridEl = this.calendarEl.createDiv('daily-note-timeline-calendar-grid');
    }

    private buildCalendarToggle() {
        this.toggleButtonEl = this.contentEl.createEl('button', {
            cls: 'daily-note-timeline-calendar-toggle'
        });
        setIcon(this.toggleButtonEl, 'calendar');
        this.registerDomEvent(this.toggleButtonEl, 'click', () => this.toggleCalendar());
    }

    private applyCalendarVisibility() {
        if (!this.calendarEl) {
            return;
        }
        this.calendarEl.toggleClass('is-hidden', !this.isCalendarVisible);
        this.contentEl.toggleClass('daily-note-timeline-calendar-open', this.isCalendarVisible);
    }

    async onClose(): Promise<void> {
        this.contentEl.empty();
    }

    private onVaultChange(file: TFile | any) {
        if (!(file instanceof TFile)) {
            return;
        }
        const dailyNotesFolder = this.settings.dailyNotesFolder || 'DailyNotes';
        if (!file.path.startsWith(`${dailyNotesFolder}/`)) {
            return;
        }
        this.filteredContentCache.clear();
        this.scheduleRefresh({ preserveScroll: true });
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
        if (this.leaf?.isDeferred ?? false) {
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

    private toISODateKey(date: Date): string {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private extractDateFromFileName(fileName: string): Date | null {
        const format = this.settings.dailyNoteDateFormat || 'YYYY-MM-DD';
        const regexPattern = format
            .replace('YYYY', '(\\d{4})')
            .replace('MM', '(\\d{2})')
            .replace('DD', '(\\d{2})');
        const regex = new RegExp(regexPattern);
        const match = fileName.match(regex);
        if (!match) {
            return null;
        }
        const [, year, month, day] = match;
        const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        if (isNaN(date.getTime())) {
            return null;
        }
        return date;
    }

    private getDateKeyFromFile(file: TFile): string | null {
        const date = this.extractDateFromFileName(file.basename);
        return date ? this.toISODateKey(date) : null;
    }

    private getDateFromKey(key: string): Date {
        const [year, month, day] = key.split('-').map(value => parseInt(value, 10));
        return new Date(year, month - 1, day);
    }

    private collectDailyNoteFiles(): TFile[] {
        const folder = this.settings.dailyNotesFolder || 'DailyNotes';
        const files = this.app.vault.getFiles().filter(file => {
            return file.extension === 'md' && file.path.startsWith(`${folder}/`);
        });
        const withDates = files
            .map(file => ({
                file,
                date: this.extractDateFromFileName(file.basename)
            }))
            .filter(entry => entry.date !== null) as Array<{ file: TFile; date: Date }>;

        withDates.sort((a, b) => b.date.getTime() - a.date.getTime());
        return withDates.map(entry => entry.file);
    }

    private async getInitialTargetIndex(): Promise<number> {
        const todayKey = this.toISODateKey(new Date());
        return await this.findNearestIndexWithContent(todayKey);
    }

    private async refresh(options: { preserveScroll?: boolean; alignTop?: boolean } = {}): Promise<void> {
        if (!this.listEl) {
            return;
        }
        const preserveScroll = options.preserveScroll ?? false;
        const alignTop = options.alignTop ?? false;
        const anchorKey = preserveScroll ? this.getTopVisibleDateKey() : null;
        const anchorOffset = preserveScroll && !alignTop ? this.getTopVisibleOffset() : null;
        this.debugLog('refresh:start', { preserveScroll, alignTop, anchorKey, anchorOffset });
        this.filteredContentCache.clear();
        this.noteFiles = this.collectDailyNoteFiles();
        this.listEl.empty();
        this.startIndex = 0;
        this.endIndex = -1;

        if (this.noteFiles.length === 0) {
            this.listEl.createDiv({ text: 'No daily notes found.', cls: 'daily-note-timeline-empty' });
            return;
        }

        if (preserveScroll && anchorKey) {
            const anchorIndex = this.findIndexByDateKey(anchorKey);
            let targetIndex = -1;
            if (anchorIndex !== -1 && await this.hasFilteredContent(this.noteFiles[anchorIndex])) {
                targetIndex = anchorIndex;
            } else {
                const todayKey = this.toISODateKey(new Date());
                const todayIndex = this.findIndexByDateKey(todayKey);
                if (todayIndex !== -1 && await this.hasFilteredContent(this.noteFiles[todayIndex])) {
                    targetIndex = todayIndex;
                } else {
                    targetIndex = await this.findNearestIndexWithContent(anchorKey);
                }
            }
            if (targetIndex !== -1) {
                const start = Math.max(0, targetIndex - this.pageSize);
                const end = Math.min(this.noteFiles.length - 1, targetIndex + this.pageSize);
                await this.renderRange(start, end);
                const offset = alignTop ? this.getListTopOffset() : (anchorOffset ?? 0);
                this.debugLog('refresh:scroll-preserve', { targetIndex, start, end, offset });
                this.scrollToTargetIndex(targetIndex, offset);
                await this.ensureScrollable();
                return;
            }
        }

        const targetIndex = await this.getInitialTargetIndex();
        this.debugLog('refresh:initial-target', { targetIndex, noteCount: this.noteFiles.length });
        if (targetIndex === -1) {
            this.scheduleTopVisibleUpdate();
            return;
        }
        const start = Math.max(0, targetIndex - this.pageSize);
        const end = Math.min(this.noteFiles.length - 1, targetIndex + this.pageSize);
        await this.renderRange(start, end);
        if (targetIndex !== -1) {
            const offset = this.getListTopOffset();
            this.debugLog('refresh:scroll-initial', { targetIndex, start, end, offset });
            this.scrollToTargetIndex(targetIndex, offset);
        } else {
            this.scheduleTopVisibleUpdate();
        }
        await this.ensureScrollable();
    }

    private async renderNote(file: TFile, position: 'append' | 'prepend'): Promise<void> {
        if (!this.listEl) {
            return;
        }
        const filtered = await this.getFilteredContent(file);
        if (filtered === null) {
            return;
        }
        const noteEl = document.createElement('div');
        noteEl.className = 'daily-note-timeline-item';
        const dateKey = this.getDateKeyFromFile(file);
        if (dateKey) {
            noteEl.dataset.date = dateKey;
        }

        const titleRowEl = document.createElement('div');
        titleRowEl.className = 'daily-note-timeline-item-header';

        const titleEl = document.createElement('a');
        titleEl.className = 'daily-note-timeline-item-title';
        titleEl.textContent = file.basename;
        titleEl.href = file.path;
        titleEl.setAttribute('data-href', file.path);
        this.registerDomEvent(titleEl, 'click', async (event: MouseEvent) => {
            event.preventDefault();
            const openInNewLeaf = event.metaKey || event.ctrlKey;
            await this.app.workspace.getLeaf(openInNewLeaf).openFile(file);
        });

        titleRowEl.appendChild(titleEl);

        const bodyEl = document.createElement('div');
        bodyEl.className = 'daily-note-timeline-item-body';

        noteEl.appendChild(titleRowEl);
        noteEl.appendChild(bodyEl);

        if (position === 'prepend') {
            this.listEl.prepend(noteEl);
        } else {
            this.listEl.appendChild(noteEl);
        }

        await MarkdownRenderer.renderMarkdown(filtered, bodyEl, file.path, this);
        await this.attachTaskToggleHandler(bodyEl, file);
        this.attachLinkHandler(bodyEl, file.path);
    }

    private applyFilter(content: string): string | null {
        return filterTimelineContent(content, this.activeFilter, this.headingFilterText.trim());
    }

    private updateFilterUi() {
        if (!this.filterHeadingInputEl) {
            return;
        }
        this.filterHeadingInputEl.toggleClass('is-hidden', this.activeFilter !== 'heading');
    }

    private attachLinkHandler(container: HTMLElement, sourcePath: string) {
        this.registerDomEvent(container, 'click', (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const linkEl = target?.closest('a') as HTMLAnchorElement | null;
            if (!linkEl) {
                return;
            }
            const dataHref = linkEl.getAttribute('data-href');
            const href = dataHref ?? linkEl.getAttribute('href');
            if (!href) {
                return;
            }
            const openInNewLeaf = event.metaKey || event.ctrlKey;

            if (dataHref) {
                event.preventDefault();
                this.app.workspace.openLinkText(dataHref, sourcePath, openInNewLeaf);
                return;
            }

            if (/^(https?:|mailto:|file:)/.test(href)) {
                event.preventDefault();
                window.open(href, '_blank');
                return;
            }

            event.preventDefault();
            this.app.workspace.openLinkText(href, sourcePath, openInNewLeaf);
        });
    }

    private getTaskLineIndicesForFilter(content: string): number[] {
        const lines = content.split('\n');
        if (this.activeFilter === 'heading') {
            const range = findHeadingSectionRange(lines, this.headingFilterText.trim());
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
                if (this.activeFilter === 'tasks' || this.activeFilter === 'all') {
                    indices.push(i);
                }
            }
        }
        return indices;
    }

    private async attachTaskToggleHandler(container: HTMLElement, file: TFile): Promise<void> {
        const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
        if (checkboxes.length === 0) {
            return;
        }

        const content = await this.app.vault.cachedRead(file);
        const taskLineIndices = this.getTaskLineIndicesForFilter(content);
        const mappedCount = Math.min(taskLineIndices.length, checkboxes.length);
        for (let i = 0; i < mappedCount; i += 1) {
            checkboxes[i].dataset.crystalTaskLine = String(taskLineIndices[i]);
        }

        this.registerDomEvent(container, 'change', async (event: Event) => {
            const target = event.target as HTMLInputElement | null;
            if (!target || target.type !== 'checkbox') {
                return;
            }
            const lineAttr = target.dataset.crystalTaskLine ?? target.closest('[data-line]')?.getAttribute('data-line');
            const lineIndex = lineAttr !== null && lineAttr !== undefined ? Number(lineAttr) : Number.NaN;
            if (!Number.isFinite(lineIndex)) {
                return;
            }
            await this.updateTaskLine(file, lineIndex, target.checked);
        });
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
        if (!this.listEl) {
            return;
        }
        this.debugLog('scrollToToday:start');
        this.noteFiles = this.collectDailyNoteFiles();
        this.listEl.empty();
        this.startIndex = 0;
        this.endIndex = -1;

        if (this.noteFiles.length === 0) {
            this.listEl.createDiv({ text: 'No daily notes found.', cls: 'daily-note-timeline-empty' });
            return;
        }

        const targetIndex = await this.getInitialTargetIndex();
        if (targetIndex === -1) {
            return;
        }

        const start = Math.max(0, targetIndex - this.pageSize);
        const end = Math.min(this.noteFiles.length - 1, targetIndex + this.pageSize);
        await this.renderRange(start, end);
        const offset = this.getListTopOffset();
        this.debugLog('scrollToToday:scroll', { targetIndex, start, end, offset });
        this.scrollToTargetIndex(targetIndex, offset);
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

    private async ensureScrollable() {
        if (!this.scrollerEl || this.isLoading || this.noteFiles.length === 0) {
            return;
        }
        let guard = 0;
        while (this.scrollerEl.scrollHeight <= this.scrollerEl.clientHeight + 32) {
            if (this.startIndex === 0 && this.endIndex >= this.noteFiles.length - 1) {
                break;
            }
            if (this.endIndex < this.noteFiles.length - 1) {
                await this.loadNext();
            } else if (this.startIndex > 0) {
                await this.loadPrevious();
            } else {
                break;
            }
            guard += 1;
            if (guard >= 10) {
                break;
            }
        }
        this.scheduleTopVisibleUpdate();
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
            this.scrollElementToOffset(targetEl, offset);
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
            if (!this.scrollerEl) {
                return;
            }
            this.scrollElementToOffset(targetEl, offset);
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

    private scrollElementToOffset(targetEl: HTMLElement, offset: number) {
        if (!this.scrollerEl) {
            return;
        }
        const scrollerRect = this.scrollerEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const delta = targetRect.top - scrollerRect.top - offset;
        this.debugLog('scrollElementToOffset', {
            offset,
            delta,
            scrollerTop: scrollerRect.top,
            scrollerHeight: scrollerRect.height,
            targetTop: targetRect.top,
            targetHeight: targetRect.height
        });
        if (delta !== 0) {
            this.scrollerEl.scrollTop += delta;
        }
    }

    private getListTopOffset(): number {
        if (!this.scrollerEl || !this.listEl) {
            return 0;
        }
        const listRect = this.listEl.getBoundingClientRect();
        const scrollerRect = this.scrollerEl.getBoundingClientRect();
        const offset = listRect.top - scrollerRect.top;
        return Number.isFinite(offset) ? Math.max(0, offset) : 0;
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
        let newStart = this.startIndex;
        let renderedCount = 0;
        const targetCount = this.pageSize;
        const anchor = this.listEl.firstElementChild as HTMLElement | null;
        const anchorOffset = this.getAnchorOffset(anchor);

        for (let i = this.startIndex - 1; i >= 0 && renderedCount < targetCount; i -= 1) {
            newStart = i;
            if (!await this.hasFilteredContent(this.noteFiles[i])) {
                continue;
            }
            await this.renderNote(this.noteFiles[i], 'prepend');
            renderedCount += 1;
        }

        this.startIndex = newStart;
        this.trimRendered('bottom');
        this.restoreAnchorOffset(anchor, anchorOffset);
        this.isLoading = false;
    }

    private async loadNext(): Promise<void> {
        if (!this.listEl || this.endIndex >= this.noteFiles.length - 1 || this.isLoading) {
            return;
        }
        this.isLoading = true;
        let newEnd = this.endIndex;
        let renderedCount = 0;
        const targetCount = this.pageSize;

        for (let i = this.endIndex + 1; i < this.noteFiles.length && renderedCount < targetCount; i += 1) {
            newEnd = i;
            if (!await this.hasFilteredContent(this.noteFiles[i])) {
                continue;
            }
            await this.renderNote(this.noteFiles[i], 'append');
            renderedCount += 1;
        }

        this.endIndex = newEnd;
        this.trimRendered('top');
        this.isLoading = false;
    }

    private trimRendered(direction: 'top' | 'bottom') {
        if (!this.listEl) {
            return;
        }
        const currentCount = this.listEl.children.length;
        if (currentCount <= this.maxRendered) {
            return;
        }
        const removeCount = currentCount - this.maxRendered;
        if (removeCount <= 0) {
            return;
        }

        if (direction === 'top') {
            const anchor = this.listEl.children[removeCount] as HTMLElement | undefined;
            const anchorOffset = this.getAnchorOffset(anchor);
            for (let i = 0; i < removeCount; i += 1) {
                this.listEl.firstElementChild?.remove();
            }
            this.startIndex = Math.min(this.startIndex + removeCount, this.endIndex + 1);
            this.restoreAnchorOffset(anchor, anchorOffset);
            return;
        }

        for (let i = 0; i < removeCount; i += 1) {
            this.listEl.lastElementChild?.remove();
        }
        this.endIndex = Math.max(this.startIndex - 1, this.endIndex - removeCount);
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

    private getTopVisibleElement(): { element: HTMLElement; rect: DOMRect; scrollTop: number } | null {
        if (!this.scrollerEl || !this.listEl) {
            return null;
        }
        const scrollRect = this.scrollerEl.getBoundingClientRect();
        for (const child of Array.from(this.listEl.children)) {
            const element = child as HTMLElement;
            const rect = element.getBoundingClientRect();
            if (rect.bottom > scrollRect.top + 1) {
                return { element, rect, scrollTop: scrollRect.top };
            }
        }
        return null;
    }

    private getTopVisibleDateKey(): string | null {
        const top = this.getTopVisibleElement();
        if (!top) {
            return null;
        }
        return top.element.dataset.date ?? null;
    }

    private getTopVisibleOffset(): number | null {
        const top = this.getTopVisibleElement();
        if (!top) {
            return null;
        }
        return top.rect.top - top.scrollTop;
    }

    private updateTopVisibleDate() {
        let topDateKey: string | null = null;
        const top = this.getTopVisibleElement();
        if (top) {
            topDateKey = top.element.dataset.date ?? null;
        }
        if (!topDateKey) {
            topDateKey = this.toISODateKey(new Date());
        }

        if (topDateKey === this.currentTopDateKey) {
            return;
        }
        this.currentTopDateKey = topDateKey;
        this.updateCalendarForDate(topDateKey);
    }

    private updateCalendarForDate(dateKey: string) {
        const date = this.getDateFromKey(dateKey);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthKey !== this.currentMonthKey) {
            this.currentMonthKey = monthKey;
            this.currentMonthDate = new Date(date.getFullYear(), date.getMonth(), 1);
            this.renderCalendar(this.currentMonthDate, dateKey);
            return;
        }
        this.updateCalendarHighlight(dateKey);
    }

    private renderCalendar(baseDate: Date, activeKey: string) {
        if (!this.calendarEl || !this.calendarGridEl) {
            return;
        }
        if (this.calendarTitleEl) {
            const monthLabel = `${baseDate.getFullYear()}-${(baseDate.getMonth() + 1).toString().padStart(2, '0')}`;
            this.calendarTitleEl.textContent = monthLabel;
        }

        this.calendarGridEl.empty();
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (const [index, dayName] of weekdays.entries()) {
            const dayEl = this.calendarGridEl.createDiv('daily-note-timeline-calendar-weekday');
            dayEl.textContent = dayName;
            if (index === 0) {
                dayEl.addClass('is-sun');
            } else if (index === 6) {
                dayEl.addClass('is-sat');
            }
        }

        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startWeekday = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < startWeekday; i += 1) {
            this.calendarGridEl.createDiv('daily-note-timeline-calendar-empty');
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            const date = new Date(year, month, day);
            const key = this.toISODateKey(date);
            const dayEl = this.calendarGridEl.createDiv('daily-note-timeline-calendar-day');
            dayEl.textContent = day.toString();
            dayEl.dataset.date = key;
            if (key === activeKey) {
                dayEl.addClass('is-active');
            }
            this.registerDomEvent(dayEl, 'click', () => this.jumpToDateKey(key));
        }

        const usedCells = startWeekday + daysInMonth;
        const trailingCells = (7 - (usedCells % 7)) % 7;
        const totalCells = usedCells + trailingCells;
        const remainingToSixRows = Math.max(0, 42 - totalCells);
        for (let i = 0; i < trailingCells + remainingToSixRows; i += 1) {
            this.calendarGridEl.createDiv('daily-note-timeline-calendar-empty');
        }
    }

    private updateCalendarHighlight(activeKey: string) {
        if (!this.calendarGridEl) {
            return;
        }
        const activeEl = this.calendarGridEl.querySelector('.daily-note-timeline-calendar-day.is-active');
        if (activeEl) {
            activeEl.classList.remove('is-active');
        }
        const targetEl = this.calendarGridEl.querySelector(`[data-date="${activeKey}"]`);
        if (targetEl) {
            targetEl.classList.add('is-active');
        }
    }

    private toggleCalendar() {
        if (!this.calendarEl) {
            return;
        }
        this.isCalendarVisible = !this.isCalendarVisible;
        this.settings.dailyNoteTimelineCalendarDefaultOpen = this.isCalendarVisible;
        this.queueSettingsSave();
        this.applyCalendarVisibility();
        if (this.currentTopDateKey) {
            this.updateCalendarForDate(this.currentTopDateKey);
        } else {
            const todayKey = this.toISODateKey(new Date());
            this.updateCalendarForDate(todayKey);
        }
    }

    private shiftCalendarMonth(offset: number) {
        const base = this.currentMonthDate ?? new Date();
        const next = new Date(base.getFullYear(), base.getMonth() + offset, 1);
        this.currentMonthDate = next;
        this.currentMonthKey = `${next.getFullYear()}-${(next.getMonth() + 1).toString().padStart(2, '0')}`;
        const activeKey = this.currentTopDateKey ?? this.toISODateKey(new Date());
        this.renderCalendar(next, activeKey);
    }

    private async jumpToDateKey(dateKey: string) {
        this.noteFiles = this.noteFiles.length > 0 ? this.noteFiles : this.collectDailyNoteFiles();
        if (this.noteFiles.length === 0) {
            return;
        }
        const targetIndex = await this.findNearestIndexWithContent(dateKey);
        if (targetIndex === -1) {
            return;
        }
        const start = Math.max(0, targetIndex - this.pageSize);
        const end = Math.min(this.noteFiles.length - 1, targetIndex + this.pageSize);
        await this.renderRange(start, end);
        const offset = this.getListTopOffset();
        this.scrollToTargetIndex(targetIndex, offset);
    }

    private findIndexByDateKey(dateKey: string): number {
        return this.noteFiles.findIndex(file => this.getDateKeyFromFile(file) === dateKey);
    }

    private async findNearestIndexWithContent(dateKey: string): Promise<number> {
        if (this.noteFiles.length === 0) {
            return -1;
        }
        const targetDate = this.getDateFromKey(dateKey);
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
            const fileDate = this.getDateFromKey(fileDateKey);
            const diff = Math.abs(fileDate.getTime() - targetDate.getTime());
            if (diff < bestDiff) {
                bestDiff = diff;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    private async hasFilteredContent(file: TFile): Promise<boolean> {
        return await this.getFilteredContent(file) !== null;
    }

    private async getFilteredContent(file: TFile): Promise<string | null> {
        const cached = this.filteredContentCache.get(file.path);
        if (cached !== undefined) {
            return cached;
        }
        const content = await this.app.vault.cachedRead(file);
        const filtered = this.applyFilter(content);
        this.filteredContentCache.set(file.path, filtered);
        return filtered;
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

    private getAnchorOffset(anchor: HTMLElement | null | undefined): number | null {
        if (!anchor || !this.scrollerEl) {
            return null;
        }
        const anchorRect = anchor.getBoundingClientRect();
        const scrollRect = this.scrollerEl.getBoundingClientRect();
        return anchorRect.top - scrollRect.top;
    }

    private restoreAnchorOffset(anchor: HTMLElement | null | undefined, previousOffset: number | null) {
        if (!anchor || previousOffset === null || !this.scrollerEl) {
            return;
        }
        const anchorRect = anchor.getBoundingClientRect();
        const scrollRect = this.scrollerEl.getBoundingClientRect();
        const currentOffset = anchorRect.top - scrollRect.top;
        const delta = currentOffset - previousOffset;
        if (delta !== 0) {
            this.scrollerEl.scrollTop += delta;
        }
    }

    private debugLog(message: string, details?: Record<string, unknown>) {
        if (!(window as any)?.[this.debugFlag]) {
            return;
        }
        if (details && Object.keys(details).length > 0) {
            console.log('[crystal.timeline]', message, details);
            return;
        }
        console.log('[crystal.timeline]', message);
    }
}
