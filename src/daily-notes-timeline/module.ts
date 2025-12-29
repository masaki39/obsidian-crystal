import { Plugin } from 'obsidian';
import { CrystalPluginSettings } from '../settings';
import { DAILY_NOTES_TIMELINE_VIEW, DailyNotesTimelineView } from './view';

export class DailyNotesTimelineModule {
    private plugin: Plugin;
    private settings: CrystalPluginSettings;
    private onSettingsChange: () => Promise<void>;

    constructor(plugin: Plugin, settings: CrystalPluginSettings, onSettingsChange: () => Promise<void>) {
        this.plugin = plugin;
        this.settings = settings;
        this.onSettingsChange = onSettingsChange;
    }

    onload() {
        this.plugin.registerView(DAILY_NOTES_TIMELINE_VIEW, (leaf) => {
            return new DailyNotesTimelineView(leaf, this.settings, this.onSettingsChange);
        });

        this.plugin.addCommand({
            id: 'crystal-open-daily-note-timeline',
            name: 'Open Daily Notes Timeline',
            callback: () => {
                void this.activateView();
            }
        });
    }

    updateSettings(settings: CrystalPluginSettings) {
        this.settings = settings;
        this.updateViews();
    }

    private async activateView() {
        const { workspace } = this.plugin.app;
        let leaf = workspace.getLeavesOfType(DAILY_NOTES_TIMELINE_VIEW)[0];
        if (!leaf) {
            leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf('tab');
        }
        if (!leaf) {
            return;
        }
        await leaf.setViewState({ type: DAILY_NOTES_TIMELINE_VIEW, active: true });
        workspace.revealLeaf(leaf);
        const view = leaf.view;
        if (view instanceof DailyNotesTimelineView) {
            void view.handleViewActivated();
        }
    }

    private updateViews() {
        const leaves = this.plugin.app.workspace.getLeavesOfType(DAILY_NOTES_TIMELINE_VIEW);
        for (const leaf of leaves) {
            const view = leaf.view;
            if (view instanceof DailyNotesTimelineView) {
                view.setSettings(this.settings);
            }
        }
    }
}
