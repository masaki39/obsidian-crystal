import { App, Notice, Plugin, TFile } from 'obsidian';
import { CrystalPluginSettings } from './settings';

/**
 * Property link: when a note's frontmatter list property (e.g. `next`) links
 * to another note, automatically add a reciprocal link on that other note's
 * frontmatter list property (e.g. `previous`). Pairs where source and target
 * are the same property name (e.g. `friends`, `oppose`) create a symmetric
 * relation instead of a directed one.
 *
 * Only additive: existing property values are never removed or overwritten,
 * and a link already present is never duplicated. Links removed from the
 * source side are left alone on the target side (no auto-deletion) so a
 * manually-curated backlink is never silently wiped out by this feature.
 */
export class PropertyLinkService {
	private app: App;
	private plugin: Plugin;
	private settings: CrystalPluginSettings;
	// Serializes writes per target file path so two notes linking to the same
	// hub note during a bulk sync can't race each other's read-modify-write.
	private locks: Map<string, Promise<void>> = new Map();

	constructor(app: App, plugin: Plugin, settings: CrystalPluginSettings) {
		this.app = app;
		this.plugin = plugin;
		this.settings = settings;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	onload() {
		this.plugin.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (!this.settings.propertyLinkEnabled) return;
				if (!(file instanceof TFile)) return;
				this.syncFile(file).catch((error) => {
					console.error('Property link: failed to sync', file.path, error);
				});
			})
		);

		this.plugin.addCommand({
			id: 'crystal-property-link-sync-current-note',
			name: 'Property link: Sync current note',
			icon: 'link',
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) {
					new Notice('⚠️ ファイルが開かれていません');
					return;
				}
				const added = await this.syncFile(file);
				new Notice(added > 0 ? `✅ ${added}件の対になるリンクを作成しました` : 'ℹ️ 追加するリンクはありませんでした');
			}
		});

		this.plugin.addCommand({
			id: 'crystal-property-link-sync-vault',
			name: 'Property link: Sync all notes',
			icon: 'link',
			callback: async () => {
				const { files, added } = await this.syncVault();
				new Notice(`✅ ${files}件のノートを確認し、${added}件の対になるリンクを作成しました`);
			}
		});
	}

	/**
	 * Scan a single note's configured source properties and ensure every
	 * link it contains has a matching reciprocal link on the target note.
	 * Returns the number of reciprocal links actually added.
	 */
	async syncFile(file: TFile): Promise<number> {
		if (file.extension !== 'md') return 0;
		if (this.settings.propertyLinkPairs.length === 0) return 0;

		const cache = this.app.metadataCache.getFileCache(file);
		const frontmatter = cache?.frontmatter;
		if (!frontmatter) return 0;

		let added = 0;
		for (const pair of this.settings.propertyLinkPairs) {
			if (!pair.source || !pair.target) continue;
			const raw = frontmatter[pair.source];
			if (raw === undefined || raw === null) continue;
			const values = Array.isArray(raw) ? raw : [raw];

			for (const value of values) {
				const targetFile = this.resolveLink(value, file.path);
				if (!targetFile || targetFile.path === file.path) continue;
				if (await this.addBacklinkIfMissing(targetFile, pair.target, file)) {
					added++;
				}
			}
		}
		return added;
	}

	async syncVault(): Promise<{ files: number; added: number }> {
		const files = this.app.vault.getMarkdownFiles();
		let added = 0;
		for (const file of files) {
			added += await this.syncFile(file);
		}
		return { files: files.length, added };
	}

	/** Resolve a frontmatter property value (wikilink or markdown link) to its target file. */
	private resolveLink(raw: unknown, sourcePath: string): TFile | null {
		const path = this.extractLinkPath(raw);
		if (!path) return null;
		return this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
	}

	/** Pull the link target out of a `[[wikilink]]` or `[markdown](link)` frontmatter value. */
	private extractLinkPath(raw: unknown): string | null {
		if (typeof raw !== 'string') return null;
		const trimmed = raw.trim();

		const wikiMatch = trimmed.match(/^\[\[([^\]|#]+)/);
		if (wikiMatch) return wikiMatch[1].trim();

		const mdMatch = trimmed.match(/^\[[^\]]*\]\(([^)]+)\)$/);
		if (mdMatch) {
			const path = mdMatch[1].split('#')[0].trim();
			try {
				return decodeURIComponent(path);
			} catch {
				return path;
			}
		}

		return null;
	}

	/**
	 * Append a link back to `forFile` on `targetFile`'s `property`, creating the
	 * property as a list if it doesn't exist yet. No-ops if already linked, and
	 * never touches any other property or existing list entry.
	 */
	private async addBacklinkIfMissing(targetFile: TFile, property: string, forFile: TFile): Promise<boolean> {
		let added = false;
		await this.withFileLock(targetFile.path, async () => {
			await this.app.fileManager.processFrontMatter(targetFile, (fm) => {
				const existing = fm[property];
				const arr: unknown[] = existing === undefined || existing === null
					? []
					: Array.isArray(existing) ? existing.slice() : [existing];

				const alreadyLinked = arr.some((v) => this.resolveLink(v, targetFile.path)?.path === forFile.path);
				if (alreadyLinked) return;

				arr.push(this.app.fileManager.generateMarkdownLink(forFile, targetFile.path));
				fm[property] = arr;
				added = true;
			});
		});
		return added;
	}

	private async withFileLock(path: string, fn: () => Promise<void>): Promise<void> {
		const previous = this.locks.get(path) ?? Promise.resolve();
		const next = previous.then(fn, fn);
		this.locks.set(path, next.catch(() => { /* swallow so the chain never breaks */ }));
		try {
			await next;
		} finally {
			if (this.locks.get(path) === next) {
				this.locks.delete(path);
			}
		}
	}
}
