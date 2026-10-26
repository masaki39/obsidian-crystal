import { App, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { parseFrontmatter } from './utils';
import type { DailyNotesManager } from './daily-notes';

/** Vault path of the draft note: trimmed, no leading slash, `.md` appended if missing. */
export function resolveDraftPath(setting: string): string {
	const path = (setting.trim() || 'tmp.md').replace(/^\/+/, '');
	return path.endsWith('.md') ? path : `${path}.md`;
}

/** The text to post: the draft without frontmatter or surrounding blank lines. */
export function extractDraftBody(content: string): string {
	return parseFrontmatter(content).content.trim();
}

/**
 * Write in a plain Markdown note (with every editor feature: image paste,
 * hotkeys, hacker-mode effects…) and post it to today's daily-note timeline
 * in one go, instead of typing into a modal. Posting empties the draft; its
 * frontmatter, if any, is kept.
 */
export class DailyDraft {
	constructor(
		private readonly app: App,
		private readonly plugin: Plugin,
		private settings: CrystalPluginSettings,
		private readonly dailyNotesManager: DailyNotesManager,
	) {}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	onload() {
		this.plugin.addCommand({
			id: 'crystal-open-daily-draft',
			name: 'Daily: Open draft',
			icon: 'pencil-line',
			callback: () => this.openDraft(),
		});

		this.plugin.addCommand({
			id: 'crystal-post-daily-draft',
			name: 'Daily: Post draft to timeline',
			icon: 'send',
			callback: () => this.postDraft(),
		});
	}

	private get path(): string {
		return resolveDraftPath(this.settings.dailyNoteDraftPath);
	}

	private async ensureDraftFile(): Promise<TFile> {
		const existing = this.app.vault.getAbstractFileByPath(this.path);
		if (existing instanceof TFile) return existing;

		const folder = this.path.includes('/') ? this.path.slice(0, this.path.lastIndexOf('/')) : '';
		if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
			await this.app.vault.createFolder(folder);
		}
		return this.app.vault.create(this.path, '');
	}

	/** Focus the draft: reuse a tab that already shows it, else open it in a new one. */
	async openDraft(): Promise<void> {
		try {
			const file = await this.ensureDraftFile();
			const openLeaf = this.app.workspace.getLeavesOfType('markdown')
				.find(leaf => leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path);
			const leaf = openLeaf ?? this.app.workspace.getLeaf('tab');
			if (!openLeaf) await leaf.openFile(file);
			this.app.workspace.setActiveLeaf(leaf, { focus: true });
			const editor = (leaf.view as MarkdownView).editor;
			editor.setCursor(editor.offsetToPos(editor.getValue().length));
		} catch (error) {
			console.error('Failed to open draft:', error);
			new Notice(`❌ 下書きを開けませんでした: ${error.message}`);
		}
	}

	/**
	 * Post the draft to today's timeline and empty it. When the draft is open
	 * in an editor its live text is used (the file on disk may lag behind by a
	 * couple of seconds), and it's cleared through the editor so Cmd+Z brings
	 * the text back.
	 */
	async postDraft(): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(this.path);
		if (!(file instanceof TFile)) {
			new Notice('⚠️ 下書きノートがありません。「Daily: Open draft」で作成してください。');
			return;
		}

		const view = this.app.workspace.getLeavesOfType('markdown')
			.map(leaf => leaf.view)
			.find((v): v is MarkdownView => v instanceof MarkdownView && v.file?.path === file.path);
		const content = view ? view.editor.getValue() : await this.app.vault.read(file);
		const body = extractDraftBody(content);
		if (!body) {
			new Notice('⚠️ 下書きが空です。');
			return;
		}

		const posted = await this.dailyNotesManager.appendToTimeline(body);
		if (!posted) {
			new Notice('❌ タイムラインへの追加に失敗しました。');
			return;
		}

		const { frontmatter } = parseFrontmatter(content);
		if (view) {
			const editor = view.editor;
			editor.replaceRange('', editor.offsetToPos(frontmatter.length), editor.offsetToPos(content.length));
		} else {
			await this.app.vault.modify(file, frontmatter);
		}
		new Notice('✅ デイリーノートのタイムラインに追加しました。');
	}
}
