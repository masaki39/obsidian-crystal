import {
	ALL_BADGES,
	calculateLevel,
	checkNewlyReachedFreezeMilestones,
	checkNewlySpecialUnlocks,
	checkNewlyUnlockedBadges,
	countCompletedTasks,
	countNonRestMissedDays,
	countTotalTasks,
	findNearestBadgeTarget,
	getWeeklyXPSeries,
	nextStreak,
	nextStreakWithFreeze,
	pruneDailyXPLog,
	refillFreezeTokens,
	resolveStreakAdvance,
	rollReward,
	SPECIAL_BADGE_IDS,
	sumRecentXP,
	titleForLevel,
} from '../src/gamification';

describe('countCompletedTasks', () => {
	it('counts checked tasks and ignores unchecked ones', () => {
		const content = [
			'- [ ] not done',
			'- [x] done one',
			'  - [X] nested, uppercase X',
			'* [x] asterisk bullet',
			'1. [x] ordered list',
			'not a task line [x]',
		].join('\n');

		expect(countCompletedTasks(content)).toBe(4);
	});

	it('returns 0 for content with no tasks', () => {
		expect(countCompletedTasks('just some text\n- a bullet, no checkbox')).toBe(0);
	});

	it('ignores checkbox-looking lines inside a fenced code block', () => {
		const content = [
			'- [x] a real completed task',
			'```',
			'- [x] this is just an example in a code sample',
			'- [x] so is this one',
			'```',
			'- [x] another real task',
		].join('\n');

		expect(countCompletedTasks(content)).toBe(2);
	});

	it('ignores checkbox-looking lines inside a ~~~ fenced code block', () => {
		const content = ['~~~', '- [x] not a real task', '~~~', '- [x] real task'].join('\n');

		expect(countCompletedTasks(content)).toBe(1);
	});
});

describe('countTotalTasks', () => {
	it('counts every checkbox task regardless of its state', () => {
		const content = [
			'- [ ] not done',
			'- [x] done one',
			'  - [X] nested, uppercase X',
			'- [/] in progress (Tasks plugin style)',
			'* [x] asterisk bullet',
			'not a task line [x]',
		].join('\n');

		expect(countTotalTasks(content)).toBe(5);
	});

	it('returns 0 for content with no tasks', () => {
		expect(countTotalTasks('just some text\n- a bullet, no checkbox')).toBe(0);
	});

	it('ignores checkbox-looking lines inside a fenced code block', () => {
		const content = ['- [ ] a real task', '```', '- [ ] example syntax only', '```'].join('\n');

		expect(countTotalTasks(content)).toBe(1);
	});
});

describe('calculateLevel', () => {
	it('starts at level 1 with 0 XP', () => {
		expect(calculateLevel(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 });
	});

	it('accumulates XP within a level', () => {
		expect(calculateLevel(50)).toEqual({ level: 1, xpIntoLevel: 50, xpForNextLevel: 100 });
	});

	it('levels up once enough XP is earned (level 1 needs 100 XP)', () => {
		expect(calculateLevel(100)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 200 });
	});

	it('levels up multiple times from a large XP total', () => {
		// Level 1->2 costs 100, level 2->3 costs 200: 100 + 200 = 300 to reach level 3
		expect(calculateLevel(300)).toEqual({ level: 3, xpIntoLevel: 0, xpForNextLevel: 300 });
		expect(calculateLevel(350)).toEqual({ level: 3, xpIntoLevel: 50, xpForNextLevel: 300 });
	});
});

describe('rollReward', () => {
	it('returns the rare reward for the lowest rolls', () => {
		expect(rollReward(() => 0)).toEqual({ xp: 50, tier: 'rare' });
		expect(rollReward(() => 0.02)).toEqual({ xp: 50, tier: 'rare' });
	});

	it('returns the bonus reward for mid-range rolls', () => {
		expect(rollReward(() => 0.03)).toEqual({ xp: 20, tier: 'bonus' });
		expect(rollReward(() => 0.17)).toEqual({ xp: 20, tier: 'bonus' });
	});

	it('returns the normal reward for the remaining rolls', () => {
		expect(rollReward(() => 0.18)).toEqual({ xp: 10, tier: 'normal' });
		expect(rollReward(() => 0.999)).toEqual({ xp: 10, tier: 'normal' });
	});
});

