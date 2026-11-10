import type { TerminalService } from "../../shared/terminal-service";
import type { CrystalPluginSettings } from "../../settings";
import { Plugin, Notice } from "obsidian";

export class QuartzService {
	private terminalService: TerminalService;
	private settings: CrystalPluginSettings;
	private plugin: Plugin;

	constructor(plugin: Plugin, settings: CrystalPluginSettings, terminalService: TerminalService) {
		this.plugin = plugin;
		this.settings = settings;
		this.terminalService = terminalService;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	private async generateQuartzSyncCommand() {
		const quartzPath = this.settings.quartzPath;
		const command = `cd "${quartzPath}" && npx quartz sync`;
		console.log(command);
		return command;
	}

	private hasQuartzPath(): boolean {
		if (!this.settings.quartzPath.trim()) {
			new Notice('⚠️ Quartz path is not set. Set it in Settings → Crystal → Quartz');
			return false;
		}
		return true;
	}

	private hasGithubUserName(): boolean {
		if (!this.settings.githubUserName.trim()) {
			new Notice('⚠️ GitHub user name is not set. Set it in Settings → Crystal → Quartz');
			return false;
		}
		return true;
	}

	/** Returns true when `npx quartz sync` exited successfully. */
	async quartzSync(): Promise<boolean> {
		if (!this.hasQuartzPath()) {
			return false;
		}
		const command = await this.generateQuartzSyncCommand();
		try {
			const result = await this.terminalService.executeCommand(command);
			if (result.exitCode !== 0) {
				console.error('Quartz sync failed:', result.stderr || result.stdout);
				new Notice(`❌ Quartz sync failed (exit code ${result.exitCode})`);
				return false;
			}
		} catch (error) {
			console.error('Quartz sync failed:', error);
			new Notice('❌ Quartz sync failed');
			return false;
		}
		new Notice('✅ Quartz Sync executed');
		return true;
	}

	async openQuartzSite() {
		if (!this.hasGithubUserName()) {
			return;
		}
		const githubUserName = this.settings.githubUserName;
		const quartzSiteUrl = `https://${githubUserName}.github.io`;
		open(quartzSiteUrl);
	}

	async quartzSyncAndOpenSite() {
		// Check both settings up front so nothing is pushed when the site can't be opened.
		if (!this.hasQuartzPath() || !this.hasGithubUserName()) {
			return;
		}
		if (!(await this.quartzSync())) {
			return;
		}
		this.openQuartzSite();
		const githubActionsUrl = `https://github.com/${this.settings.githubUserName}/${this.settings.githubUserName}.github.io/actions`;
		open (githubActionsUrl);
	}

	async onload() {
		this.plugin.addCommand({
			id: 'crystal-quartz-sync',
			name: 'Quartz: Sync',
			icon: 'refresh-cw',
			callback: () => {
				this.quartzSync();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-quartz-open-site',
			name: `Quartz: Open site (${this.settings.quartzSiteName})`,
			icon: 'globe',
			callback: () => {
				this.openQuartzSite();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-quartz-sync-and-open-site',
			name: `Quartz: Sync and open site (${this.settings.quartzSiteName})`,
			icon: 'external-link',
			callback: () => {
				this.quartzSyncAndOpenSite();
			}
		});
	}

}