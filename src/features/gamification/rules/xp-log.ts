import { daysBetween } from './streak';

export interface DailyXP {
	date: string;
	xp: number;
}

/**
 * Keep only entries within `keepDays` of `referenceDate` (inclusive), so the
 * log doesn't grow forever.
 */
export function pruneDailyXPLog(
	log: Record<string, number>,
	referenceDate: string,
	keepDays = 30
): Record<string, number> {
	const pruned: Record<string, number> = {};
	for (const [date, xp] of Object.entries(log)) {
		const gap = daysBetween(date, referenceDate);
		if (gap >= 0 && gap <= keepDays) {
			pruned[date] = xp;
		}
	}
	return pruned;
}

/** Build a fixed-length series of the last `days` days ending at `endDate`, filling gaps with 0. */
export function getWeeklyXPSeries(log: Record<string, number>, endDate: string, days = 7): DailyXP[] {
	const msPerDay = 24 * 60 * 60 * 1000;
	const end = new Date(`${endDate}T00:00:00Z`).getTime();
	const series: DailyXP[] = [];
	for (let i = days - 1; i >= 0; i--) {
		const date = new Date(end - i * msPerDay).toISOString().slice(0, 10);
		series.push({ date, xp: log[date] ?? 0 });
	}
	return series;
}

/** Sum of XP over the last `days` days ending at `endDate` — used for the "best week" personal record. */
export function sumRecentXP(log: Record<string, number>, endDate: string, days = 7): number {
	return getWeeklyXPSeries(log, endDate, days).reduce((sum, day) => sum + day.xp, 0);
}
