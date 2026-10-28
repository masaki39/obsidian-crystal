export type RewardTier = 'normal' | 'bonus' | 'rare';

export interface Reward {
    xp: number;
    tier: RewardTier;
}

export interface LevelInfo {
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
}

const BASE_XP = 10;
const BONUS_XP = 20;
const RARE_XP = 50;
const RARE_CHANCE = 0.03;
const BONUS_CHANCE = 0.15;

/** XP required to advance from `level` to `level + 1`. */
function xpForLevel(level: number): number {
    return level * 100;
}

/**
 * Derive the current level and progress within it from total accumulated XP.
 */
export function calculateLevel(totalXP: number): LevelInfo {
    let level = 1;
    let consumed = 0;
    let needed = xpForLevel(level);
    while (totalXP - consumed >= needed) {
        consumed += needed;
        level += 1;
        needed = xpForLevel(level);
    }
    return { level, xpIntoLevel: totalXP - consumed, xpForNextLevel: needed };
}

/**
 * Roll a variable reward for a single completed task. `random` is injectable for tests.
 */
export function rollReward(random: () => number = Math.random): Reward {
    const roll = random();
    if (roll < RARE_CHANCE) {
        return { xp: RARE_XP, tier: 'rare' };
    }
    if (roll < RARE_CHANCE + BONUS_CHANCE) {
        return { xp: BONUS_XP, tier: 'bonus' };
    }
    return { xp: BASE_XP, tier: 'normal' };
}
