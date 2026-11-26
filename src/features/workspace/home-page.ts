import { type App, Notice, normalizePath, type Plugin, TFile } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';

/**
 * The note named in the settings: a link path (`Home`, `Notes/Home`) resolved
 * like a wikilink, or an exact vault path (`Notes/Home.md`).
 */
export function resolveHomePage(app: App, setting: string): TFile | null {
	const name = setting.trim().replace(/^\[\[|\]\]$/g, '');
	if (!name) return null;
	const linked = app.metadataCache.getFirstLinkpathDest(name, '');
	if (linked) return linked;
	const exact = app.vault.getAbstractFileByPath(normalizePath(name));
	return exact instanceof TFile ? exact : null;
}

/** "Open home page": opens the note set as the home page in the current tab. */
export class HomePageCommands {
	constructor(private app: App, private plugin: Plugin, private settings: CrystalPluginSettings) {}

	onload() {
		this.plugin.addCommand({
			id: 'crystal-open-home-page',
			name: 'Workspace: Open home page',
			icon: 'home',
			callback: () => this.open(),
		});
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	private async open() {
		const setting = this.settings.homePagePath.trim();
		if (!setting) {
			new Notice('Set the home page in Crystal settings → General.');
			return;
		}
		const file = resolveHomePage(this.app, setting);
		if (!file) {
			new Notice(`Home page not found: ${setting}`);
			return;
		}
		await this.app.workspace.getLeaf(false).openFile(file);
	}
}
