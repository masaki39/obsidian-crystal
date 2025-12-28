import { ItemView, MarkdownRenderer, TFile, WorkspaceLeaf } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export const DAILY_NOTE_TIMELINE_VIEW = 'daily-note-timeline-view';

export class DailyNoteTimelineView extends ItemView {
    private settings: CrystalPluginSettings;
    private scrollerEl: HTMLDivElement | null = null;
    private listEl: HTMLDivElement | null = null;
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
    private readonly maxRendered = 30;

    constructor(leaf: WorkspaceLeaf, settings: CrystalPluginSettings) {
        super(leaf);
        this.settings = settings;
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
        this.scheduleRefresh();
    }

    async onOpen(): Promise<void> {
        this.contentEl.empty();
        this.contentEl.addClass('daily-note-timeline-root');

        const headerEl = this.contentEl.createDiv('daily-note-timeline-header');
        headerEl.createEl('div', { text: 'Daily Note Timeline', cls: 'daily-note-timeline-title' });

        this.scrollerEl = this.contentEl.createDiv('daily-note-timeline-scroll');
        this.listEl = this.scrollerEl.createDiv('daily-note-timeline-list');
        this.registerDomEvent(this.scrollerEl, 'scroll', () => this.onScroll());

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

        this.toggleButtonEl = this.contentEl.createEl('button', {
            cls: 'daily-note-timeline-calendar-toggle',
            text: 'Calendar'
        });
        this.registerDomEvent(this.toggleButtonEl, 'click', () => this.toggleCalendar());

        this.registerEvent(this.app.vault.on('create', file => this.onVaultChange(file)));
        this.registerEvent(this.app.vault.on('modify', file => this.onVaultChange(file)));
        this.registerEvent(this.app.vault.on('delete', file => this.onVaultChange(file)));

        await this.refresh();
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
        this.scheduleRefresh();
    }

    private scheduleRefresh() {
        if (this.refreshTimer !== null) {
            window.clearTimeout(this.refreshTimer);
        }
        this.refreshTimer = window.setTimeout(() => {
            this.refreshTimer = null;
            void this.refresh();
        }, 200);
    }

