import { TerminalService } from "./terminal-service";
import { CrystalPluginSettings } from "./settings";
import { Plugin } from "obsidian";

export class ShortcutService {
    private terminalService: TerminalService;
    private settings: CrystalPluginSettings;
    private plugin: Plugin;

    constructor(terminalService: TerminalService, settings: CrystalPluginSettings, plugin: Plugin) {
        this.terminalService = terminalService;
        this.settings = settings;
        this.plugin = plugin;
    }
    
    async onLoad() {
        const shortcutNames = this.settings.shortcutNames.split('\n').map(name => name.trim());
        for (const name of shortcutNames) {
            this.plugin.addCommand({
                id: `crystal-shortcuts-run-${name}`,
                name: `Run Shortcut: ${name}`,
                callback: async () => {
                    try {
                        await this.terminalService.executeCommand(`osascript -e 'tell application "Shortcuts Events" to run shortcut "${name}"'`);
                    } catch (error) {
                        console.error(`Failed to run shortcut "${name}":`, error);
                    }
                }
            });
        }
    }

}