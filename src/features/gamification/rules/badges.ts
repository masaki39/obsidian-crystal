export interface Badge {
	id: string;
	name: string;
	description: string;
	/** Lucide icon name (see obsidian's `setIcon`), not an emoji — kept crisp and theme-aware. */
	icon: string;
	/** Hidden badges show no hint (not even the requirement) until unlocked — a surprise to discover. */
	hidden?: boolean;
}

type BadgeMetric = 'level' | 'streak' | 'chars';

interface BadgeRule extends Badge {
	metric: BadgeMetric;
	threshold: number;
}

const LEVEL_BADGES: BadgeRule[] = [
	{ id: 'level-5', name: 'Rookie', description: 'Reach level 5', icon: 'award', metric: 'level', threshold: 5 },
	{ id: 'level-10', name: 'Adept', description: 'Reach level 10', icon: 'shield', metric: 'level', threshold: 10 },
	{ id: 'level-20', name: 'Veteran', description: 'Reach level 20', icon: 'medal', metric: 'level', threshold: 20 },
	{ id: 'level-30', name: 'Master', description: 'Reach level 30', icon: 'gem', metric: 'level', threshold: 30 },
	{ id: 'level-50', name: 'Legend', description: 'Reach level 50', icon: 'crown', metric: 'level', threshold: 50 },
];

/**
 * The level-badge names double as level "titles" — reused here as a compact
 * one-line status (e.g. "LEVEL 12 · Adept") instead of only living inside the
 * badge collection.
 */
export function titleForLevel(level: number): string {
	let title = 'Beginner';
	for (const badge of LEVEL_BADGES) {
		if (level >= badge.threshold) title = badge.name;
	}
	return title;
}

const STREAK_BADGES: BadgeRule[] = [
	{ id: 'streak-3', name: 'Firestarter', description: '3-day streak', icon: 'flame', metric: 'streak', threshold: 3 },
	{ id: 'streak-7', name: 'Week Streak', description: '7-day streak', icon: 'flame', metric: 'streak', threshold: 7 },
	{ id: 'streak-30', name: 'Habit Master', description: '30-day streak', icon: 'flame', metric: 'streak', threshold: 30 },
	{ id: 'streak-100', name: 'Centurion', description: '100-day streak', icon: 'flame', metric: 'streak', threshold: 100 },
];

/**
 * Lifetime-characters-written badges, sourced from the optional Better Word
 * Count integration (see `word-stats.ts`). Thresholds are in characters
 * (not words) since this plugin's userbase writes primarily in Japanese,
 * where "characters" is the natural, familiar unit — unlike Better Word
 * Count's own word-count heuristic, which just counts every CJK character as
 * a separate "word" anyway.
 */
const CHAR_BADGES: BadgeRule[] = [
	{ id: 'chars-10000', name: 'Scribe', description: 'Write 10,000 characters (lifetime)', icon: 'pen-line', metric: 'chars', threshold: 10000 },
	{ id: 'chars-50000', name: 'Wordsmith', description: 'Write 50,000 characters (lifetime)', icon: 'feather', metric: 'chars', threshold: 50000 },
	{ id: 'chars-200000', name: 'Novelist', description: 'Write 200,000 characters (lifetime)', icon: 'book-open', metric: 'chars', threshold: 200000 },
	{ id: 'chars-500000', name: 'Chronicler', description: 'Write 500,000 characters (lifetime)', icon: 'library', metric: 'chars', threshold: 500000 },
];

/**
 * Characters eligible for the chars-based badges above: the true lifetime
 * total minus whatever `baseline` was captured at the last "Reset progress".
 * The optional Better Word Count integration's stats file is external and
 * can't itself be reset from here, so without subtracting a baseline these
 * badges would instantly re-unlock on the very next writing tick after a
 * reset, even though the reset's own confirmation dialog promises a clean
 * slate. Never negative — a baseline can only reduce eligibility, not push a
 * legitimately-lower later reading below 0.
 */
