import {
	bestDayCharacters,
	bestWeekCharacters,
	charactersOn,
	getWeeklyCharSeries,
	hasReachedGoal,
	lifetimeCharactersWritten,
	sumCharactersInWindow,
	VaultStatsFile,
} from '../src/word-stats';

function statsFrom(history: Record<string, number>): VaultStatsFile {
	const entries = Object.fromEntries(
		Object.entries(history).map(([date, characters]) => [date, { characters }])
	);
	return { history: entries };
}

describe('charactersOn', () => {
	it('returns the recorded characters for a date', () => {
		expect(charactersOn(statsFrom({ '2026-08-13': 500 }), '2026-08-13')).toBe(500);
	});

	it('returns 0 for a date with no entry yet', () => {
		expect(charactersOn(statsFrom({}), '2026-08-13')).toBe(0);
	});
});

describe('lifetimeCharactersWritten', () => {
	it('sums characters across every recorded day', () => {
		const stats = statsFrom({ '2026-08-01': 300, '2026-08-02': 700, '2026-08-03': 0 });
		expect(lifetimeCharactersWritten(stats)).toBe(1000);
	});

	it('returns 0 for an empty history', () => {
		expect(lifetimeCharactersWritten(statsFrom({}))).toBe(0);
	});
});

describe('bestDayCharacters', () => {
	it('returns the single highest day across all history', () => {
		const stats = statsFrom({ '2026-08-01': 300, '2026-08-02': 1200, '2026-08-03': 900 });
		expect(bestDayCharacters(stats)).toBe(1200);
	});

	it('returns 0 for an empty history', () => {
		expect(bestDayCharacters(statsFrom({}))).toBe(0);
	});
});

describe('getWeeklyCharSeries', () => {
	it('returns 7 entries ending at endDate, filling gaps with 0', () => {
		const stats = statsFrom({ '2026-08-11': 150, '2026-08-13': 250 });
		const series = getWeeklyCharSeries(stats, '2026-08-13', 7);

		expect(series).toHaveLength(7);
		expect(series[0].date).toBe('2026-08-07');
		expect(series[6].date).toBe('2026-08-13');
		expect(series.find((d) => d.date === '2026-08-11')?.characters).toBe(150);
		expect(series.find((d) => d.date === '2026-08-08')?.characters).toBe(0);
	});
});

describe('sumCharactersInWindow', () => {
	it('sums characters over the default 7-day window including the end date', () => {
		const stats = statsFrom({ '2026-08-07': 100, '2026-08-11': 50, '2026-08-13': 200, '2026-08-14': 1000 });
		// 2026-08-14 is outside the 7-day window ending 2026-08-13.
		expect(sumCharactersInWindow(stats, '2026-08-13')).toBe(350);
	});
});

describe('bestWeekCharacters', () => {
	it('finds the highest rolling 7-day sum across all recorded history, not just the latest window', () => {
		// A big burst early on (08-01..08-03) should be found even though the
		// query is effectively "as of the most recent data".
		const stats = statsFrom({
			'2026-08-01': 1000,
			'2026-08-02': 1000,
			'2026-08-03': 1000,
			'2026-08-10': 10,
			'2026-08-11': 10,
		});
		expect(bestWeekCharacters(stats)).toBe(3000);
	});

	it('returns 0 for an empty history', () => {
		expect(bestWeekCharacters(statsFrom({}))).toBe(0);
	});
});

describe('hasReachedGoal', () => {
	it('is true once characters meet or exceed the goal', () => {
		expect(hasReachedGoal(1000, 1000)).toBe(true);
		expect(hasReachedGoal(1500, 1000)).toBe(true);
	});

	it('is false when under the goal', () => {
		expect(hasReachedGoal(999, 1000)).toBe(false);
	});

	it('is always false when the goal is 0 (disabled)', () => {
		expect(hasReachedGoal(999999, 0)).toBe(false);
	});

	it('composes with charactersOn to check a specific day against a goal', () => {
		const stats = statsFrom({ '2026-08-13': 1000 });
		expect(hasReachedGoal(charactersOn(stats, '2026-08-13'), 1000)).toBe(true);
		expect(hasReachedGoal(charactersOn(stats, '2026-08-14'), 1000)).toBe(false);
	});
});
