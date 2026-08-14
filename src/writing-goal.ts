import { hasReachedGoal } from './word-stats';

// Pure gamification logic for the optional Better Word Count writing-goal
// integration: mid-goal milestone bonuses, and the same-tick decision core
// GamificationManager.refreshWordStats (gamification.ts) drives itself from.
// Kept separate from gamification.ts (already a large file covering XP,
// levels, streaks and badges) since this cluster is self-contained — no
// Obsidian API, no GamificationManager state.

/**
 * Fractions of the daily writing goal (optional Better Word Count
 * integration) that grant a small chance of a bonus while still writing —
 * the goal-gradient effect (motivation rises as a goal nears) says a single
 * payoff at 100% leaves the middle of the effort feeling empty; scattering a
 * few low-stakes maybe-a-reward moments along the way keeps the *act of
 * writing itself* intermittently reinforced, not just crossing the finish line.
 */
export const CHAR_GOAL_MILESTONES = [0.25, 0.5, 0.75];
const CHAR_MILESTONE_BONUS_XP = 5;
const CHAR_MILESTONE_BONUS_CHANCE = 0.4;

/**
 * Milestone fractions in `CHAR_GOAL_MILESTONES` that `current/goal` has newly
 * crossed and aren't already in `reachedFractions` — call once per stats
 * update and push the result into that list so each milestone only fires once
 * per day. Returns [] when `goal` is 0 (writing-goal feature disabled).
 */
export function checkNewlyReachedCharMilestones(current: number, goal: number, reachedFractions: number[]): number[] {
    if (goal <= 0) return [];
    return CHAR_GOAL_MILESTONES.filter((fraction) => current >= goal * fraction && !reachedFractions.includes(fraction));
}

/**
 * Roll whether a newly-reached milestone grants its small bonus. A chance
 * rather than a guarantee, so — like `rollReward` — the mid-goal breadcrumbs
 * stay a small surprise instead of a predictable trickle. `random` is
 * injectable for tests.
 */
export function rollCharMilestoneBonus(random: () => number = Math.random): number {
    return random() < CHAR_MILESTONE_BONUS_CHANCE ? CHAR_MILESTONE_BONUS_XP : 0;
}

export interface WordStatsTickInput {
    charsToday: number;
    goal: number;
    /** Milestone fractions already recorded as reached today. */
    milestonesReached: number[];
    /** Whether the daily writing goal was already granted its reward today. */
    goalAlreadyAchievedToday: boolean;
}

export interface WordStatsTickResult {
    newMilestones: number[];
    /** Whether the daily goal is newly met this tick and should grant its reward. */
    goalReached: boolean;
}

/**
 * Pure decision core for a single writing-stats update (see
 * `GamificationManager.refreshWordStats`): which mid-goal milestones were
 * newly crossed, and whether the daily goal itself was newly reached.
 *
 * Both can be true from the *same* stats read — e.g. pasting a large block
 * of text can jump `charsToday` straight past 75% and past the goal in one
 * update — so callers must not treat these as mutually exclusive branches.
 * Doing so previously caused the goal's reward (streak extension, level/badge
 * checks) to be skipped whenever it coincided with a milestone crossing,
 * silently deferring it to a future edit that might never come that day.
 */
export function resolveWordStatsTick(input: WordStatsTickInput): WordStatsTickResult {
    // checkNewlyReachedCharMilestones and hasReachedGoal both already treat
    // goal <= 0 as "disabled" internally — no need to re-guard it here too.
    const newMilestones = checkNewlyReachedCharMilestones(input.charsToday, input.goal, input.milestonesReached);
    const goalReached = !input.goalAlreadyAchievedToday && hasReachedGoal(input.charsToday, input.goal);
    return { newMilestones, goalReached };
}
