import { App, Editor, MarkdownView, Notice, TFile } from 'obsidian';
import { GyazoService, EXTENSION_TO_MIME } from './gyazo-service';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);

/**
 * Migrates local (vault) images embedded in the active note to Gyazo.
 *
 * For each image it: uploads to Gyazo, rewrites every reference across the whole
 * vault (the active note plus any other note linking/embedding it) to the Gyazo URL,
 * then moves the original file to trash. Vault-wide rewriting ensures no broken links.
 */
export class GyazoLocalImageMigrator {
	private app: App;
	private gyazoService: GyazoService;

	constructor(app: App, gyazoService: GyazoService) {
		this.app = app;
		this.gyazoService = gyazoService;
	}

	async replaceLocalImagesInActiveNote(editor: Editor, view: MarkdownView): Promise<void> {
		const sourceFile = view.file;
		if (!sourceFile) {
			new Notice('ファイルが開かれていません');
			return;
		}

		const cursor = editor.getCursor();
		const content = editor.getValue();

		// Collect unique local image files embedded in the active note
		const targetFiles = this.collectLocalImageFiles(content, sourceFile.path);
		if (targetFiles.size === 0) {
			new Notice('置換対象のローカル画像が見つかりませんでした');
			return;
		}

		new Notice(`${targetFiles.size}件のローカル画像をGyazoにアップロード中...`);

		// Upload each unique file once: path -> Gyazo URL
		const uploaded = new Map<string, string>();
		let failed = 0;
		for (const file of targetFiles.values()) {
			try {
				const data = await this.app.vault.readBinary(file);
				const mime = EXTENSION_TO_MIME[file.extension.toLowerCase()] ?? 'application/octet-stream';
				uploaded.set(file.path, await this.gyazoService.uploadBinary(data, mime));
			} catch (error) {
				console.error(`Failed to upload local image to Gyazo: ${file.path}`, error);
				failed++;
			}
		}

		if (uploaded.size === 0) {
			new Notice(`画像のアップロードに失敗しました (${failed}件)`);
			return;
		}

		// 1. Rewrite the active note through the editor (preserves unsaved edits and cursor)
		editor.setValue(this.rewriteReferences(content, sourceFile.path, uploaded));
		editor.setCursor(cursor);
		requestAnimationFrame(() => {
			editor.scrollIntoView({ from: cursor, to: cursor }, true);
		});

		// 2. Rewrite references in every other note that points to a migrated image
		const otherNotes = this.findReferencingNotes(uploaded, sourceFile.path);
		let updatedNotes = 0;
		for (const note of otherNotes) {
			let changed = false;
			await this.app.vault.process(note, (data) => {
				const rewritten = this.rewriteReferences(data, note.path, uploaded);
				changed = rewritten !== data;
				return rewritten;
			});
			if (changed) updatedNotes++;
		}

		// 3. Move successfully migrated originals to trash (respects the user's deletion preference)
		for (const path of uploaded.keys()) {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				try {
					await this.app.fileManager.trashFile(file);
				} catch (error) {
					console.error(`Failed to trash local image: ${path}`, error);
				}
			}
		}

