import { Plugin, Setting } from 'obsidian';
import type { CrystalPluginSettings, HackerEffectToggles } from './settings';
import type { HackerModeService } from './hacker-mode';
import { showRewardBanner } from './hacker-glitch';

type CrystalPlugin = Plugin & {
	settings: CrystalPluginSettings;
	saveSettings(): Promise<void>;
	hackerModeService?: HackerModeService;
};

const EFFECTS: Array<{ key: keyof HackerEffectToggles; name: string; desc: string }> = [
	{ key: 'crt', name: 'CRT overlay', desc: 'Scanlines, vignette and a faint flicker over the whole window.' },
	{ key: 'glow', name: 'Phosphor glow', desc: 'Accent-colored caret and a soft glow on editor text.' },
	{ key: 'typingParticles', name: 'Typing particles', desc: 'A few faint 0/1 glyphs at the caret on each keystroke, with a combo counter.' },
	{ key: 'boot', name: 'Boot sequence', desc: 'Fake boot log on startup and when hacker mode is turned on. Any key skips it.' },
	{ key: 'hud', name: 'Status bar HUD', desc: 'Clock, JS heap and typing speed (WPM) with a sparkline.' },
	{ key: 'matrixBackground', name: 'Background rain', desc: 'Faint digital rain over the whole window, all the time.' },
	{ key: 'titleDecode', name: 'Title decode', desc: 'Note titles resolve from random glyphs when a note opens (not when switching back to an open tab).' },
	{ key: 'rewardBanner', name: 'Reward banner', desc: 'Gamification rewards also show an "ACCESS GRANTED" banner or terminal line.' },
];

export function renderHackerModeSection(containerEl: HTMLElement, plugin: CrystalPlugin) {
	const { settings } = plugin;

	new Setting(containerEl).setName('Hacker mode').setHeading()
		.setDesc('Cosmetic animations and effects layered over your theme. Toggle quickly with the "Hacker mode: Toggle" command.');

	new Setting(containerEl)
		.setName('Enable hacker mode')
		.addToggle(toggle => toggle
			.setValue(settings.hackerModeEnabled)
			.onChange(async (value) => {
				settings.hackerModeEnabled = value;
				await plugin.saveSettings();
			}));

	new Setting(containerEl)
		.setName('Accent color')
		.setDesc('Color used by every effect.')
		.addColorPicker(picker => picker
			.setValue(settings.hackerColor)
			.onChange(async (value) => {
				settings.hackerColor = value;
				await plugin.saveSettings();
			}));

	new Setting(containerEl).setName('Effects').setHeading();
	for (const effect of EFFECTS) {
		new Setting(containerEl)
			.setName(effect.name)
			.setDesc(effect.desc)
			.addToggle(toggle => toggle
				.setValue(settings.hackerEffects[effect.key])
				.onChange(async (value) => {
					settings.hackerEffects[effect.key] = value;
					await plugin.saveSettings();
				}));
	}

	new Setting(containerEl).setName('Tuning').setHeading();
	new Setting(containerEl)
		.setName('Background rain opacity')
		.addSlider(slider => slider
			.setLimits(0.05, 0.5, 0.05)
			.setValue(settings.hackerMatrixOpacity)
			.setDynamicTooltip()
			.onChange(async (value) => {
				settings.hackerMatrixOpacity = value;
				await plugin.saveSettings();
			}));

	new Setting(containerEl)
		.setName('Preview')
		.addButton(button => button
			.setButtonText('Boot sequence')
			.onClick(() => plugin.hackerModeService?.playBoot()))
		.addButton(button => button
			.setButtonText('Reward banner')
			.onClick(() => showRewardBanner('LEVEL UP Lv42', true)));
}
