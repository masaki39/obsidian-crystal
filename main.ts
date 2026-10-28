import { Plugin } from 'obsidian';
import { type CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { GeminiService } from './src/gemini-service';
import { BlueskyService } from './src/bluesky-service';
import { DailyNotesManager } from './src/daily-notes';
import { DailyNoteWeekday } from './src/daily-note-weekday';
import { DailyDraft } from './src/daily-draft';
import { GyazoService } from './src/features/gyazo/service';
import { GyazoImageMigrator } from './src/features/gyazo/image-migrator';
import { GyazoLocalImageMigrator } from './src/features/gyazo/local-image-migrator';
import { ImagePasteAndDropHandler } from './src/features/images/paste-drop-handler';
import { EditorCommands } from './src/editor-commands';
import { MarpCommands } from './src/marp';
import { MarpCursorSync } from './src/marp-sync';
import { MarpSlideToolbar } from './src/marp-toolbar';
import { TerminalService } from './src/shared/terminal-service';
import { QuartzService } from './src/features/quartz/quartz-service';
import { MacroCommands } from './src/macro';
import { GitSummaryService } from './src/git-summary-service';
import { OpacityService } from './src/features/workspace/opacity';
import { GamificationManager } from './src/gamification';
import { activateGamificationView, registerGamificationView } from './src/gamification-register';
import { SidebarFocusCommands } from './src/features/workspace/sidebar-focus';
import { PropertyLinkService } from './src/features/properties/link';
import { PropertyColorService } from './src/features/properties/color';
import { StatusBarOrderService } from './src/features/workspace/status-bar-order';
import { HackerModeService } from './src/features/hacker/mode';
import { GyazoCommands } from './src/features/gyazo/commands';
import { loadSecrets, saveSecrets, withoutSecrets } from './src/settings/secrets';

export default class CrystalPlugin extends Plugin {
	settings: CrystalPluginSettings;
	private geminiService: GeminiService;
	private blueskyService: BlueskyService;
	private dailyNotesManager: DailyNotesManager;
	private dailyNoteWeekday: DailyNoteWeekday;
	private dailyDraft: DailyDraft;
	private gyazoService: GyazoService;
	private gyazoImageMigrator: GyazoImageMigrator;
	private gyazoLocalImageMigrator: GyazoLocalImageMigrator;
	private gyazoCommands: GyazoCommands;
	private imagePasteAndDropHandler: ImagePasteAndDropHandler;
	private editorCommands: EditorCommands;
	private marpCommands: MarpCommands;
	private marpCursorSync: MarpCursorSync;
	private marpSlideToolbar: MarpSlideToolbar;
	private terminalService: TerminalService;
	private quartzService: QuartzService;
	private macroCommands: MacroCommands;
	private gitSummaryService: GitSummaryService;
	private opacityService: OpacityService;
	private gamificationManager: GamificationManager;
	private sidebarFocusCommands: SidebarFocusCommands;
	private propertyLinkService: PropertyLinkService;
	private propertyColorService: PropertyColorService;
	statusBarOrderService: StatusBarOrderService;
	hackerModeService: HackerModeService;

	async onload() {
		await this.loadSettings();

		// Initialize services
		this.geminiService = new GeminiService(this.app, this, this.settings);
		this.dailyNotesManager = new DailyNotesManager(this.app, this.settings, this);
		this.dailyNoteWeekday = new DailyNoteWeekday(this.app, this, this.settings);
		this.gyazoService = new GyazoService(this.settings);
		this.gyazoImageMigrator = new GyazoImageMigrator(this.gyazoService);
		this.gyazoLocalImageMigrator = new GyazoLocalImageMigrator(this.app, this.gyazoService);
		this.gyazoCommands = new GyazoCommands(this, this.gyazoService, this.gyazoImageMigrator, this.gyazoLocalImageMigrator);
		this.blueskyService = new BlueskyService(this.app, this, this.settings, this.dailyNotesManager, this.gyazoService);
		this.dailyDraft = new DailyDraft(this.app, this, this.settings, this.dailyNotesManager, this.blueskyService);
		this.imagePasteAndDropHandler = new ImagePasteAndDropHandler(this.app, this.settings, this);
		this.editorCommands = new EditorCommands(this.app, this.settings, this);
		this.terminalService = new TerminalService(this.app);
		this.marpCommands = new MarpCommands(this.terminalService, this.settings, this);
		this.marpCursorSync = new MarpCursorSync(this, this.settings);
		this.marpSlideToolbar = new MarpSlideToolbar(this, this.settings, this.marpCommands);
		this.quartzService = new QuartzService(this, this.settings, this.terminalService);
		this.macroCommands = new MacroCommands(this.marpCommands, this.editorCommands, this);
		this.gitSummaryService = new GitSummaryService(
			this.app, this, this.settings, this.terminalService, this.geminiService
		);
		this.opacityService = new OpacityService(this);
		this.gamificationManager = new GamificationManager(
			this.app, this, this.settings, Math.random, () => activateGamificationView(this.app)
		);
		this.sidebarFocusCommands = new SidebarFocusCommands(this.app, this);
		this.propertyLinkService = new PropertyLinkService(this.app, this, this.settings);
		this.propertyColorService = new PropertyColorService(this.app, this, this.settings);
		this.statusBarOrderService = new StatusBarOrderService(this);
		this.hackerModeService = new HackerModeService(this);

		// Load Services
		this.blueskyService.onload();
		this.quartzService.onload();
		this.dailyNotesManager.onLoad();
		this.dailyNoteWeekday.onload();
		this.dailyDraft.onload();
		this.marpCommands.onload();
		this.marpCursorSync.onload();
		this.marpSlideToolbar.onload();
		this.geminiService.onload();
		this.editorCommands.onload();
		this.macroCommands.onload();
		this.gitSummaryService.onload();
		this.opacityService.onload();
		this.gamificationManager.onLoad();
		this.sidebarFocusCommands.onload();
		this.propertyLinkService.onload();
		this.propertyColorService.onload();
		this.statusBarOrderService.onload();
		this.hackerModeService.onload();

		// Gamification view (sidebar): full Lv/XP/streak/badge picture
		registerGamificationView(this, () => this.gamificationManager.getSnapshot());

		// Always enable image paste and drop handler (processing depends on settings)
		this.imagePasteAndDropHandler.enable();
		this.imagePasteAndDropHandler.onload();

		this.gyazoCommands.onload();

		this.addSettingTab(new CrystalSettingTab(this.app, this));
	}

	onunload() {
		if (this.imagePasteAndDropHandler) {
			this.imagePasteAndDropHandler.disable();
		}
		// Flush any debounced gamification save so a completion right before
		// unload/reload isn't silently dropped.
		this.gamificationManager?.flushPendingSave();
		this.opacityService?.onunload();
		this.statusBarOrderService?.onunload();
		this.hackerModeService?.onunload();
		// 起動した Marp サーバーを残さない（Obsidian終了・プラグイン無効化・リロード時）
		this.marpCommands?.onunload();
		this.marpCursorSync?.onunload();
		this.marpSlideToolbar?.onunload();
	}

	async loadSettings() {
		const stored = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);

		// Load secrets from SecretStorage; migrate from old data.json if needed
		await loadSecrets(this.app, this.settings);

		// Remove secrets from data.json
		await this.saveData(withoutSecrets(stored));
	}

	async saveSettings() {
		// Save non-secret settings to data.json
		await this.saveData(withoutSecrets(this.settings));

		// Save secrets to SecretStorage
		saveSecrets(this.app, this.settings);

		this.geminiService.updateSettings(this.settings);
		await this.blueskyService.updateSettings(this.settings);
		this.dailyNotesManager.updateSettings(this.settings);
		this.dailyNoteWeekday.updateSettings(this.settings);
		this.dailyDraft.updateSettings(this.settings);
		this.imagePasteAndDropHandler.updateSettings(this.settings);
		this.editorCommands.updateSettings(this.settings);
		this.gyazoService.updateSettings(this.settings);
		this.marpCommands.updateSettings(this.settings);
		this.marpCursorSync.updateSettings(this.settings);
		this.marpSlideToolbar.updateSettings(this.settings);
		this.quartzService.updateSettings(this.settings);
		this.gitSummaryService.updateSettings(this.settings);
		this.gamificationManager.updateSettings(this.settings);
		this.propertyLinkService.updateSettings(this.settings);
		this.propertyColorService.updateSettings(this.settings);
		this.statusBarOrderService.updateSettings(this.settings);
		this.hackerModeService.updateSettings();
	}

}
