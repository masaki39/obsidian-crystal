import { TFile } from 'obsidian';

type NoteElementOptions = {
    file: TFile;
    registerDomEvent: (el: HTMLElement, type: string, callback: (event: Event) => any) => void;
    onOpenFile: (file: TFile, openInNewLeaf: boolean) => void;
};

export type NoteElements = {
    noteEl: HTMLDivElement;
    bodyEl: HTMLDivElement;
};

export function createNoteElements(options: NoteElementOptions): NoteElements {
    const noteEl = document.createElement('div');
    noteEl.className = 'daily-note-timeline-item';
    noteEl.dataset.path = options.file.path;

    const titleRowEl = document.createElement('div');
    titleRowEl.className = 'daily-note-timeline-item-header';

    const titleEl = document.createElement('a');
    titleEl.className = 'daily-note-timeline-item-title';
    titleEl.textContent = options.file.basename;
    titleEl.href = options.file.path;
    titleEl.setAttribute('data-href', options.file.path);
    options.registerDomEvent(titleEl, 'click', async (event: MouseEvent) => {
        event.preventDefault();
        const openInNewLeaf = event.metaKey || event.ctrlKey;
        options.onOpenFile(options.file, openInNewLeaf);
    });

    titleRowEl.appendChild(titleEl);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'daily-note-timeline-item-body';

    noteEl.appendChild(titleRowEl);
    noteEl.appendChild(bodyEl);

    return { noteEl, bodyEl };
}
