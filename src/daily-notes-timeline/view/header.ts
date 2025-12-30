import { TimelineFilterMode } from '../filters/filter';

type HeaderOptions = {
    contentEl: HTMLElement;
    registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    activeFilter: TimelineFilterMode;
    headingFilterText: string;
    searchQuery: string;
    onFilterChange: (mode: TimelineFilterMode) => void;
    onHeadingInput: (value: string) => void;
    onSearchInput: (value: string) => void;
    onToday: () => void;
};

export type HeaderElements = {
    filterSelectEl: HTMLSelectElement;
    filterHeadingInputEl: HTMLInputElement;
    searchInputEl: HTMLInputElement;
};

export function buildTimelineHeader(options: HeaderOptions): HeaderElements {
    const headerEl = options.contentEl.createDiv('daily-note-timeline-header');
    headerEl.createEl('div', { cls: 'daily-note-timeline-title' });
    const headerControls = headerEl.createDiv('daily-note-timeline-controls');
    const filterSelectEl = headerControls.createEl('select', { cls: 'daily-note-timeline-filter' });
    filterSelectEl.add(new Option('All', 'all'));
    filterSelectEl.add(new Option('Tasks', 'tasks'));
    filterSelectEl.add(new Option('Heading', 'heading'));
    filterSelectEl.value = options.activeFilter;
    const filterHeadingInputEl = headerControls.createEl('input', {
        cls: 'daily-note-timeline-filter-heading',
        type: 'text',
        placeholder: '# Time Line'
    });
    filterHeadingInputEl.value = options.headingFilterText;
    const searchInputEl = headerControls.createEl('input', {
        cls: 'daily-note-timeline-search',
        type: 'text',
        placeholder: 'Search'
    });
    searchInputEl.value = options.searchQuery;

    options.registerDomEvent(filterSelectEl, 'change', () => {
        options.onFilterChange((filterSelectEl.value as TimelineFilterMode) ?? 'all');
    });
    options.registerDomEvent(filterHeadingInputEl, 'input', () => {
        options.onHeadingInput(filterHeadingInputEl.value ?? '');
    });
    options.registerDomEvent(searchInputEl, 'input', () => {
        options.onSearchInput(searchInputEl.value ?? '');
    });

    const headerTodayButton = headerControls.createEl('button', {
        text: 'Today',
        cls: 'daily-note-timeline-today'
    });
    options.registerDomEvent(headerTodayButton, 'click', () => options.onToday());

    return { filterSelectEl, filterHeadingInputEl, searchInputEl };
}