export function charsBadgeEligible(lifetimeChars: number, baseline: number): number {
	return Math.max(0, lifetimeChars - baseline);
}

/** Secret badges with unusual, non-metric conditions — discovered by surprise, not chased. */
export const SPECIAL_BADGE_IDS = {
	NIGHT_OWL: 'special-night-owl',
	TEN_IN_A_DAY: 'special-ten-in-a-day',
} as const;

const NIGHT_OWL_BADGE: Badge = { id: SPECIAL_BADGE_IDS.NIGHT_OWL, name: 'Night Owl', description: 'Complete a task between midnight and 5am', icon: 'moon', hidden: true };
const TEN_IN_A_DAY_BADGE: Badge = { id: SPECIAL_BADGE_IDS.TEN_IN_A_DAY, name: 'Overdrive', description: 'Complete 10+ tasks in a single day', icon: 'rocket', hidden: true };

const SPECIAL_BADGES: Badge[] = [NIGHT_OWL_BADGE, TEN_IN_A_DAY_BADGE];

/**
 * Check the hidden/special badges, which don't fit the level/streak metric
 * system. `hour` is the local hour (0-23) the completion happened at.
 */
export function checkNewlySpecialUnlocks(
	context: { hour: number; todayTaskCount: number },
	unlockedIds: string[]
): Badge[] {
	const unlocked: Badge[] = [];
	if (!unlockedIds.includes(SPECIAL_BADGE_IDS.NIGHT_OWL) && context.hour >= 0 && context.hour < 5) {
		unlocked.push(NIGHT_OWL_BADGE);
	}
	if (!unlockedIds.includes(SPECIAL_BADGE_IDS.TEN_IN_A_DAY) && context.todayTaskCount >= 10) {
		unlocked.push(TEN_IN_A_DAY_BADGE);
	}
	return unlocked;
}

const ALL_BADGE_RULES: BadgeRule[] = [...LEVEL_BADGES, ...STREAK_BADGES, ...CHAR_BADGES];

export const ALL_BADGES: Badge[] = [...ALL_BADGE_RULES, ...SPECIAL_BADGES];

function badgeMetricValue(badge: BadgeRule, state: { level: number; streak: number; chars?: number }): number {
	if (badge.metric === 'level') return state.level;
	if (badge.metric === 'streak') return state.streak;
	return state.chars ?? 0;
}

/**
 * Return badges that newly satisfy their unlock condition and aren't
 * already in `unlockedIds`, in badge-list order. `chars` (lifetime
 * characters written) is optional since it depends on the optional Better
 * Word Count integration — omitted or 0 simply means no char badge unlocks yet.
 */
export function checkNewlyUnlockedBadges(
	state: { level: number; streak: number; totalXP: number; chars?: number },
	unlockedIds: string[]
): Badge[] {
	return ALL_BADGE_RULES.filter(
		(badge) => !unlockedIds.includes(badge.id) && badgeMetricValue(badge, state) >= badge.threshold
	);
}

export interface NearestBadgeTarget {
	badge: Badge;
	remaining: number;
	metric: BadgeMetric;
}

/**
 * Find the closest not-yet-unlocked badge, i.e. the one requiring the
 * smallest further progress on its metric. Surfaces a concrete next target
 * ("2 more levels to Adept") — visualizing the anticipation, not just the payoff.
 */
export function findNearestBadgeTarget(
	state: { level: number; streak: number; chars?: number },
	unlockedIds: string[]
): NearestBadgeTarget | null {
	let best: NearestBadgeTarget | null = null;
	for (const badge of ALL_BADGE_RULES) {
		if (unlockedIds.includes(badge.id)) continue;
		const remaining = badge.threshold - badgeMetricValue(badge, state);
		if (remaining <= 0) continue;
		if (!best || remaining < best.remaining) {
			best = { badge: { id: badge.id, name: badge.name, description: badge.description, icon: badge.icon }, remaining, metric: badge.metric };
		}
	}
	return best;
}

export interface BadgeSnapshot extends Badge {
	unlocked: boolean;
}
