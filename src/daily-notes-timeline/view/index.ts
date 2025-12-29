import { ItemView, WorkspaceLeaf } from 'obsidian';
import { CrystalPluginSettings } from '../../settings';
import { DailyNotesTimelineController } from './controller';

export const DAILY_NOTES_TIMELINE_VIEW = 'daily-note-timeline-view';

export class DailyNotesTimelineView extends ItemView {
    private settings: CrystalPluginSettings;
    private controller: DailyNotesTimelineController | null = null;
    private readonly debugFlag = 'CRYSTAL_TIMELINE_DEBUG';
    private onSettingsChange: (() => Promise<void>) | null = null;

    constructor(leaf: WorkspaceLeaf, settings: CrystalPluginSettings, onSettingsChange?: () => Promise<void>) {
        super(leaf);
        this.settings = settings;
        this.onSettingsChange = onSettingsChange ?? null;
    }

    public async handleViewActivated(): Promise<void> {
        this.debugLog('activate');
        if (this.controller) {
            await this.controller.handleViewActivated();
        }
    }

    getViewType(): string {
        return DAILY_NOTES_TIMELINE_VIEW;
    }

    getDisplayText(): string {
        return 'Daily Notes Timeline';
    }

    getIcon(): string {
        return 'calendar';
    }

    setSettings(settings: CrystalPluginSettings) {
        this.settings = settings;
        this.controller?.setSettings(settings);
    }

    async onOpen(): Promise<void> {
        this.controller = new DailyNotesTimelineController({
            app: this.app,
            contentEl: this.contentEl,
            registerDomEvent: this.registerDomEvent.bind(this),
            onSettingsChange: this.onSettingsChange ?? undefined,
            settings: this.settings,
            debugLog: (message, details) => this.debugLog(message, details),
            markdownComponent: this,
            isLeafDeferred: () => this.leaf?.isDeferred ?? false
        });

        this.registerEvent(this.app.vault.on('create', file => this.controller?.onVaultChange(file)));
        this.registerEvent(this.app.vault.on('modify', file => this.controller?.onVaultChange(file)));
        this.registerEvent(this.app.vault.on('delete', file => this.controller?.onVaultChange(file)));
        this.registerEvent(this.app.workspace.on('active-leaf-change', leaf => {
            this.controller?.onActiveLeafChange(leaf, leaf === this.leaf);
        }));

        await this.controller.onOpen();
    }

    async onClose(): Promise<void> {
        if (this.controller) {
            await this.controller.onClose();
        }
        this.controller = null;
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
