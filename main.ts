import { Editor, MarkdownView, Plugin } from 'obsidian';
import { CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { GeminiService } from './src/gemini-service';
import { BlueskyService } from './src/bluesky-service';
import { DailyNotesManager } from './src/daily-notes';
import { DailyNoteWeekday } from './src/daily-note-weekday';
import { DailyDraft } from './src/daily-draft';
import { GyazoService } from './src/gyazo-service';
import { GyazoImageMigrator } from './src/gyazo-image-migrator';
import { GyazoLocalImageMigrator } from './src/gyazo-local-image-migrator';
import { ImagePasteAndDropHandler } from './src/clipboard-paste-handler';
import { EditorCommands } from './src/editor-commands';
import { MarpCommands } from './src/marp';
import { MarpCursorSync } from './src/marp-sync';
import { MarpSlideToolbar } from './src/marp-toolbar';
import { TerminalService } from './src/terminal-service';
import { QuartzService } from './src/quartz-service';
import { MacroCommands } from './src/macro';
import { GitSummaryService } from './src/git-summary-service';
import { OpacityService } from './src/opacity-service';
import { GamificationManager, VIEW_TYPE_GAMIFICATION } from './src/gamification';
import { GamificationView } from './src/gamification-view';
import { SidebarFocusCommands } from './src/sidebar-focus';
import { PropertyLinkService } from './src/property-link';
import { PropertyColorService } from './src/property-color';
import { StatusBarOrderService } from './src/status-bar-order';
import { HackerModeService } from './src/hacker-mode';

// Crystal Plugin for Obsidian

const SECRET_FIELDS: (keyof CrystalPluginSettings)[] = [
	'GeminiAPIKey',
	'OpenAIAPIKey',
	'blueskyIdentifier',
	'blueskyPassword',
	'gyazoAccessToken',
];

const SECRET_KEY_MAP: Record<keyof CrystalPluginSettings, string> = {
	GeminiAPIKey: 'crystal-gemini-api-key',
	OpenAIAPIKey: 'crystal-openai-api-key',
	blueskyIdentifier: 'crystal-bluesky-identifier',
	blueskyPassword: 'crystal-bluesky-password',
	gyazoAccessToken: 'crystal-gyazo-access-token',
} as any;

function secretKey(field: keyof CrystalPluginSettings): string {
	return SECRET_KEY_MAP[field];
}

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
		this.dailyDraft = new DailyDraft(this.app, this, this.settings, this.dailyNotesManager);
		this.gyazoService = new GyazoService(this.settings);
		this.gyazoImageMigrator = new GyazoImageMigrator(this.gyazoService);
		this.gyazoLocalImageMigrator = new GyazoLocalImageMigrator(this.app, this.gyazoService);
		this.blueskyService = new BlueskyService(this.app, this, this.settings, this.dailyNotesManager, this.gyazoService);
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
			this.app, this, this.settings, Math.random, () => this.activateGamificationView()
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
		this.registerView(
			VIEW_TYPE_GAMIFICATION,
			(leaf) => new GamificationView(leaf, () => this.gamificationManager.getSnapshot())
		);
		this.addRibbonIcon('gamepad-2', 'Crystal: Gamification stats', () => this.activateGamificationView());
		this.addCommand({
			id: 'crystal-open-gamification-view',
			name: 'Gamification: Open stats view',
			icon: 'gamepad-2',
			callback: () => this.activateGamificationView(),
		});

		// Always enable image paste and drop handler (processing depends on settings)
		this.imagePasteAndDropHandler.enable();
		this.imagePasteAndDropHandler.onload();


		// Gyazo Upload Command
		this.addCommand({
			id: 'crystal-upload-clipboard-image',
			name: 'Gyazo: Upload clipboard image',
			icon: 'upload-cloud',
			editorCallback: async (editor: Editor) => {
				try {
					await this.gyazoService.uploadClipboardImage(editor);
				} catch (error) {
					console.error('Failed to upload clipboard image:', error);
				}
			}
		});

		// Gyazo File Upload Command
		this.addCommand({
			id: 'crystal-upload-file-image',
			name: 'Gyazo: Upload image file',
			icon: 'upload-cloud',
			editorCallback: async (editor: Editor) => {
				try {
					await this.gyazoService.promptFileUpload(editor);
				} catch (error) {
					console.error('Failed to upload image file:', error);
				}
			}
		});

		// Replace external image URLs in the active note with Gyazo-hosted copies
		this.addCommand({
			id: 'crystal-replace-image-urls-with-gyazo',
			name: 'Gyazo: Replace image URLs in active note',
			icon: 'image-plus',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					await this.gyazoImageMigrator.replaceExternalImagesInActiveNote(editor, view);
				} catch (error) {
					console.error('Failed to replace image URLs with Gyazo:', error);
				}
			}
		});

		// Replace local (vault) image embeds in the active note with Gyazo-hosted copies
		this.addCommand({
			id: 'crystal-replace-local-images-with-gyazo',
			name: 'Gyazo: Replace local images in active note',
			icon: 'image-plus',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					await this.gyazoLocalImageMigrator.replaceLocalImagesInActiveNote(editor, view);
				} catch (error) {
					console.error('Failed to replace local images with Gyazo:', error);
				}
			}
		});

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

	async activateGamificationView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_GAMIFICATION)[0];
		if (!leaf) {
			leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
			await leaf.setViewState({ type: VIEW_TYPE_GAMIFICATION, active: true });
		}
		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		const stored = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);

		// Load secrets from SecretStorage; migrate from old data.json if needed
		for (const field of SECRET_FIELDS) {
			const key = secretKey(field);
			const fromStore = await this.app.secretStorage.getSecret(key);
			if (fromStore !== null) {
				(this.settings as any)[field] = fromStore;
			} else if ((this.settings as any)[field]) {
				// Migrate: move value from data.json into SecretStorage
				await this.app.secretStorage.setSecret(key, (this.settings as any)[field]);
			}
		}

		// Remove secrets from data.json
		const clean: any = Object.assign({}, stored);
		for (const field of SECRET_FIELDS) {
			delete clean[field];
		}
		await this.saveData(clean);
	}

	async saveSettings() {
		// Save non-secret settings to data.json
		const clean: any = Object.assign({}, this.settings);
		for (const field of SECRET_FIELDS) {
			delete clean[field];
		}
		await this.saveData(clean);

		// Save secrets to SecretStorage
		for (const field of SECRET_FIELDS) {
			const value = (this.settings as any)[field] as string;
			this.app.secretStorage.setSecret(secretKey(field), value ?? '');
		}

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
