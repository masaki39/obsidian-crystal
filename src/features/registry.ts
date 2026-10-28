import type { CrystalPluginSettings } from '../settings';
import type { CrystalPluginHost } from '../types';
import { TerminalService } from '../shared/terminal-service';
import { AiCommands } from './ai/ai-commands';
import { BlueskyService } from './bluesky/service';
import { DailyNotesManager } from './daily-notes/manager';
import { DailyNoteWeekday } from './daily-notes/weekday';
import { DailyDraft } from './daily-notes/draft';
import { AutoBulletService } from './editor/auto-bullet';
import { EditorCommands } from './editor/commands';
import { GamificationManager } from './gamification/manager';
import { activateGamificationView, registerGamificationView } from './gamification/register';
import { GitSummaryService } from './git-summary/git-summary-service';
import { GyazoCommands } from './gyazo/commands';
import { GyazoImageMigrator } from './gyazo/image-migrator';
import { GyazoLocalImageMigrator } from './gyazo/local-image-migrator';
import { GyazoService } from './gyazo/service';
import { HackerModeService } from './hacker/mode';
import { ImagePasteAndDropHandler } from './images/paste-drop-handler';
import { MacroCommands } from './marp/macro';
import { MarpCommands } from './marp/commands';
import { MarpCursorSync } from './marp/sync';
import { MarpSlideToolbar } from './marp/toolbar';
import { PropertyColorService } from './properties/color';
import { PropertyLinkService } from './properties/link';
import { QuartzService } from './quartz/quartz-service';
import { OpacityService } from './workspace/opacity';
import { SidebarFocusCommands } from './workspace/sidebar-focus';
import { StatusBarOrderService } from './workspace/status-bar-order';

/** Every feature service, all sharing the plugin's single settings object. */
export interface CrystalServices {
	aiCommands: AiCommands;
	blueskyService: BlueskyService;
	dailyNotesManager: DailyNotesManager;
	dailyNoteWeekday: DailyNoteWeekday;
	dailyDraft: DailyDraft;
	gyazoService: GyazoService;
	gyazoImageMigrator: GyazoImageMigrator;
	gyazoLocalImageMigrator: GyazoLocalImageMigrator;
	gyazoCommands: GyazoCommands;
	imagePasteAndDropHandler: ImagePasteAndDropHandler;
	editorCommands: EditorCommands;
	autoBulletService: AutoBulletService;
	terminalService: TerminalService;
	marpCommands: MarpCommands;
	marpCursorSync: MarpCursorSync;
	marpSlideToolbar: MarpSlideToolbar;
	quartzService: QuartzService;
	macroCommands: MacroCommands;
	gitSummaryService: GitSummaryService;
	opacityService: OpacityService;
	gamificationManager: GamificationManager;
	sidebarFocusCommands: SidebarFocusCommands;
	propertyLinkService: PropertyLinkService;
	propertyColorService: PropertyColorService;
	statusBarOrderService: StatusBarOrderService;
	hackerModeService: HackerModeService;
}

