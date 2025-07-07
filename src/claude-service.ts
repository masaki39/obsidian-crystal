import { App, Plugin } from "obsidian";

export class ClaudeService {
    private app: App;
    private plugin: Plugin;

    constructor(app: App, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
    }

    async updateActiveFile() {
        const activeFilePath = this.app.workspace.getActiveFile()?.path;
        if (!activeFilePath) {
            return;
        }

        const claude = this.app.vault.getFileByPath("CLAUDE.md");
        if (!claude) {
            console.log("CLAUDE.md not found");
            return;
        }
            
        await this.app.fileManager.processFrontMatter(claude, (fm) => {
            fm.activeFile = activeFilePath;
        });
    }
    async onload(){

        this.plugin.registerEvent(this.app.workspace.on("active-leaf-change", () => {
            console.log("active-leaf-change");
            this.updateActiveFile();
        }));
    }

}