describe('nextStreak', () => {
	it('starts a new streak at 1 on first ever completion', () => {
		expect(nextStreak(null, 0, '2026-08-13')).toBe(1);
	});

	it('keeps the streak unchanged for a second completion on the same day', () => {
		expect(nextStreak('2026-08-13', 3, '2026-08-13')).toBe(3);
	});

	it('extends the streak when the active date is exactly one day later', () => {
		expect(nextStreak('2026-08-12', 3, '2026-08-13')).toBe(4);
	});

	it('resets the streak to 1 when a day was missed', () => {
		expect(nextStreak('2026-08-10', 5, '2026-08-13')).toBe(1);
	});

	it('resets the streak to 1 when the active date precedes the previous date', () => {
		expect(nextStreak('2026-08-13', 5, '2026-08-12')).toBe(1);
	});
});

describe('nextStreakWithFreeze', () => {
	it('starts a new streak at 1 on first ever completion', () => {
		expect(nextStreakWithFreeze(null, 0, '2026-08-13', 2)).toEqual({ streak: 1, freezeTokensUsed: 0 });
	});

	it('keeps the streak unchanged for a second completion on the same day', () => {
		expect(nextStreakWithFreeze('2026-08-13', 3, '2026-08-13', 2)).toEqual({ streak: 3, freezeTokensUsed: 0 });
	});

	it('extends the streak for a normal one-day gap without spending tokens', () => {
		expect(nextStreakWithFreeze('2026-08-12', 3, '2026-08-13', 2)).toEqual({ streak: 4, freezeTokensUsed: 0 });
	});

	it('bridges a one-day gap using a freeze token when available', () => {
		// missed 2026-08-13, resumes on 2026-08-14 -> 1 missed day
		expect(nextStreakWithFreeze('2026-08-12', 5, '2026-08-14', 2)).toEqual({ streak: 6, freezeTokensUsed: 1 });
	});

	it('bridges a multi-day gap if enough freeze tokens are available', () => {
		// missed 08-13 and 08-14 -> 2 missed days
		expect(nextStreakWithFreeze('2026-08-12', 5, '2026-08-15', 2)).toEqual({ streak: 6, freezeTokensUsed: 2 });
	});

	it('resets the streak to 1 when the gap exceeds available freeze tokens', () => {
		expect(nextStreakWithFreeze('2026-08-12', 5, '2026-08-15', 1)).toEqual({ streak: 1, freezeTokensUsed: 0 });
	});

	it('resets the streak to 1 with zero freeze tokens and any gap', () => {
		expect(nextStreakWithFreeze('2026-08-10', 5, '2026-08-13', 0)).toEqual({ streak: 1, freezeTokensUsed: 0 });
	});

	it('extends the streak without spending a token when the only missed day is a configured rest day', () => {
		// 2026-08-15 is a Saturday. Missed 08-14 (Fri) -> completed 08-13 (Thu), resume 08-15 (Sat)... use a case
		// where the single missed day in between is the rest day itself.
		// previous=2026-08-13 (Thu), active=2026-08-15 (Sat): missed day is 08-14 (Fri, day 5).
		expect(nextStreakWithFreeze('2026-08-13', 5, '2026-08-15', 0, [5])).toEqual({ streak: 6, freezeTokensUsed: 0 });
	});

	it('still spends a token for a missed day that is not the configured rest day', () => {
		expect(nextStreakWithFreeze('2026-08-13', 5, '2026-08-15', 1, [0])).toEqual({ streak: 6, freezeTokensUsed: 1 });
	});

	it('resets the streak when a non-rest missed day exceeds available tokens, even with a rest day configured', () => {
		expect(nextStreakWithFreeze('2026-08-13', 5, '2026-08-15', 0, [0])).toEqual({ streak: 1, freezeTokensUsed: 0 });
	});
});

describe('countNonRestMissedDays', () => {
	it('excludes the configured rest day(s) from the missed-day count', () => {
		// Days strictly between 08-13 and 08-16: 08-14 (Fri=5), 08-15 (Sat=6)
		expect(countNonRestMissedDays('2026-08-13', '2026-08-16', [5, 6])).toBe(0);
		expect(countNonRestMissedDays('2026-08-13', '2026-08-16', [6])).toBe(1);
		expect(countNonRestMissedDays('2026-08-13', '2026-08-16', [])).toBe(2);
	});
});

