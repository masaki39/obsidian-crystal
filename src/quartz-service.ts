import { TerminalService } from "./terminal-service";
import { CrystalPluginSettings } from "./settings";
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

    private async generateQuartzSyncCommand() {
        const quartzPath = this.settings.quartzPath;
        const command = `cd ${quartzPath} && npx quartz sync`;
        console.log(command);
        return command;
    }

    async quartzSync() {
        const command = await this.generateQuartzSyncCommand();
        await this.terminalService.executeCommand(command);
        new Notice('Quartz Sync executed');
    }

    async openQuartzSite() {
        const githubUserName = this.settings.githubUserName;
        const quartzSiteUrl = `https://${githubUserName}.github.io`;
        open(quartzSiteUrl);
    }

    async quartzSyncAndOpenSite() {
        await this.quartzSync();
        new Notice('Quartz Sync executed');
        this.openQuartzSite();
        const githubActionsUrl = `https://github.com/${this.settings.githubUserName}/${this.settings.githubUserName}.github.io/actions`;
        open (githubActionsUrl);
    }

    async onload() {
        this.plugin.addCommand({
            id: 'crystal-quartz-sync',
            name: 'Quartz Sync',
            callback: () => {
                this.quartzSync();
            }
        });

        this.plugin.addCommand({
            id: 'crystal-quartz-open-site',
            name: `Open Quartz Site (${this.settings.quartzSiteName})`,
            callback: () => {
                this.openQuartzSite();
            }
        });

        this.plugin.addCommand({
            id: 'crystal-quartz-sync-and-open-site',
            name: `Quartz Sync and Open Site (${this.settings.quartzSiteName})`,
            callback: () => {
                this.quartzSyncAndOpenSite();
            }
        });
    }

}