		const parts = [`${uploaded.size}件のローカル画像をGyazoに置換`];
		if (updatedNotes > 0) parts.push(`他${updatedNotes}ノートの参照も更新`);
		if (failed > 0) parts.push(`${failed}件失敗`);
		new Notice(parts.join('、'));
	}

	/**
	 * Find all local image files embedded in the given note content.
	 */
	private collectLocalImageFiles(content: string, sourcePath: string): Map<string, TFile> {
		const files = new Map<string, TFile>();

		const wikiEmbedRegex = /!\[\[([^\]]+?)\]\]/g;
		const markdownEmbedRegex = /!\[[^\]]*\]\(([^)]+)\)/g;

		let match: RegExpExecArray | null;
		while ((match = wikiEmbedRegex.exec(content)) !== null) {
			const file = this.resolveLocalImage(match[1], sourcePath);
			if (file) files.set(file.path, file);
		}
		while ((match = markdownEmbedRegex.exec(content)) !== null) {
			const file = this.resolveLocalImage(match[1], sourcePath);
			if (file) files.set(file.path, file);
		}

		return files;
	}

	/**
	 * Collect every markdown note (excluding the active one) that references a migrated image.
	 */
	private findReferencingNotes(uploaded: Map<string, string>, excludePath: string): TFile[] {
		const resolved = this.app.metadataCache.resolvedLinks;
		const notes: TFile[] = [];

		for (const sourcePath of Object.keys(resolved)) {
			if (sourcePath === excludePath) continue;
			const targets = resolved[sourcePath];
			const referencesImage = Object.keys(targets).some(target => uploaded.has(target));
			if (!referencesImage) continue;

			const file = this.app.vault.getAbstractFileByPath(sourcePath);
			if (file instanceof TFile && file.extension === 'md') {
				notes.push(file);
			}
		}

		return notes;
	}

	/**
	 * Rewrite all embeds and links pointing to a migrated image into Gyazo markdown.
	 * Embeds become image embeds; plain links become markdown links. Anything that
	 * does not resolve to a migrated image is left untouched.
	 */
	private rewriteReferences(content: string, sourcePath: string, uploaded: Map<string, string>): string {
		let result = content;

		// Wiki embed: ![[...]]
		result = result.replace(/!\[\[([^\]]+?)\]\]/g, (original, inner) => {
			const url = this.lookupUrl(inner, sourcePath, uploaded);
			return url ? `![](${url})` : original;
		});

		// Markdown embed: ![alt](target)
		result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (original, alt, target) => {
			const url = this.lookupUrl(target, sourcePath, uploaded);
			return url ? `![${alt}](${url})` : original;
		});

		// Wiki link (non-embed): [[...]]
		result = result.replace(/(?<!!)\[\[([^\]]+?)\]\]/g, (original, inner) => {
			const url = this.lookupUrl(inner, sourcePath, uploaded);
			if (!url) return original;
			const aliasParts = String(inner).split('|');
			const display = aliasParts.length > 1 ? aliasParts.slice(1).join('|') : aliasParts[0];
			return `[${display}](${url})`;
		});

		// Markdown link (non-embed): [text](target)
		result = result.replace(/(?<!!)\[([^\]]*)\]\(([^)]+)\)/g, (original, text, target) => {
			const url = this.lookupUrl(target, sourcePath, uploaded);
			return url ? `[${text}](${url})` : original;
		});

		return result;
	}

	private lookupUrl(rawTarget: string, sourcePath: string, uploaded: Map<string, string>): string | null {
		const file = this.resolveLocalImage(rawTarget, sourcePath);
		return file ? uploaded.get(file.path) ?? null : null;
	}

	/**
	 * Resolve an embed/link target to a local image TFile, or null for external/unknown/non-image targets.
	 */
	private resolveLocalImage(rawTarget: string, sourcePath: string): TFile | null {
		// Drop wiki alias/size (|) and subpath (#), and any markdown title
		const target = this.stripTitle(rawTarget).split('|')[0].split('#')[0].trim();
		if (!target) return null;

		// Skip external resources (handled by the URL migrator) and data URIs
		if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target) || target.startsWith('data:')) {
			return null;
		}

		let decoded = target;
		try {
			decoded = decodeURIComponent(target);
		} catch {
			// keep raw target if it is not valid percent-encoding
		}

		return (
			// Explicit relative paths resolved against the note's folder
			(decoded.startsWith('./') || decoded.startsWith('../')
				? this.getFileByPath(this.resolveRelativePath(sourcePath, decoded))
				: null)
			// Obsidian link resolution (wiki links and shortest/absolute markdown paths)
			?? this.toImage(this.app.metadataCache.getFirstLinkpathDest(decoded, sourcePath))
			// Vault-absolute path
			?? this.getFileByPath(decoded)
			// Fallback: relative to the note's folder
			?? this.getFileByPath(this.resolveRelativePath(sourcePath, decoded))
		);
	}

	private stripTitle(target: string): string {
		const t = target.trim();
		// Angle-bracket form: <path with spaces.png>
		if (t.startsWith('<') && t.includes('>')) {
			return t.substring(1, t.indexOf('>')).trim();
		}
		// Optional markdown title: path "title" or path 'title'
		return t.replace(/\s+["'][^"']*["']$/, '').trim();
	}

	private resolveRelativePath(sourcePath: string, relative: string): string {
		const segments = sourcePath.includes('/') ? sourcePath.split('/').slice(0, -1) : [];
		for (const segment of relative.split('/')) {
			if (segment === '' || segment === '.') continue;
			if (segment === '..') segments.pop();
			else segments.push(segment);
		}
		return segments.join('/');
	}

	private getFileByPath(path: string): TFile | null {
		if (!path) return null;
		return this.toImage(this.app.vault.getAbstractFileByPath(path));
	}

	private toImage(file: unknown): TFile | null {
		return file instanceof TFile && IMAGE_EXTENSIONS.has(file.extension.toLowerCase()) ? file : null;
	}
}
