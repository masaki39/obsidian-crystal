import { MarkdownRenderer, TFile } from 'obsidian';
import { CrystalPluginSettings } from '../../settings';
import { getDateKeyFromFile } from '../data';
import { createNoteElements } from './render';
import { attachTimelineLinkHandler } from './links';
import { attachTaskToggleHandler } from './tasks';
import { TimelineFilterMode } from '../filters';

type RenderNoteOptions = {
    listEl: HTMLDivElement;
    file: TFile;
    position: 'append' | 'prepend';
    settings: CrystalPluginSettings;
    registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    onOpenFile: (file: TFile, openInNewLeaf: boolean) => void;
    onOpenLink: (href: string, sourcePath: string, openInNewLeaf: boolean, isExternal: boolean) => void;
    onToggleTask: (file: TFile, lineIndex: number, checked: boolean) => Promise<void>;
    activeFilter: TimelineFilterMode;
    headingFilterText: string;
    markdownComponent: any;
    resolveFilteredContent: (file: TFile) => Promise<string | null>;
    resolveLinkSourcePath: (file: TFile) => string;
};

export async function renderNote(options: RenderNoteOptions): Promise<void> {
    const filtered = await options.resolveFilteredContent(options.file);
    if (filtered === null) {
        return;
    }
    const { noteEl, bodyEl } = createNoteElements({
        file: options.file,
        registerDomEvent: options.registerDomEvent,
        onOpenFile: options.onOpenFile
    });
    const dateKey = getDateKeyFromFile(options.file, options.settings);
    if (dateKey) {
        noteEl.dataset.date = dateKey;
    }

    if (options.position === 'prepend') {
        options.listEl.prepend(noteEl);
    } else {
        options.listEl.appendChild(noteEl);
    }

    await MarkdownRenderer.renderMarkdown(filtered, bodyEl, options.file.path, options.markdownComponent);
    await attachTaskToggleHandler({
        app: options.markdownComponent.app,
        container: bodyEl,
        file: options.file,
        registerDomEvent: options.registerDomEvent,
        activeFilter: options.activeFilter,
        headingFilterText: options.headingFilterText,
        onToggleTask: options.onToggleTask
    });
    attachTimelineLinkHandler(
        options.registerDomEvent,
        bodyEl,
        options.resolveLinkSourcePath(options.file),
        options.onOpenLink
    );
}
