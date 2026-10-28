import { App, MarkdownView, Plugin, TFile } from 'obsidian';
import { getDateFromFile } from 'obsidian-daily-notes-interface';
import type { CrystalPluginSettings } from './settings';

export const WEEKDAY_ATTR = 'data-crystal-weekday';

/** Minimal shape of the moment returned by `getDateFromFile`. */
interface Formattable {
    format(format: string): string;
}

/**
 * Label shown after a daily note's inline title, or null when nothing
 * should be shown (feature off, or the file is not a daily note).
 */
export function weekdayLabel(date: Formattable | null, settings: CrystalPluginSettings): string | null {
    if (!settings.dailyNoteShowWeekday || !date) {
        return null;
    }
    const label = date.format(settings.dailyNoteWeekdayFormat || 'dddd').trim();
    return label.length > 0 ? label : null;
}

/**
 * Shows the day of the week after the inline title of daily notes.
 * The label is set as a data attribute on `.inline-title` and rendered by
 * CSS (`::after`), so the title text itself is never modified.
 */
export class DailyNoteWeekday {
    private app: App;
    private plugin: Plugin;
    private settings: CrystalPluginSettings;

    constructor(app: App, plugin: Plugin, settings: CrystalPluginSettings) {
        this.app = app;
        this.plugin = plugin;
        this.settings = settings;
    }

    onload() {
        const refresh = () => this.refresh();
        this.app.workspace.onLayoutReady(refresh);
        this.plugin.registerEvent(this.app.workspace.on('file-open', refresh));
        this.plugin.registerEvent(this.app.workspace.on('layout-change', refresh));
        this.plugin.registerEvent(this.app.vault.on('rename', refresh));
        this.plugin.register(() => this.clear());
    }

    updateSettings(settings: CrystalPluginSettings) {
        this.settings = settings;
        this.refresh();
    }

    private refresh() {
        for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
            const view = leaf.view;
            if (!(view instanceof MarkdownView)) {
                continue;
            }
            const label = this.labelFor(view.file);
            view.containerEl.querySelectorAll<HTMLElement>('.inline-title').forEach(el => {
                if (label) {
                    el.setAttribute(WEEKDAY_ATTR, label);
                } else {
                    el.removeAttribute(WEEKDAY_ATTR);
                }
            });
        }
    }

    private labelFor(file: TFile | null): string | null {
        if (!file || !this.settings.dailyNoteShowWeekday) {
            return null;
        }
        try {
            return weekdayLabel(getDateFromFile(file, 'day'), this.settings);
        } catch (error) {
            return null;
        }
    }

    private clear() {
        document.querySelectorAll(`.inline-title[${WEEKDAY_ATTR}]`).forEach(el => el.removeAttribute(WEEKDAY_ATTR));
    }
}