    private formatDate(date: Date): string {
        const format = this.settings.dailyNoteDateFormat || 'YYYY-MM-DD';
        return format
            .replace('YYYY', date.getFullYear().toString())
            .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
            .replace('DD', date.getDate().toString().padStart(2, '0'));
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

    private getInitialRange(files: TFile[]): { start: number; end: number; targetIndex: number } {
        if (files.length === 0) {
            return { start: 0, end: -1, targetIndex: -1 };
        }
        const activeFile = this.app.workspace.getActiveFile();
        let targetIndex = files.length - 1;

        if (activeFile) {
            const formatted = this.formatDate(new Date());
            const activeIndex = files.findIndex(file => file.basename === activeFile.basename);
            if (activeIndex !== -1) {
                targetIndex = activeIndex;
            } else {
                const todayIndex = files.findIndex(file => file.basename === formatted);
                if (todayIndex !== -1) {
                    targetIndex = todayIndex;
                }
            }
        }

        const start = Math.max(0, targetIndex - this.pageSize);
        const end = Math.min(files.length - 1, targetIndex + this.pageSize);
        return { start, end, targetIndex };
    }

    private async refresh(): Promise<void> {
        if (!this.listEl) {
            return;
        }
        this.noteFiles = this.collectDailyNoteFiles();
        this.listEl.empty();
        this.startIndex = 0;
        this.endIndex = -1;

        if (this.noteFiles.length === 0) {
            this.listEl.createDiv({ text: 'No daily notes found.', cls: 'daily-note-timeline-empty' });
            return;
        }

        const { start, end, targetIndex } = this.getInitialRange(this.noteFiles);
        await this.renderRange(start, end);
        if (targetIndex !== -1) {
            this.scrollToIndex(targetIndex);
        } else {
            this.scheduleTopVisibleUpdate();
        }
    }

    private async renderNote(file: TFile, position: 'append' | 'prepend'): Promise<void> {
        if (!this.listEl) {
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

        const titleEl = document.createElement('div');
        titleEl.className = 'daily-note-timeline-item-title';
        titleEl.textContent = file.basename;

        const openButton = document.createElement('button');
        openButton.className = 'daily-note-timeline-item-open';
        openButton.textContent = 'Open';
        this.registerDomEvent(openButton, 'click', async () => {
            await this.app.workspace.getLeaf().openFile(file);
        });

        titleRowEl.appendChild(titleEl);
        titleRowEl.appendChild(openButton);

        const bodyEl = document.createElement('div');
        bodyEl.className = 'daily-note-timeline-item-body';

        noteEl.appendChild(titleRowEl);
        noteEl.appendChild(bodyEl);

        if (position === 'prepend') {
            this.listEl.prepend(noteEl);
        } else {
            this.listEl.appendChild(noteEl);
        }

        const content = await this.app.vault.cachedRead(file);
        await MarkdownRenderer.renderMarkdown(content, bodyEl, file.path, this);
        this.attachLinkHandler(bodyEl, file.path);
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

    private async scrollToToday(): Promise<void> {
        if (!this.listEl) {
            return;
        }
        this.noteFiles = this.collectDailyNoteFiles();
        this.listEl.empty();
        this.startIndex = 0;
        this.endIndex = -1;

        if (this.noteFiles.length === 0) {
            this.listEl.createDiv({ text: 'No daily notes found.', cls: 'daily-note-timeline-empty' });
            return;
        }

        const todayName = this.formatDate(new Date());
        let targetIndex = this.noteFiles.findIndex(file => file.basename === todayName);
        if (targetIndex === -1) {
            targetIndex = 0;
        }

        const start = Math.max(0, targetIndex - this.pageSize);
        const end = Math.min(this.noteFiles.length - 1, targetIndex + this.pageSize);
        await this.renderRange(start, end);
        this.scrollToIndex(targetIndex);
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

    private scrollToIndex(targetIndex: number) {
        if (!this.scrollerEl || !this.listEl) {
            return;
        }
        const relativeIndex = targetIndex - this.startIndex;
        const targetEl = this.listEl.children[relativeIndex] as HTMLElement | undefined;
        if (!targetEl) {
            return;
        }
        requestAnimationFrame(() => {
            if (!this.scrollerEl) {
                return;
            }
            const headerEl = this.contentEl.querySelector('.daily-note-timeline-header') as HTMLElement | null;
            const headerOffset = headerEl ? headerEl.offsetHeight : 0;
            this.scrollerEl.scrollTop = Math.max(0, targetEl.offsetTop - headerOffset);
            this.scheduleTopVisibleUpdate();
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
        const newStart = Math.max(0, this.startIndex - this.pageSize);
        const anchor = this.listEl.firstElementChild as HTMLElement | null;
        const anchorOffset = this.getAnchorOffset(anchor);

        for (let i = this.startIndex - 1; i >= newStart; i -= 1) {
            await this.renderNote(this.noteFiles[i], 'prepend');
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
        const newEnd = Math.min(this.noteFiles.length - 1, this.endIndex + this.pageSize);

        for (let i = this.endIndex + 1; i <= newEnd; i += 1) {
            await this.renderNote(this.noteFiles[i], 'append');
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

    private updateTopVisibleDate() {
        if (!this.scrollerEl || !this.listEl) {
            return;
        }
        const scrollRect = this.scrollerEl.getBoundingClientRect();
        let topDateKey: string | null = null;
        for (const child of Array.from(this.listEl.children)) {
            const element = child as HTMLElement;
            const rect = element.getBoundingClientRect();
            if (rect.bottom > scrollRect.top + 1) {
                topDateKey = element.dataset.date ?? null;
                break;
            }
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
        for (const dayName of weekdays) {
            const dayEl = this.calendarGridEl.createDiv('daily-note-timeline-calendar-weekday');
            dayEl.textContent = dayName;
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
        this.calendarEl.toggleClass('is-hidden', !this.isCalendarVisible);
        this.contentEl.toggleClass('daily-note-timeline-calendar-open', this.isCalendarVisible);
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
        const targetIndex = this.findNearestIndex(dateKey);
        if (targetIndex === -1) {
            return;
        }
        const start = Math.max(0, targetIndex - this.pageSize);
        const end = Math.min(this.noteFiles.length - 1, targetIndex + this.pageSize);
        await this.renderRange(start, end);
        this.scrollToIndex(targetIndex);
    }

    private findNearestIndex(dateKey: string): number {
        const targetDate = this.getDateFromKey(dateKey);
        let bestIndex = -1;
        let bestDiff = Number.POSITIVE_INFINITY;
        for (let i = 0; i < this.noteFiles.length; i += 1) {
            const fileDateKey = this.getDateKeyFromFile(this.noteFiles[i]);
            if (!fileDateKey) {
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
}
