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

        const targetFiles = ["CLAUDE.md", "AGENTS.md"];

        for (const filePath of targetFiles) {
            const file = this.app.vault.getFileByPath(filePath);
            if (!file) {
                continue;
            }

            await this.app.fileManager.processFrontMatter(file, (fm) => {
                fm.activeFile = activeFilePath;
            });
        }
    }
    async onload(){

        this.plugin.registerEvent(this.app.workspace.on("active-leaf-change", () => {
            this.updateActiveFile();
        }));
        
        this.plugin.registerEvent(this.app.vault.on("rename", () => {
            this.updateActiveFile();
        }));
    }

}
