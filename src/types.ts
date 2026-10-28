import type { Plugin } from 'obsidian';
import type { CrystalPluginSettings } from './settings';
import type { HackerModeService } from './hacker-mode';

/**
 * The plugin as seen from feature modules. Declared here (not imported from
 * main.ts) so features never depend on the plugin class itself.
 */
export type CrystalPluginHost = Plugin & {
	settings: CrystalPluginSettings;
	saveSettings(): Promise<void>;
	hackerModeService?: HackerModeService;
};