/** Construct the services. The order matters only for dependencies. */
export function createServices(plugin: CrystalPluginHost, settings: CrystalPluginSettings): CrystalServices {
	const { app } = plugin;
	const aiCommands = new AiCommands(app, plugin, settings);
	const dailyNotesManager = new DailyNotesManager(app, settings, plugin);
	const dailyNoteWeekday = new DailyNoteWeekday(app, plugin, settings);
	const gyazoService = new GyazoService(settings);
	const gyazoImageMigrator = new GyazoImageMigrator(gyazoService);
	const gyazoLocalImageMigrator = new GyazoLocalImageMigrator(app, gyazoService);
	const gyazoCommands = new GyazoCommands(plugin, gyazoService, gyazoImageMigrator, gyazoLocalImageMigrator);
	const blueskyService = new BlueskyService(app, plugin, settings, dailyNotesManager, gyazoService);
	const dailyDraft = new DailyDraft(app, plugin, settings, dailyNotesManager, blueskyService);
	const imagePasteAndDropHandler = new ImagePasteAndDropHandler(app, settings, plugin);
	const editorCommands = new EditorCommands(app, settings, plugin);
	const autoBulletService = new AutoBulletService(plugin, settings);
	const terminalService = new TerminalService(app);
	const marpCommands = new MarpCommands(terminalService, settings, plugin);
	const marpCursorSync = new MarpCursorSync(plugin, settings);
	const marpSlideToolbar = new MarpSlideToolbar(plugin, settings, marpCommands);
	const quartzService = new QuartzService(plugin, settings, terminalService);
	const macroCommands = new MacroCommands(marpCommands, editorCommands, plugin);
	const gitSummaryService = new GitSummaryService(app, plugin, settings, terminalService, aiCommands);
	const opacityService = new OpacityService(plugin);
	const gamificationManager = new GamificationManager(
		app, plugin, settings, Math.random, () => activateGamificationView(app)
	);
	const sidebarFocusCommands = new SidebarFocusCommands(app, plugin);
	const propertyLinkService = new PropertyLinkService(app, plugin, settings);
	const propertyColorService = new PropertyColorService(app, plugin, settings);
	const statusBarOrderService = new StatusBarOrderService(plugin);
	const hackerModeService = new HackerModeService(plugin);

	return {
		aiCommands, blueskyService, dailyNotesManager, dailyNoteWeekday, dailyDraft,
		gyazoService, gyazoImageMigrator, gyazoLocalImageMigrator, gyazoCommands,
		imagePasteAndDropHandler, editorCommands, autoBulletService, terminalService,
		marpCommands, marpCursorSync, marpSlideToolbar, quartzService, macroCommands,
		gitSummaryService, opacityService, gamificationManager, sidebarFocusCommands,
		propertyLinkService, propertyColorService, statusBarOrderService, hackerModeService,
	};
}

/**
 * Load every feature. The order is part of the behavior: it decides the order
 * of status bar items and ribbon icons. Async `onload()`s are intentionally
 * not awaited (as before).
 */
export function loadServices(plugin: CrystalPluginHost, s: CrystalServices): void {
	s.blueskyService.onload();
	s.quartzService.onload();
	s.dailyNotesManager.onload();
	s.dailyNoteWeekday.onload();
	s.dailyDraft.onload();
	s.marpCommands.onload();
	s.marpCursorSync.onload();
	s.marpSlideToolbar.onload();
	s.aiCommands.onload();
	s.editorCommands.onload();
	s.autoBulletService.onload();
	s.macroCommands.onload();
	s.gitSummaryService.onload();
	s.opacityService.onload();
	s.gamificationManager.onload();
	s.sidebarFocusCommands.onload();
	s.propertyLinkService.onload();
	s.propertyColorService.onload();
	s.statusBarOrderService.onload();
	s.hackerModeService.onload();

	// Gamification view (sidebar): full Lv/XP/streak/badge picture
	registerGamificationView(plugin, () => s.gamificationManager.getSnapshot());

	s.imagePasteAndDropHandler.onload();
	s.gyazoCommands.onload();
}

export function unloadServices(s: CrystalServices): void {
	// Flushes any debounced gamification save so a completion right before
	// unload/reload isn't silently dropped, then clears its timers.
	s.gamificationManager.onunload();
	s.opacityService.onunload();
	s.statusBarOrderService.onunload();
	s.hackerModeService.onunload();
	// 起動した Marp サーバーを残さない（Obsidian終了・プラグイン無効化・リロード時）
	s.marpCommands.onunload();
	s.marpCursorSync.onunload();
	s.marpSlideToolbar.onunload();
}

/** Push changed settings to the services that react to them (Bluesky re-logs in, so it is awaited). */
export async function updateServiceSettings(s: CrystalServices, settings: CrystalPluginSettings): Promise<void> {
	s.aiCommands.updateSettings(settings);
	await s.blueskyService.updateSettings(settings);
	s.dailyNotesManager.updateSettings(settings);
	s.dailyNoteWeekday.updateSettings(settings);
	s.dailyDraft.updateSettings(settings);
	s.imagePasteAndDropHandler.updateSettings(settings);
	s.editorCommands.updateSettings(settings);
	s.autoBulletService.updateSettings(settings);
	s.gyazoService.updateSettings(settings);
	s.marpCommands.updateSettings(settings);
	s.marpCursorSync.updateSettings(settings);
	s.marpSlideToolbar.updateSettings(settings);
	s.quartzService.updateSettings(settings);
	s.gitSummaryService.updateSettings(settings);
	s.gamificationManager.updateSettings(settings);
	s.propertyLinkService.updateSettings(settings);
	s.propertyColorService.updateSettings(settings);
	s.statusBarOrderService.updateSettings(settings);
	s.hackerModeService.updateSettings();
}
