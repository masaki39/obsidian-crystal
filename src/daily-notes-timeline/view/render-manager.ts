import { App, MarkdownRenderChild, TFile } from 'obsidian';
import { filterTimelineContent, TimelineFilterMode } from '../filters';
import { renderNote } from './render-range';

type RenderManagerOptions = {
    app: App;
    markdownComponent: any;
    registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    onOpenFile: (file: TFile, openInNewLeaf: boolean) => void;
    onOpenLink: (href: string, sourcePath: string, openInNewLeaf: boolean, isExternal: boolean) => void;
    onToggleTask: (file: TFile, lineIndex: number, checked: boolean) => Promise<void>;
    resolveLinkSourcePath: (file: TFile) => string;
    resolveDateKey: (file: TFile) => string | null;
    getActiveFilter: () => TimelineFilterMode;
    getHeadingFilterText: () => string;
    getSearchQuery: () => string;
};

export class TimelineRenderManager {
    private app: App;
    private markdownComponent: any;
    private registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    private onOpenFile: (file: TFile, openInNewLeaf: boolean) => void;
    private onOpenLink: (href: string, sourcePath: string, openInNewLeaf: boolean, isExternal: boolean) => void;
    private onToggleTask: (file: TFile, lineIndex: number, checked: boolean) => Promise<void>;
    private resolveLinkSourcePath: (file: TFile) => string;
    private resolveDateKey: (file: TFile) => string | null;
    private getActiveFilter: () => TimelineFilterMode;
    private getHeadingFilterText: () => string;
    private getSearchQuery: () => string;
    private filteredContentCache = new Map<string, string | null>();
    private searchMatchCache = new Map<string, boolean>();
    private searchMatchCacheKey: string | null = null;
    private renderedChildren = new Map<HTMLElement, MarkdownRenderChild>();

    constructor(options: RenderManagerOptions) {
        this.app = options.app;
        this.markdownComponent = options.markdownComponent;
        this.registerDomEvent = options.registerDomEvent;
        this.onOpenFile = options.onOpenFile;
        this.onOpenLink = options.onOpenLink;
        this.onToggleTask = options.onToggleTask;
        this.resolveLinkSourcePath = options.resolveLinkSourcePath;
        this.resolveDateKey = options.resolveDateKey;
        this.getActiveFilter = options.getActiveFilter;
        this.getHeadingFilterText = options.getHeadingFilterText;
        this.getSearchQuery = options.getSearchQuery;
    }

    clearFilteredContentCache() {
        this.filteredContentCache.clear();
        this.searchMatchCache.clear();
        this.searchMatchCacheKey = null;
    }

    invalidateFile(path: string) {
        this.filteredContentCache.delete(path);
        this.searchMatchCache.delete(path);
    }

    clearRenderedNotes() {
        for (const child of this.renderedChildren.values()) {
            this.markdownComponent?.removeChild(child);
        }
        this.renderedChildren.clear();
    }

    cleanupRenderedNote(noteEl: HTMLElement) {
        const child = this.renderedChildren.get(noteEl);
        if (!child) {
            return;
        }
        this.renderedChildren.delete(noteEl);
        this.markdownComponent?.removeChild(child);
    }

    async renderNote(listEl: HTMLDivElement, file: TFile, position: 'append' | 'prepend', noteIndex: number): Promise<void> {
        const result = await renderNote({
            listEl,
            file,
            noteIndex,
            position,
            registerDomEvent: this.registerDomEvent,
            onOpenFile: this.onOpenFile,
            onOpenLink: this.onOpenLink,
            onToggleTask: this.onToggleTask,
            activeFilter: this.getActiveFilter(),
            headingFilterText: this.getHeadingFilterText(),
            searchQuery: this.getSearchQuery(),
            markdownComponent: this.markdownComponent,
            resolveFilteredContent: (targetFile) => this.getFilteredContent(targetFile),
            resolveLinkSourcePath: (targetFile) => this.resolveLinkSourcePath(targetFile),
            resolveDateKey: (targetFile) => this.resolveDateKey(targetFile)
        });
        if (!result) {
            return;
        }
        this.renderedChildren.set(result.noteEl, result.renderChild);
    }

    async hasFilteredContent(file: TFile): Promise<boolean> {
        const searchKey = this.getSearchCacheKey();
        if (this.searchMatchCacheKey !== searchKey) {
            this.searchMatchCacheKey = searchKey;
            this.searchMatchCache.clear();
        }
        if (this.searchMatchCache.has(file.path)) {
            return this.searchMatchCache.get(file.path) ?? false;
        }
        const content = await this.getFilteredContent(file);
        const matches = content !== null;
        this.searchMatchCache.set(file.path, matches);
        return matches;
    }

    private applyFilter(content: string): string | null {
        return filterTimelineContent(content, this.getActiveFilter(), this.getHeadingFilterText().trim());
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
        const terms = this.getSearchQuery()
            .trim()
            .split(/\s+/)
            .filter(term => term.length > 0);
        if (terms.length === 0) {
            return content;
        }
        const haystack = content.toLowerCase();
        const matchesAll = terms.every(term => haystack.includes(term.toLowerCase()));
        return matchesAll ? content : null;
    }

    private getSearchCacheKey(): string {
        const heading = this.getHeadingFilterText().trim();
        const query = this.getSearchQuery().trim().toLowerCase();
        return `${this.getActiveFilter()}::${heading}::${query}`;
    }
}
