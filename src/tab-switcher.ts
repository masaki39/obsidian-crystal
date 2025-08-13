import { App, Plugin, MarkdownView } from "obsidian";

export class TabSwitcherService {
    constructor(private app: App, private plugin: Plugin) {}

    onload() {
        this.plugin.addCommand({
            id: "crystal-move-tab-left",
            name: "Move Tab Left",
            repeatable: true,
            callback: () => this.moveTab(-1),
        });

        this.plugin.addCommand({
            id: "crystal-move-tab-right",
            name: "Move Tab Right",
            repeatable: true,
            callback: () => this.moveTab(1),
        });
    }

    moveTab(direction: -1 | 1) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return;
        
        const activeTab = view.leaf;
        const tabGroup = activeTab.parent;
        
        // @ts-ignore - Obsidianの内部APIを使用
        const tabList = tabGroup.children;
        const activeTabIndex = tabList.indexOf(activeTab);
        const activeTabNewIndex = activeTabIndex + direction;

        if (activeTabNewIndex < 0 || activeTabNewIndex >= tabList.length) return;

        // 直接交換 - 削除イベントを避ける
        [tabList[activeTabIndex], tabList[activeTabNewIndex]] = [tabList[activeTabNewIndex], tabList[activeTabIndex]];

        // @ts-ignore - Obsidianの内部APIを使用  
        tabGroup.recomputeChildrenDimensions();
        this.app.workspace.revealLeaf(tabList[activeTabNewIndex]);
    }
}