import { App, Setting } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { calculateLevel } from '../../features/gamification/rules/level';
import { defaultVaultStatsPath, hasVaultStatsFile, lifetimeCharactersWritten, readVaultStats } from '../../features/gamification/word-stats';
import { promptForConfirmation } from '../../shared/ui/confirm-modal';
import { sectionHeading, toggleSetting } from '../components';

export function renderGamificationSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost, redisplay: () => void) {
	sectionHeading(containerEl, 'Gamification', 'gamepad-2');

	toggleSetting(containerEl, plugin, 'Enable Gamification', 'Earn XP (with occasional bonus rewards), levels, streaks and badges for completing tasks in daily notes. Open the Gamification view (ribbon icon, or the command palette) to see full details', 'gamificationEnabled');

	new Setting(containerEl)
		.setName('Rest day')
		.setDesc('A weekly day off: missing tasks on this day never breaks your streak and never costs a freeze token. Applies going forward only.')
		.addDropdown(dropdown => dropdown
			.addOption('-1', 'None')
			.addOption('0', 'Sunday')
			.addOption('1', 'Monday')
			.addOption('2', 'Tuesday')
			.addOption('3', 'Wednesday')
			.addOption('4', 'Thursday')
			.addOption('5', 'Friday')
			.addOption('6', 'Saturday')
			.setValue(String(plugin.settings.gamificationRestDayOfWeek))
			.onChange(async (value) => {
				plugin.settings.gamificationRestDayOfWeek = parseInt(value, 10);
				await plugin.saveSettings();
			}));

	// Writing-goal setting depends on the optional Better Word Count
	// plugin's stats file; only show it once we've confirmed it exists,
	// so users without that plugin never see a setting they can't use.
	const charGoalContainer = containerEl.createDiv();
	renderCharGoalSetting(charGoalContainer, app, plugin);

	new Setting(containerEl)
		.setName('Reset progress')
		.setDesc(`Lv.${calculateLevel(plugin.settings.gamificationTotalXP).level} · ${plugin.settings.gamificationTotalXP} XP · ${plugin.settings.gamificationStreak}d streak · ${plugin.settings.gamificationFreezeTokensAvailable} freeze · ${plugin.settings.gamificationUnlockedBadges.length} badges`)
		.addButton(button => button
			.setButtonText('Reset')
			.setWarning()
			.onClick(async () => {
				const confirmed = await promptForConfirmation(
					app,
					'進捗をリセットしますか？',
					'レベル・XP・連続日数・フリーズトークン・バッジ・記録をすべて削除します。この操作は取り消せません。',
					'リセット'
				);
				if (!confirmed) return;
				plugin.settings.gamificationTotalXP = 0;
				plugin.settings.gamificationStreak = 0;
				plugin.settings.gamificationLastActiveDate = '';
				plugin.settings.gamificationFreezeTokensAvailable = 2;
				plugin.settings.gamificationFreezeTokensRefillMonth = '';
				plugin.settings.gamificationUnlockedBadges = [];
				plugin.settings.gamificationTotalTasksCompleted = 0;
				plugin.settings.gamificationStartDate = '';
				plugin.settings.gamificationDailyXPLog = {};
				plugin.settings.gamificationFreezeTokenLog = [];
				plugin.settings.gamificationBestStreak = 0;
				plugin.settings.gamificationBestDayTasks = 0;
				plugin.settings.gamificationBestWeekXP = 0;
				plugin.settings.gamificationDailyTaskLog = {};
				plugin.settings.gamificationFreezeMilestonesGranted = [];
				// Deliberately NOT clearing gamificationCharGoalLastAchievedDate /
				// gamificationCharMilestonesDate / gamificationCharMilestonesReached:
				// they just record today's actual writing progress (day-scoped,
				// self-correcting at the next date rollover), not "lifetime
				// progress" to take back. Clearing them here used to create a
				// false "not achieved today" state that the very save this button
				// triggers would immediately correct — re-detecting today's
				// already-met goal as newly met and re-granting its reward
				// moments after the "clean slate" this dialog just promised.
				// The optional Better Word Count integration's lifetime
				// character count lives in that plugin's own external stats
				// file, which can't be reset from here — without capturing
				// this baseline, the chars-based badges just cleared above
				// would instantly re-unlock on the very next writing tick,
				// breaking the "clean slate" this reset just promised.
				//
				// If the read fails (e.g. Better Word Count is mid-write and
				// the file doesn't parse), leave the baseline exactly as it
				// was rather than defaulting it to 0: a baseline of 0 is
				// *lower* than the user's actual lifetime chars, so the next
				// successful read would treat their entire writing history as
				// newly eligible and instantly re-unlock every chars badge —
				// the opposite of what this reset promised. Leaving the old
				// baseline in place is a safe no-op for this one metric
				// instead.
				const stats = await readVaultStats(app, defaultVaultStatsPath(app));
				if (stats) {
					plugin.settings.gamificationCharsBadgeBaseline = lifetimeCharactersWritten(stats);
				}
				await plugin.saveSettings();
				redisplay();
			}));
}

/**
 * Shown only when the Better Word Count plugin's stats file is found
 * (`.obsidian/vault-stats.json` with "Collect Stats" enabled) — an
 * optional integration, so users without it never see a setting for a
 * feature that can't do anything for them.
 */
function renderCharGoalSetting(container: HTMLElement, app: App, plugin: CrystalPluginHost) {
	hasVaultStatsFile(app).then((available) => {
		if (!available) return;
		container.empty();
		new Setting(container)
			.setName('Daily writing goal (characters)')
			.setDesc('Reaching this many characters written in a day (from Better Word Count\'s stats) earns bonus XP and counts as an active day for your streak, alongside completing tasks. Set to 0 to disable.')
			.addText(text => text
				.setPlaceholder('1000')
				.setValue(String(plugin.settings.gamificationDailyCharGoal))
				.onChange(async (value) => {
					const parsed = parseInt(value, 10);
					plugin.settings.gamificationDailyCharGoal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
					await plugin.saveSettings();
				}));
	});
}
