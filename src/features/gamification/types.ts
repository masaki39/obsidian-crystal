import type { DailyChars } from './word-stats';
import type { BadgeSnapshot, NearestBadgeTarget } from './rules/badges';
import type { DailyXP } from './rules/xp-log';

export interface TodayProgress {
    completed: number;
    total: number;
}

export interface GamificationSnapshot {
    enabled: boolean;
    level: number;
    levelTitle: string;
    xpIntoLevel: number;
    xpForNextLevel: number;
    totalXP: number;
    streak: number;
    freezeTokensAvailable: number;
    badges: BadgeSnapshot[];
    todayProgress: TodayProgress | null;
    totalTasksCompleted: number;
    startDate: string | null;
    weeklyXP: DailyXP[];
    monthlyXP: DailyXP[];
    nearestBadge: NearestBadgeTarget | null;
    freezeTokenLog: string[];
    bestStreak: number;
    bestDayTasks: number;
    bestWeekXP: number;
    /** Whether the optional Better Word Count integration found a usable stats file. */
    charStatsAvailable: boolean;
    /** Today's writing progress toward the daily character goal, or null when
     * unavailable (no stats file, or the goal is set to 0/disabled). */
    todayChars: { current: number; goal: number } | null;
    weeklyChars: DailyChars[];
    lifetimeCharsWritten: number;
    bestDayChars: number;
    bestWeekChars: number;
}

export const VIEW_TYPE_GAMIFICATION = 'crystal-gamification-view';

/** Workspace event fired on every reward flash with `(text, durationMs)`; hacker mode listens to it. */
export const GAMIFICATION_FLASH_EVENT = 'crystal:gamification-flash';
