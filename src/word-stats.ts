import { App } from 'obsidian';

// Optional integration with the "Better Word Count" community plugin: when its
// "Collect Stats" option is on, it writes a running per-day word/character
// history to a JSON file (default `.obsidian/vault-stats.json`). This module
// reads that file and derives a few gamification-friendly numbers from it.
// Everything here degrades to "unavailable" (null / empty / 0) rather than
// throwing, since the other plugin may not be installed or may have stats
// collection turned off — this integration must never be a hard dependency.

/** One day's entry in Better Word Count's stats history. Only the fields this
 * module actually reads are declared; the file has more (words, sentences,
 * pages, ...) that we intentionally ignore. */
export interface VaultStatsDay {
    /** Net characters added that day, summed per-file and clamped at 0 per
     * file (deletions never push it negative) — see Better Word Count's own
     * `StatsManager.change()`. A reliable "wrote today" signal. */
    characters: number;
}

export interface VaultStatsFile {
    history: Record<string, VaultStatsDay>;
}

/** Default path Better Word Count writes its stats to (its own default setting). */
export function defaultVaultStatsPath(app: App): string {
    return `${app.vault.configDir}/vault-stats.json`;
}

/**
 * Read and parse the Better Word Count stats file, if present. Returns null
 * when the file doesn't exist or isn't shaped as expected — callers treat
 * that as "the integration isn't available" and hide the feature entirely
 * rather than erroring, since Better Word Count is an optional plugin.
 */
export async function readVaultStats(app: App, path: string): Promise<VaultStatsFile | null> {
    try {
        const exists = await app.vault.adapter.exists(path);
        if (!exists) return null;
        const raw = await app.vault.adapter.read(path);
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || typeof parsed.history !== 'object' || parsed.history === null) {
            return null;
        }
        return parsed as VaultStatsFile;
    } catch {
        return null;
    }
}

/** Cheap existence check, used by the settings UI to decide whether to show
 * the writing-goal setting at all (no need to parse the file for that). */
export async function hasVaultStatsFile(app: App, path?: string): Promise<boolean> {
    return app.vault.adapter.exists(path ?? defaultVaultStatsPath(app));
}

/** Characters newly written on `date` (0 if that day has no entry yet, e.g. nothing written yet today). */
export function charactersOn(stats: VaultStatsFile, date: string): number {
    return stats.history[date]?.characters ?? 0;
}

/** Sum of characters written across every recorded day — unlike the file's
 * own `totalCharacters` (the vault's *current* size, which can shrink), this
 * only ever grows, so it's safe to use for lifetime milestone badges. */
export function lifetimeCharactersWritten(stats: VaultStatsFile): number {
    return Object.values(stats.history).reduce((sum, day) => sum + (day.characters ?? 0), 0);
}

/** The single best day's character count across all recorded history. */
export function bestDayCharacters(stats: VaultStatsFile): number {
    return Object.values(stats.history).reduce((max, day) => Math.max(max, day.characters ?? 0), 0);
}

export interface DailyChars {
    date: string;
    characters: number;
}

/** Build a fixed-length series of the last `days` days ending at `endDate`, filling gaps with 0. */
export function getWeeklyCharSeries(stats: VaultStatsFile, endDate: string, days = 7): DailyChars[] {
    const msPerDay = 24 * 60 * 60 * 1000;
    const end = new Date(`${endDate}T00:00:00Z`).getTime();
    const series: DailyChars[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(end - i * msPerDay).toISOString().slice(0, 10);
        series.push({ date, characters: charactersOn(stats, date) });
    }
    return series;
}

/** Sum of characters over the `days` days ending at `endDate`. */
export function sumCharactersInWindow(stats: VaultStatsFile, endDate: string, days = 7): number {
    return getWeeklyCharSeries(stats, endDate, days).reduce((sum, day) => sum + day.characters, 0);
}

/** Highest rolling `days`-day character sum across all recorded history (not
 * just the most recent window) — the all-time "best week" personal record. */
export function bestWeekCharacters(stats: VaultStatsFile, days = 7): number {
    let best = 0;
    for (const date of Object.keys(stats.history)) {
        best = Math.max(best, sumCharactersInWindow(stats, date, days));
    }
    return best;
}

/** True once `current` characters have reached `goal` (a `goal` of 0 disables the check). */
export function hasReachedGoal(current: number, goal: number): boolean {
    return goal > 0 && current >= goal;
}
