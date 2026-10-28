import { Plugin } from 'obsidian';
import { type CrystalPluginSettings, DEFAULT_SETTINGS, CrystalSettingTab } from './src/settings';
import { loadSecrets, saveSecrets, withoutSecrets } from './src/settings/secrets';
import { type CrystalServices, createServices, loadServices, unloadServices, updateServiceSettings } from './src/features/registry';
import type { OpacityService } from './src/features/workspace/opacity';
import type { StatusBarOrderService } from './src/features/workspace/status-bar-order';
import type { HackerModeService } from './src/features/hacker/mode';

export default class CrystalPlugin extends Plugin {
	settings: CrystalPluginSettings;
	private services: CrystalServices;
	// Read by the settings tab.
	private opacityService: OpacityService;
	statusBarOrderService: StatusBarOrderService;
	hackerModeService: HackerModeService;

	async onload() {
		await this.loadSettings();

		this.services = createServices(this, this.settings);
		this.opacityService = this.services.opacityService;
		this.statusBarOrderService = this.services.statusBarOrderService;
		this.hackerModeService = this.services.hackerModeService;

		loadServices(this, this.services);

		this.addSettingTab(new CrystalSettingTab(this.app, this));
	}

	onunload() {
		if (this.services) {
			unloadServices(this.services);
		}
	}

	async loadSettings() {
		const stored = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);

		// Load secrets from SecretStorage; migrate from old data.json if needed
		await loadSecrets(this.app, this.settings);

		// Remove secrets from data.json
		await this.saveData(withoutSecrets(stored));
	}

	async saveSettings() {
		// Save non-secret settings to data.json
		await this.saveData(withoutSecrets(this.settings));

		// Save secrets to SecretStorage
		saveSecrets(this.app, this.settings);

		await updateServiceSettings(this.services, this.settings);
	}
}
