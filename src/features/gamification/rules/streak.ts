export function daysBetween(from: string, to: string): number {
	const msPerDay = 24 * 60 * 60 * 1000;
	const a = new Date(`${from}T00:00:00Z`).getTime();
	const b = new Date(`${to}T00:00:00Z`).getTime();
	return Math.round((b - a) / msPerDay);
}

/**
 * Compute the streak after a task completion on `activeDate` (YYYY-MM-DD).
 * - Same date as last time: streak unchanged (already counted today).
 * - Exactly one day after last time: streak extends.
 * - Otherwise (gap, or first ever completion): streak resets to 1.
 */
export function nextStreak(previousDate: string | null, currentStreak: number, activeDate: string): number {
	if (previousDate === activeDate) return currentStreak;
	if (previousDate && daysBetween(previousDate, activeDate) === 1) {
		return currentStreak + 1;
	}
	return 1;
}

export interface StreakResult {
	streak: number;
	freezeTokensUsed: number;
}

/**
 * Count the days strictly between `previousDate` and `activeDate` that are
 * *not* one of `restDays` (local day-of-week numbers, 0=Sunday..6=Saturday).
 * Used so a configured weekly rest day never counts as a "missed" day.
 */
export function countNonRestMissedDays(previousDate: string, activeDate: string, restDays: number[]): number {
	const msPerDay = 24 * 60 * 60 * 1000;
	const start = new Date(`${previousDate}T00:00:00Z`).getTime();
	const end = new Date(`${activeDate}T00:00:00Z`).getTime();
	let missed = 0;
	for (let t = start + msPerDay; t < end; t += msPerDay) {
		if (!restDays.includes(new Date(t).getUTCDay())) missed++;
	}
	return missed;
}

/**
 * Like `nextStreak`, but a gap of missed days can be bridged with freeze
 * tokens (one token per missed day) instead of resetting the streak. Used to
 * avoid the "missed one day, streak gone, why bother" drop-off. Days listed
 * in `restDays` (local day-of-week, 0=Sunday..6=Saturday) never count as
 * missed and never cost a freeze token — a deliberate day off each week.
 */
export function nextStreakWithFreeze(
	previousDate: string | null,
	currentStreak: number,
	activeDate: string,
	freezeTokensAvailable: number,
	restDays: number[] = []
): StreakResult {
	if (previousDate === activeDate) return { streak: currentStreak, freezeTokensUsed: 0 };
	if (!previousDate) return { streak: 1, freezeTokensUsed: 0 };

	const gap = daysBetween(previousDate, activeDate);
	if (gap === 1) return { streak: currentStreak + 1, freezeTokensUsed: 0 };
	if (gap > 1) {
		const missedDays = restDays.length > 0 ? countNonRestMissedDays(previousDate, activeDate, restDays) : gap - 1;
		if (missedDays === 0) return { streak: currentStreak + 1, freezeTokensUsed: 0 };
		if (freezeTokensAvailable >= missedDays) {
			return { streak: currentStreak + 1, freezeTokensUsed: missedDays };
		}
	}
	return { streak: 1, freezeTokensUsed: 0 };
}

const FREEZE_TOKENS_PER_MONTH = 2;

/**
 * Refill freeze tokens to at least `tokensPerMonth` at the start of each
 * calendar month. Pure function: "current month" is whatever `referenceDate`
 * says it is — callers should pass the real current date, not a possibly-
 * backdated note's date, so a backfilled old note can't shift the refill
 * month. This is a floor, not a flat reset: a surplus earned from streak
 * milestone bonuses (see `checkNewlyReachedFreezeMilestones`) carries into
 * the new month untouched instead of being silently discarded down to the
 * base amount — otherwise a 100-day/365-day streak reward could evaporate
 * the moment the calendar flips, which would undercut the very milestone
 * it's meant to celebrate. Tokens still don't accumulate *within* the same
 * month beyond what's already held.
 */
export function refillFreezeTokens(
	currentTokens: number,
	lastRefillMonth: string,
	referenceDate: string,
	tokensPerMonth: number = FREEZE_TOKENS_PER_MONTH
): { tokens: number; refillMonth: string } {
	const month = referenceDate.slice(0, 7); // YYYY-MM
	if (month !== lastRefillMonth) {
		return { tokens: Math.max(currentTokens, tokensPerMonth), refillMonth: month };
	}
	return { tokens: currentTokens, refillMonth: lastRefillMonth };
}

