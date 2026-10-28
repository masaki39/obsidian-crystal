import { App, Plugin, setIcon } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import type { Badge } from './rules/badges';
import { calculateLevel, type Reward } from './rules/level';
import { GAMIFICATION_FLASH_EVENT } from './types';

export interface StatusSegment {
	icon?: string;
	text: string;
}

/** The Lv/XP/streak status bar item and its short reward "flashes". */
export class GamificationStatusBar {
	private statusBarItem: HTMLElement | null = null;
	private flashTimeoutId: number | null = null;

	constructor(
		private app: App,
		private plugin: Plugin,
		private getSettings: () => CrystalPluginSettings
	) {}

	private get settings(): CrystalPluginSettings {
		return this.getSettings();
	}

	mount(onClick?: () => void) {
		this.statusBarItem = this.plugin.addStatusBarItem();
		this.statusBarItem.addClass('crystal-gamification-status');
		if (onClick) {
			this.statusBarItem.addClass('mod-clickable');
			this.plugin.registerDomEvent(this.statusBarItem, 'click', () => onClick());
		}
		this.renderStatusBar();
	}

	renderStatusBar() {
		if (!this.statusBarItem) return;
		if (!this.settings.gamificationEnabled) {
			this.statusBarItem.empty();
			this.statusBarItem.style.display = 'none';
			return;
		}
		this.statusBarItem.style.display = '';
		const { level, xpIntoLevel, xpForNextLevel } = calculateLevel(this.settings.gamificationTotalXP);
		this.setStatusBarContent([
			{ icon: 'zap', text: `Lv${level}` },
			{ text: `${xpIntoLevel}/${xpForNextLevel}` },
			{ icon: 'flame', text: `${this.settings.gamificationStreak}` },
			{ icon: 'snowflake', text: `${this.settings.gamificationFreezeTokensAvailable}` },
		]);
	}

	/** Render icon+text segments into the status bar, separated by a middle dot. */
	private setStatusBarContent(segments: StatusSegment[]) {
		const bar = this.statusBarItem;
		if (!bar) return;
		bar.empty();
		segments.forEach((segment, index) => {
			if (index > 0) bar.createSpan({ cls: 'crystal-gv-sep', text: '·' });
			if (segment.icon) {
				const iconEl = bar.createSpan({ cls: 'crystal-gv-status-icon' });
				setIcon(iconEl, segment.icon);
			}
			bar.createSpan({ text: segment.text });
		});
	}

	/**
	 * Pick and fire the single most exciting flash from a candidate list, in
	 * priority order — every XP-earning path (task completion, hitting the
	 * writing goal, a mid-goal milestone) ends with "several things might
	 * have happened at once; show only the best one", and previously each
	 * path hand-rolled its own if/else priority chain, which had already
	 * drifted out of sync once (a badge-unlock check silently missing from
	 * one of the three). Callers pass only the candidates relevant to their
	 * path — e.g. only an "active day" event (task completion, the writing
	 * goal) carries streak/freeze/comeback candidates — so the *set* of
	 * possible celebrations still differs per path; only the "pick the first
	 * true one, else fall back" mechanism is shared. `fallback` may be `null`
	 * when a path has no default flash to fall back to (e.g. a milestone
	 * whose small bonus didn't happen to roll).
	 */
	flashMostExciting(candidates: Array<{ condition: boolean; flash: () => void }>, fallback: (() => void) | null) {
		const hit = candidates.find((c) => c.condition);
		if (hit) {
			hit.flash();
		} else {
			fallback?.();
		}
	}

	/**
	 * Briefly replace the status bar content with the reward just earned, then
	 * fall back to the normal Lv/XP/streak display. No popup — the payoff
	 * lives entirely in the status bar so it never interrupts the editor.
	 */
	flashReward(reward: Reward) {
		const icon = reward.tier === 'rare' ? 'gem' : reward.tier === 'bonus' ? 'sparkles' : 'zap';
		this.flash([{ icon, text: `+${reward.xp} XP` }], 1500);
	}

	/** Same idea as `flashReward`, but for a newly unlocked badge (shown longer). */
	flashBadge(badge: Badge) {
		this.flash([{ icon: 'award', text: 'NEW' }, { icon: badge.icon, text: badge.name }], 2500);
	}

	/** A level-up is the headline event of the whole XP system — it gets its
	 * own moment instead of blending into a routine XP-reward flash. */
	flashLevelUp(level: number) {
		this.flash([{ icon: 'trending-up', text: 'LEVEL UP' }, { icon: 'zap', text: `Lv${level}` }], 2500);
	}

	/** Celebrates beating a personal record — translates SNS-style "compare to others" into "compare to your past self". */
	flashPersonalBest(broke: { streak: boolean; dayTasks: boolean; weekXP: boolean }) {
		const text = broke.streak ? `${this.settings.gamificationBestStreak}d streak`
			: broke.dayTasks ? `${this.settings.gamificationBestDayTasks}/day`
				: `${this.settings.gamificationBestWeekXP} XP/wk`;
		this.flash([{ icon: 'trophy', text: 'BEST' }, { text }], 2200);
	}

	flash(segments: StatusSegment[], duration: number) {
		if (!this.statusBarItem || !this.settings.gamificationEnabled) return;

		// Lets hacker mode echo the moment with its own banner.
		this.app.workspace.trigger(GAMIFICATION_FLASH_EVENT, segments.map(seg => seg.text).join(' '), duration);
		this.setStatusBarContent(segments);
		this.statusBarItem.addClass('crystal-gamification-status--flash');

		if (this.flashTimeoutId !== null) {
			window.clearTimeout(this.flashTimeoutId);
		}
		this.flashTimeoutId = window.setTimeout(() => {
			this.statusBarItem?.removeClass('crystal-gamification-status--flash');
			this.flashTimeoutId = null;
			this.renderStatusBar();
		}, duration);
	}

	/** Cancel a pending flash reset (plugin unload). */
	onunload() {
		if (this.flashTimeoutId !== null) {
			window.clearTimeout(this.flashTimeoutId);
			this.flashTimeoutId = null;
		}
	}
}
