import { App, Plugin } from 'obsidian';

export class SettingEdit {
	private app: App;
	private plugin: Plugin;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
	}

	async onload() {
		this.plugin.addCommand({
			id: 'crystal-toggle-line-number',
			name: 'Toggle Line Number',
			callback: () => {
				this.toggleLineNumber();
			}
		});
	}

	private async toggleLineNumber() {
		try {
			const adapter = this.app.vault.adapter;
			const appJsonPath = '.obsidian/app.json';

			// Read current app.json
			const appJsonContent = await adapter.read(appJsonPath);
			const config = JSON.parse(appJsonContent);

			// Toggle showLineNumber
			config.showLineNumber = !config.showLineNumber;

			// Save back to app.json (formatted with 2-space indent)
			await adapter.write(appJsonPath, JSON.stringify(config, null, 2));

		} catch (error) {
			console.error('Failed to toggle line number setting:', error);
		}
	}
}