/** Streak lengths that grant a one-off bonus freeze token, translating Duolingo's
 * milestone-tier freeze grants (e.g. Streak Society) into this single-player context. */
const FREEZE_MILESTONES = [30, 100, 365];

/** Milestones in `FREEZE_MILESTONES` that `streak` has newly reached and aren't in `granted` yet. */
export function checkNewlyReachedFreezeMilestones(streak: number, granted: number[]): number[] {
	return FREEZE_MILESTONES.filter((milestone) => streak >= milestone && !granted.includes(milestone));
}

export interface StreakAdvanceInput {
	/** The day the completed task belongs to (the daily note's date). */
	activeDate: string;
	/** The real current date — always used for the freeze-token refill, since
	 * "this calendar month" is a real-time concept that shouldn't shift just
	 * because an old note was edited. */
	today: string;
	previousActiveDate: string | null;
	currentStreak: number;
	freezeTokensAvailable: number;
	freezeTokensRefillMonth: string;
	bestStreak: number;
	freezeMilestonesGranted: number[];
	/** -1 for "no rest day configured", otherwise 0(Sun)-6(Sat). */
	restDayOfWeek: number;
}

export interface StreakAdvanceOutput {
	/** True when `activeDate` precedes `previousActiveDate` — a backfill of
	 * an old, already-past daily note rather than today's real activity. */
	isBackdatedEdit: boolean;
	freezeTokensAvailable: number;
	freezeTokensRefillMonth: string;
	streak: number;
	lastActiveDate: string;
	freezeTokensUsed: number;
	isComeback: boolean;
	newBestStreak: boolean;
	bestStreak: number;
	newMilestones: number[];
}

/**
 * Pure core of the streak/freeze-token bookkeeping, kept separate from
 * `GamificationManager` so it's directly unit-testable without mocking the
 * Obsidian API. Refills freeze tokens against the real calendar month, then
 * — unless this is a backdated (backfilled) edit, in which case the streak
 * is left untouched entirely — advances the streak (bridging a gap with
 * freeze tokens/rest days if possible), tracks the best-ever streak, and
 * grants any newly-reached freeze-token milestones.
 */
export function resolveStreakAdvance(input: StreakAdvanceInput): StreakAdvanceOutput {
	const { tokens, refillMonth } = refillFreezeTokens(input.freezeTokensAvailable, input.freezeTokensRefillMonth, input.today);

	const isBackdatedEdit = input.previousActiveDate !== null && input.activeDate < input.previousActiveDate;
	if (isBackdatedEdit) {
		return {
			isBackdatedEdit: true,
			freezeTokensAvailable: tokens,
			freezeTokensRefillMonth: refillMonth,
			streak: input.currentStreak,
			lastActiveDate: input.previousActiveDate as string,
			freezeTokensUsed: 0,
			isComeback: false,
			newBestStreak: false,
			bestStreak: input.bestStreak,
			newMilestones: [],
		};
	}

	const restDays = input.restDayOfWeek < 0 ? [] : [input.restDayOfWeek];
	const { streak, freezeTokensUsed } = nextStreakWithFreeze(
		input.previousActiveDate,
		input.currentStreak,
		input.activeDate,
		tokens,
		restDays
	);

	// A "comeback": the streak genuinely reset (not bridged by a freeze token
	// or rest day) after having been meaningfully underway. Worth a softer
	// message than silence.
	const isComeback = streak === 1 && freezeTokensUsed === 0 && input.currentStreak > 1;
	const newBestStreak = streak > input.bestStreak;
	const newMilestones = checkNewlyReachedFreezeMilestones(streak, input.freezeMilestonesGranted);

	return {
		isBackdatedEdit: false,
		freezeTokensAvailable: tokens - freezeTokensUsed + newMilestones.length,
		freezeTokensRefillMonth: refillMonth,
		streak,
		lastActiveDate: input.activeDate,
		freezeTokensUsed,
		isComeback,
		newBestStreak,
		bestStreak: newBestStreak ? streak : input.bestStreak,
		newMilestones,
	};
}
