import { App, MarkdownView, Notice, Plugin, TFile, requestUrl } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import { parseFrontmatter } from '../../shared/markdown/frontmatter';
import type { DailyNotesManager } from './manager';
import type { BlueskyService } from '../bluesky/service';

/** Bluesky accepts at most this many images per post. */
const MAX_BLUESKY_IMAGES = 4;

const IMAGE_MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
};

/** Vault path of the draft note: trimmed, no leading slash, `.md` appended if missing. */
export function resolveDraftPath(setting: string): string {
	const path = (setting.trim() || 'tmp.md').replace(/^\/+/, '');
	return path.endsWith('.md') ? path : `${path}.md`;
}

/** The text to post: the draft without frontmatter or surrounding blank lines. */
export function extractDraftBody(content: string): string {
	return parseFrontmatter(content).content.trim();
}

/** An image embedded in the draft: a remote URL, or a link to resolve inside the vault. */
export interface DraftImage {
	kind: 'url' | 'vault';
	target: string;
}

function imageExtension(target: string): string {
	return (target.split(/[?#]/)[0].split('.').pop() ?? '').toLowerCase();
}

/**
 * Splits image embeds (`![alt](url)` and `![[file.png]]`) out of the draft
 * body, so the text can be posted with the images attached separately.
 */
export function splitDraftImages(body: string): { text: string; images: DraftImage[] } {
	const images: DraftImage[] = [];
	const text = body
		.replace(/!\[[^\]]*\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g, (match, target: string) => {
			if (/^https?:\/\//.test(target)) {
				images.push({ kind: 'url', target });
			} else if (IMAGE_MIME[imageExtension(target)]) {
				images.push({ kind: 'vault', target: decodeURI(target) });
			} else {
				return match;
			}
			return '';
		})
		.replace(/!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g, (match, target: string) => {
			if (!IMAGE_MIME[imageExtension(target)]) return match;
			images.push({ kind: 'vault', target: target.trim() });
			return '';
		})
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return { text, images };
}

/**
 * Write in a plain Markdown note (with every editor feature: image paste,
 * hotkeys, hacker-mode effects…) and post it to today's daily-note timeline
 * or to Bluesky in one go, instead of typing into a modal. Posting empties
 * the draft; its frontmatter, if any, is kept.
 */
export class DailyDraft {
	constructor(
		private readonly app: App,
		private readonly plugin: Plugin,
		private settings: CrystalPluginSettings,
		private readonly dailyNotesManager: DailyNotesManager,
		private readonly blueskyService: BlueskyService,
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

		this.plugin.addCommand({
			id: 'crystal-post-daily-draft-to-bluesky',
			name: 'Daily: Post draft to Bluesky',
			icon: 'cloud',
			callback: () => this.postDraftToBluesky(),
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

	/** Post the draft to today's timeline and empty it. */
	async postDraft(): Promise<void> {
		const draft = await this.readDraft();
		if (!draft) return;

		const posted = await this.dailyNotesManager.appendToTimeline(draft.body);
		if (!posted) {
			new Notice('❌ タイムラインへの追加に失敗しました。');
			return;
		}
		await this.clearDraft(draft);
		new Notice('✅ デイリーノートのタイムラインに追加しました。');
	}

	/**
	 * Post the draft to Bluesky with its embedded images attached (up to 4),
	 * then empty it. Like the Bluesky modal, it's also added to the timeline
	 * when "Append to daily note" is on — with the images left inline there.
	 */
	async postDraftToBluesky(): Promise<void> {
		if (!this.blueskyService.isAvailable()) {
			new Notice('⚠️ Bluesky認証情報が設定されていません。設定からユーザー名とアプリパスワードを入力してください。');
			return;
		}
		const draft = await this.readDraft();
		if (!draft) return;

		const { text, images } = splitDraftImages(draft.body);
		if (images.length > MAX_BLUESKY_IMAGES) {
			new Notice(`⚠️ 画像は最大${MAX_BLUESKY_IMAGES}枚までです。先頭の${MAX_BLUESKY_IMAGES}枚だけ添付します。`);
		}

		try {
			new Notice('⏳ Blueskyに投稿中...');
			const files = await Promise.all(images.slice(0, MAX_BLUESKY_IMAGES).map(image => this.loadImage(image, draft.file)));
			await this.blueskyService.post(text, [], files, draft.body);
		} catch (error) {
			console.error('Failed to post draft to Bluesky:', error);
			new Notice(`❌ 投稿エラー: ${error.message}`);
			return;
		}
		await this.clearDraft(draft);
		new Notice('✅ Blueskyに投稿が完了しました！');
	}

	private async loadImage(image: DraftImage, draftFile: TFile): Promise<File> {
		if (image.kind === 'url') {
			const response = await requestUrl({ url: image.target });
			const type = response.headers['content-type']?.split(';')[0] || IMAGE_MIME[imageExtension(image.target)] || 'image/png';
			const name = image.target.split(/[?#]/)[0].split('/').pop() || 'image';
			return new File([response.arrayBuffer], name, { type });
		}
		const file = this.app.metadataCache.getFirstLinkpathDest(image.target, draftFile.path);
		if (!file) throw new Error(`画像が見つかりません: ${image.target}`);
		const data = await this.app.vault.readBinary(file);
		return new File([data], file.name, { type: IMAGE_MIME[file.extension.toLowerCase()] ?? 'image/png' });
	}

	/**
	 * The draft's current text. When it's open in an editor the live text is
	 * used (the file on disk may lag behind by a couple of seconds).
	 */
	private async readDraft(): Promise<{ file: TFile; view?: MarkdownView; content: string; body: string } | null> {
		const file = this.app.vault.getAbstractFileByPath(this.path);
		if (!(file instanceof TFile)) {
			new Notice('⚠️ 下書きノートがありません。「Daily: Open draft」で作成してください。');
			return null;
		}

		const view = this.app.workspace.getLeavesOfType('markdown')
			.map(leaf => leaf.view)
			.find((v): v is MarkdownView => v instanceof MarkdownView && v.file?.path === file.path);
		const content = view ? view.editor.getValue() : await this.app.vault.read(file);
		const body = extractDraftBody(content);
		if (!body) {
			new Notice('⚠️ 下書きが空です。');
			return null;
		}
		return { file, view, content, body };
	}

	/**
	 * Empty the draft, keeping frontmatter. Goes through the editor when open so
	 * Cmd+Z restores it. If the draft was edited while posting, it's left alone
	 * rather than discarding the new text.
	 */
	private async clearDraft(draft: { file: TFile; view?: MarkdownView; content: string }): Promise<void> {
		const { frontmatter } = parseFrontmatter(draft.content);
		if (draft.view) {
			const editor = draft.view.editor;
			if (editor.getValue() !== draft.content) {
				new Notice('⚠️ 投稿中に下書きが編集されたため、下書きは消さずに残しました。');
				return;
			}
			editor.replaceRange('', editor.offsetToPos(frontmatter.length), editor.offsetToPos(draft.content.length));
		} else {
			await this.app.vault.process(draft.file, current => (current === draft.content ? frontmatter : current));
		}
	}
}