describe('refillFreezeTokens', () => {
	it('refills to the default amount on first use (no prior refill month)', () => {
		expect(refillFreezeTokens(0, '', '2026-08-13')).toEqual({ tokens: 2, refillMonth: '2026-08' });
	});

	it('leaves tokens untouched within the same month', () => {
		expect(refillFreezeTokens(1, '2026-08', '2026-08-20')).toEqual({ tokens: 1, refillMonth: '2026-08' });
	});

	it('refills (not accumulates) when the month changes', () => {
		expect(refillFreezeTokens(0, '2026-07', '2026-08-01')).toEqual({ tokens: 2, refillMonth: '2026-08' });
		expect(refillFreezeTokens(2, '2026-07', '2026-08-01')).toEqual({ tokens: 2, refillMonth: '2026-08' });
	});

	it('respects a custom tokensPerMonth', () => {
		expect(refillFreezeTokens(0, '2026-07', '2026-08-01', 3)).toEqual({ tokens: 3, refillMonth: '2026-08' });
	});
});

describe('checkNewlyUnlockedBadges', () => {
	it('returns no badges when nothing meets its threshold', () => {
		expect(checkNewlyUnlockedBadges({ level: 1, streak: 0, totalXP: 0 }, [])).toEqual([]);
	});

	it('returns badges whose thresholds are newly met', () => {
		const unlocked = checkNewlyUnlockedBadges({ level: 5, streak: 3, totalXP: 1000 }, []);
		const ids = unlocked.map((b) => b.id);
		expect(ids).toContain('level-5');
		expect(ids).toContain('streak-3');
	});

	it('excludes badges already recorded as unlocked', () => {
		const unlocked = checkNewlyUnlockedBadges({ level: 5, streak: 3, totalXP: 1000 }, ['level-5']);
		const ids = unlocked.map((b) => b.id);
		expect(ids).not.toContain('level-5');
		expect(ids).toContain('streak-3');
	});

	it('every badge id in ALL_BADGES is unique', () => {
		const ids = ALL_BADGES.map((b) => b.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('findNearestBadgeTarget', () => {
	it('returns null when every badge is already unlocked', () => {
		const allIds = ALL_BADGES.map((b) => b.id);
		expect(findNearestBadgeTarget({ level: 999, streak: 999 }, allIds)).toBeNull();
	});

	it('picks the badge with the smallest remaining distance', () => {
		// level 4 -> level-5 badge is 1 away; streak 0 -> streak-3 badge is 3 away
		const result = findNearestBadgeTarget({ level: 4, streak: 0 }, []);
		expect(result).toEqual({ badge: expect.objectContaining({ id: 'level-5' }), remaining: 1, metric: 'level' });
	});

	it('ignores badges that are already unlocked even if numerically closest', () => {
		const result = findNearestBadgeTarget({ level: 4, streak: 0 }, ['level-5']);
		expect(result?.badge.id).not.toBe('level-5');
	});

	it('breaks ties using badge list order', () => {
		// level 9 -> level-10 is 1 away; streak 2 -> streak-3 is 1 away. level-10 comes first in ALL_BADGES.
		const result = findNearestBadgeTarget({ level: 9, streak: 2 }, []);
		expect(result?.badge.id).toBe('level-10');
	});
});

describe('pruneDailyXPLog', () => {
	it('keeps entries within keepDays of the reference date', () => {
		const log = { '2026-08-01': 10, '2026-08-10': 20, '2026-08-13': 30 };
		expect(pruneDailyXPLog(log, '2026-08-13', 5)).toEqual({ '2026-08-10': 20, '2026-08-13': 30 });
	});

	it('drops entries from the future relative to the reference date', () => {
		const log = { '2026-08-20': 10 };
		expect(pruneDailyXPLog(log, '2026-08-13', 30)).toEqual({});
	});

	it('keeps everything within the default 30-day window', () => {
		const log = { '2026-08-01': 10, '2026-08-13': 20 };
		expect(pruneDailyXPLog(log, '2026-08-13')).toEqual(log);
	});
});

describe('getWeeklyXPSeries', () => {
	it('returns 7 entries ending at endDate, filling gaps with 0', () => {
		const log = { '2026-08-11': 15, '2026-08-13': 25 };
		const series = getWeeklyXPSeries(log, '2026-08-13', 7);

		expect(series).toHaveLength(7);
		expect(series[0].date).toBe('2026-08-07');
		expect(series[6].date).toBe('2026-08-13');
		expect(series.find((d) => d.date === '2026-08-11')?.xp).toBe(15);
		expect(series.find((d) => d.date === '2026-08-13')?.xp).toBe(25);
		expect(series.find((d) => d.date === '2026-08-08')?.xp).toBe(0);
	});

	it('respects a custom number of days', () => {
		const series = getWeeklyXPSeries({}, '2026-08-13', 3);
		expect(series.map((d) => d.date)).toEqual(['2026-08-11', '2026-08-12', '2026-08-13']);
	});
});

describe('sumRecentXP', () => {
	it('sums XP over the default 7-day window including the end date', () => {
		const log = { '2026-08-07': 10, '2026-08-11': 5, '2026-08-13': 20, '2026-08-14': 100 };
		// 2026-08-14 is outside the 7-day window ending 2026-08-13, so it must be excluded.
		expect(sumRecentXP(log, '2026-08-13')).toBe(35);
	});

	it('returns 0 for an empty log', () => {
		expect(sumRecentXP({}, '2026-08-13')).toBe(0);
	});
});

describe('checkNewlyReachedFreezeMilestones', () => {
	it('returns milestones newly reached and not yet granted', () => {
		expect(checkNewlyReachedFreezeMilestones(30, [])).toEqual([30]);
	});

	it('returns multiple milestones if several are crossed at once', () => {
		expect(checkNewlyReachedFreezeMilestones(100, [])).toEqual([30, 100]);
	});

	it('excludes milestones already granted', () => {
		expect(checkNewlyReachedFreezeMilestones(100, [30])).toEqual([100]);
	});

	it('returns nothing below the first milestone', () => {
		expect(checkNewlyReachedFreezeMilestones(29, [])).toEqual([]);
	});
});

describe('checkNewlySpecialUnlocks', () => {
	it('unlocks the night-owl badge for a completion between 0:00 and 4:59', () => {
		const unlocked = checkNewlySpecialUnlocks({ hour: 2, todayTaskCount: 1 }, []);
		expect(unlocked.map((b) => b.id)).toEqual([SPECIAL_BADGE_IDS.NIGHT_OWL]);
	});

	it('does not unlock the night-owl badge outside 0:00-4:59', () => {
		const unlocked = checkNewlySpecialUnlocks({ hour: 5, todayTaskCount: 1 }, []);
		expect(unlocked.map((b) => b.id)).not.toContain(SPECIAL_BADGE_IDS.NIGHT_OWL);
	});

	it('unlocks the ten-in-a-day badge once 10 tasks are completed in one day', () => {
		const unlocked = checkNewlySpecialUnlocks({ hour: 12, todayTaskCount: 10 }, []);
		expect(unlocked.map((b) => b.id)).toEqual([SPECIAL_BADGE_IDS.TEN_IN_A_DAY]);
	});

	it('can unlock both special badges at once', () => {
		const unlocked = checkNewlySpecialUnlocks({ hour: 1, todayTaskCount: 10 }, []);
		expect(unlocked.map((b) => b.id).sort()).toEqual(
			[SPECIAL_BADGE_IDS.NIGHT_OWL, SPECIAL_BADGE_IDS.TEN_IN_A_DAY].sort()
		);
	});

	it('excludes badges already unlocked', () => {
		const unlocked = checkNewlySpecialUnlocks({ hour: 2, todayTaskCount: 10 }, [SPECIAL_BADGE_IDS.NIGHT_OWL]);
		expect(unlocked.map((b) => b.id)).toEqual([SPECIAL_BADGE_IDS.TEN_IN_A_DAY]);
	});
});

describe('resolveStreakAdvance', () => {
	const baseInput = {
		activeDate: '2026-08-13',
		today: '2026-08-13',
		previousActiveDate: '2026-08-12',
		currentStreak: 3,
		freezeTokensAvailable: 2,
		freezeTokensRefillMonth: '2026-08',
		bestStreak: 3,
		freezeMilestonesGranted: [] as number[],
		restDayOfWeek: -1,
	};

	it('advances the streak normally for a same-day/consecutive-day completion', () => {
		const result = resolveStreakAdvance(baseInput);
		expect(result.isBackdatedEdit).toBe(false);
		expect(result.streak).toBe(4);
		expect(result.lastActiveDate).toBe('2026-08-13');
		expect(result.newBestStreak).toBe(true);
		expect(result.bestStreak).toBe(4);
	});

	it('never touches the streak or last-active date when backfilling an older daily note', () => {
		// Today's streak has already advanced to 2026-08-13; the user now goes back
		// and checks off a leftover task in a much older note (2026-08-01).
		const result = resolveStreakAdvance({
			...baseInput,
			activeDate: '2026-08-01',
			previousActiveDate: '2026-08-13',
			currentStreak: 5,
			bestStreak: 5,
		});

		expect(result.isBackdatedEdit).toBe(true);
		expect(result.streak).toBe(5);
		expect(result.lastActiveDate).toBe('2026-08-13');
		expect(result.freezeTokensUsed).toBe(0);
		expect(result.isComeback).toBe(false);
		expect(result.newBestStreak).toBe(false);
		expect(result.bestStreak).toBe(5);
	});

	it('does not spend or lose freeze tokens when backfilling an older daily note', () => {
		const result = resolveStreakAdvance({
			...baseInput,
			activeDate: '2026-08-01',
			previousActiveDate: '2026-08-13',
			freezeTokensAvailable: 2,
			freezeTokensRefillMonth: '2026-08',
		});

		expect(result.freezeTokensAvailable).toBe(2);
	});

	it('refills freeze tokens against the real "today", not the (possibly backdated) active date', () => {
		// First-ever completion, but it happens on a backfilled note dated in July
		// while it's actually August and tokens haven't been refilled since July.
		const result = resolveStreakAdvance({
			...baseInput,
			activeDate: '2026-07-01',
			today: '2026-08-13',
			previousActiveDate: null,
			currentStreak: 0,
			freezeTokensAvailable: 0,
			freezeTokensRefillMonth: '2026-07',
			bestStreak: 0,
		});

		// Refilled because "today" (2026-08) differs from the last refill month
		// (2026-07) — a bug would instead compare against the note's own month
		// (also 2026-07), see no change, and leave tokens at 0.
		expect(result.freezeTokensRefillMonth).toBe('2026-08');
		expect(result.freezeTokensAvailable).toBe(2);
	});

	it('bridges a gap using a rest day without spending a freeze token', () => {
		// The only missed day between 2026-08-13 (Thu) and 2026-08-15 (Sat) is
		// 2026-08-14 (Friday) — configuring Friday as the rest day means it
		// doesn't cost a token.
		const result = resolveStreakAdvance({
			...baseInput,
			activeDate: '2026-08-15',
			previousActiveDate: '2026-08-13',
			freezeTokensAvailable: 0,
			restDayOfWeek: 5,
		});

		expect(result.streak).toBe(4);
		expect(result.freezeTokensUsed).toBe(0);
	});
});

describe('titleForLevel', () => {
	it('returns "Beginner" below the first level-badge threshold', () => {
		expect(titleForLevel(1)).toBe('Beginner');
		expect(titleForLevel(4)).toBe('Beginner');
	});

	it('returns the matching level-badge name once its threshold is reached', () => {
		expect(titleForLevel(5)).toBe('Rookie');
		expect(titleForLevel(9)).toBe('Rookie');
		expect(titleForLevel(10)).toBe('Adept');
		expect(titleForLevel(50)).toBe('Legend');
		expect(titleForLevel(999)).toBe('Legend');
	});
});

describe('ALL_BADGES includes special badges', () => {
	it('marks special badges as hidden', () => {
		const nightOwl = ALL_BADGES.find((b) => b.id === SPECIAL_BADGE_IDS.NIGHT_OWL);
		expect(nightOwl?.hidden).toBe(true);
	});
});
