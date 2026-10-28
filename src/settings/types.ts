export interface FileOrganizationRule {
	displayName: string;
	tag: string;
	folder: string;
	prefix: string;
	includeDate: boolean;
}

/**
 * A reciprocal property-link rule: when `source` links to another note, a
 * link back to the note is added to that other note's `target` property
 * (created as a list if missing). `source === target` (e.g. `friends`,
 * `oppose`) makes the relation symmetric instead of directed.
 */
export interface PropertyLinkPair {
	source: string;
	target: string;
}

/** Text color for the name of one or more properties in the Properties editor. */
export interface PropertyColorRule {
	/** Property name, or several separated by commas (e.g. `status, priority`). */
	property: string;
	/** Hex color, e.g. `#e5484d`. */
	color: string;
}

/** Individual effects of hacker mode (see `HackerModeService`). */
export interface HackerEffectToggles {
	crt: boolean;
	glow: boolean;
	typingParticles: boolean;
	boot: boolean;
	hud: boolean;
	matrixBackground: boolean;
	titleDecode: boolean;
	rewardBanner: boolean;
}

export interface CrystalPluginSettings {
	exportFolderPath: string;
	aiProvider: 'gemini' | 'openai' | 'ollama';
	GeminiAPIKey: string;
	GeminiModel: string;
	OpenAIAPIKey: string;
	OpenAIModel: string;
	/** Base URL of a local Ollama server (no trailing slash needed). */
	OllamaBaseUrl: string;
	/** Name of a locally pulled Ollama model (e.g. `llama3.1`, `gemma3`). */
	OllamaModel: string;
	blueskyIdentifier: string;
	blueskyPassword: string;
	blueskyAppendToDailyNote: boolean;
	dailyNoteTimelineHeading: string;
	dailyNoteAutoSort: boolean;
	dailyNoteAutoLink: boolean;
	dailyNoteNewestFirst: boolean;
	/** Show the day of the week after a daily note's inline title. */
	dailyNoteShowWeekday: boolean;
	/** moment.js format for the weekday label (follows Obsidian's language). */
	dailyNoteWeekdayFormat: string;
	/** Note used by "Daily: Open draft" / "Daily: Post draft to timeline". */
	dailyNoteDraftPath: string;
	webpQuality: number;
	imageResizeScale: number;
	imageMaxSize: number;
	autoWebpPaste: boolean;
	gyazoAccessToken: string;
	marpSlideFolderPath: string;
	marpThemePath: string;
	marpAttachmentFolderPath: string;
	marpSyncCursorToServer: boolean;
	marpSyncSlideToCursor: boolean;
	marpShowSlideToolbar: boolean;
	publishFolderPath: string;
	quartzPath: string;
	quartzSiteName: string;
	githubUserName: string;
	fileOrganizationRules: FileOrganizationRule[];
	windowOpacity: number;
	gamificationEnabled: boolean;
	gamificationTotalXP: number;
	gamificationStreak: number;
	gamificationLastActiveDate: string;
	gamificationFreezeTokensAvailable: number;
	gamificationFreezeTokensRefillMonth: string;
	gamificationUnlockedBadges: string[];
	gamificationTotalTasksCompleted: number;
	gamificationStartDate: string;
	gamificationDailyXPLog: Record<string, number>;
	gamificationFreezeTokenLog: string[];
	gamificationBestStreak: number;
	gamificationBestDayTasks: number;
	gamificationBestWeekXP: number;
	gamificationDailyTaskLog: Record<string, number>;
	gamificationFreezeMilestonesGranted: number[];
	/** Local day-of-week (0=Sunday..6=Saturday) that never counts as a missed
	 * day for streak purposes, or -1 if no rest day is configured. */
	gamificationRestDayOfWeek: number;
	/** Daily writing-goal target in characters, used by the optional Better
	 * Word Count integration; 0 disables the writing-goal feature. */
	gamificationDailyCharGoal: number;
	/** Date (YYYY-MM-DD) the writing goal's XP reward was last granted, so it
	 * fires at most once per day. */
	gamificationCharGoalLastAchievedDate: string;
	/** Date (YYYY-MM-DD) `gamificationCharMilestonesReached` applies to; reset
	 * when the date rolls over. */
	gamificationCharMilestonesDate: string;
	/** Writing-goal fractions (from `CHAR_GOAL_MILESTONES`) already rolled today. */
	gamificationCharMilestonesReached: number[];
	/**
	 * Lifetime-characters-written total (from the optional Better Word Count
	 * integration) as of the last "Reset progress". That integration's own
	 * stats file is external and can't be reset from here, so without this
	 * baseline the chars-based badges (Scribe/Wordsmith/...) would instantly
	 * re-unlock on the very next writing tick after a reset. Chars-badge
	 * eligibility is `lifetimeCharactersWritten(stats) - this baseline`,
	 * while the *displayed* lifetime total stays the true, unadjusted figure.
	 */
	gamificationCharsBadgeBaseline: number;
	/** Auto-detect list-property links (e.g. `next`) on save and add the
	 * reciprocal link (e.g. `previous`) to the linked note. */
	propertyLinkEnabled: boolean;
	propertyLinkPairs: PropertyLinkPair[];
	/** Per-property text colors for property names (see `PropertyColorService`). */
	propertyColors: PropertyColorRule[];
	/** Hex color for every property name without its own rule; empty keeps the theme's color. */
	propertyColorDefault: string;
	/** Id of the swatch palette offered in the settings (see `COLOR_PALETTES`). */
	propertyColorPalette: string;
	/** Ordered list of status-bar item keys (see `StatusBarOrderService`).
	 * Empty means "don't touch the native order". */
	statusBarOrder: string[];
	/** Status-bar item keys to hide. */
	statusBarHidden: string[];
	/** Master switch for the visual/sound effects of hacker mode. */
	hackerModeEnabled: boolean;
	/** Accent color shared by every hacker-mode effect. */
	hackerColor: string;
	hackerEffects: HackerEffectToggles;
	/** Opacity of the background digital rain (0–1). */
	hackerMatrixOpacity: number;
	/** Turn whitespace typed at the start of a line into a "- " bullet (Cosense style). */
	autoBulletEnabled: boolean;
	/** Which keys trigger auto bullet. */
	autoBulletHalfWidthSpace: boolean;
	autoBulletFullWidthSpace: boolean;
	autoBulletTab: boolean;
}
