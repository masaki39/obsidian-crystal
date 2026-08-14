import {
	checkNewlyReachedCharMilestones,
	resolveWordStatsTick,
	rollCharMilestoneBonus,
} from '../src/writing-goal';

describe('checkNewlyReachedCharMilestones', () => {
	it('returns milestones newly crossed by current/goal', () => {
		expect(checkNewlyReachedCharMilestones(250, 1000, [])).toEqual([0.25]);
		expect(checkNewlyReachedCharMilestones(600, 1000, [])).toEqual([0.25, 0.5]);
	});

	it('excludes milestones already recorded as reached', () => {
		expect(checkNewlyReachedCharMilestones(600, 1000, [0.25])).toEqual([0.5]);
	});

	it('can return multiple milestones at once for a big jump (e.g. pasted text)', () => {
		expect(checkNewlyReachedCharMilestones(999, 1000, [])).toEqual([0.25, 0.5, 0.75]);
	});

	it('returns nothing below the first milestone', () => {
		expect(checkNewlyReachedCharMilestones(100, 1000, [])).toEqual([]);
	});

	it('returns nothing when the goal is 0 (disabled)', () => {
		expect(checkNewlyReachedCharMilestones(999999, 0, [])).toEqual([]);
	});
});

describe('rollCharMilestoneBonus', () => {
	it('grants the bonus on a low roll', () => {
		expect(rollCharMilestoneBonus(() => 0)).toBe(5);
	});

	it('grants nothing on a high roll', () => {
		expect(rollCharMilestoneBonus(() => 0.99)).toBe(0);
	});
});

describe('resolveWordStatsTick', () => {
	it('reports only newly crossed milestones on a routine mid-goal tick', () => {
		const result = resolveWordStatsTick({
			charsToday: 300,
			goal: 1000,
			milestonesReached: [],
			goalAlreadyAchievedToday: false,
		});
		expect(result).toEqual({ newMilestones: [0.25], goalReached: false });
	});

	it('reports the goal as reached once charsToday clears it and it was not already granted today', () => {
		const result = resolveWordStatsTick({
			charsToday: 1000,
			goal: 1000,
			milestonesReached: [0.25, 0.5, 0.75],
			goalAlreadyAchievedToday: false,
		});
		expect(result).toEqual({ newMilestones: [], goalReached: true });
	});

	it('reports both a newly crossed milestone and the goal when a single big jump (e.g. pasted text) clears both at once', () => {
		// Regression test: a single stats update that jumps straight from 0
		// chars to past the goal used to grant only the milestone bonus and
		// skip the goal's reward (streak extension, level/badge checks)
		// entirely for that update.
		const result = resolveWordStatsTick({
			charsToday: 1200,
			goal: 1000,
			milestonesReached: [],
			goalAlreadyAchievedToday: false,
		});
		expect(result.newMilestones).toEqual([0.25, 0.5, 0.75]);
		expect(result.goalReached).toBe(true);
	});

	it('does not re-report the goal once already achieved today', () => {
		const result = resolveWordStatsTick({
			charsToday: 1500,
			goal: 1000,
			milestonesReached: [0.25, 0.5, 0.75],
			goalAlreadyAchievedToday: true,
		});
		expect(result).toEqual({ newMilestones: [], goalReached: false });
	});

	it('reports nothing when the goal is 0 (disabled)', () => {
		const result = resolveWordStatsTick({
			charsToday: 99999,
			goal: 0,
			milestonesReached: [],
			goalAlreadyAchievedToday: false,
		});
		expect(result).toEqual({ newMilestones: [], goalReached: false });
	});
});
