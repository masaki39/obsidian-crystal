import { Editor, MarkdownView, Notice } from 'obsidian';
import { GyazoService } from './gyazo-service';

/**
 * Scans the active note for external image URLs, re-uploads them to Gyazo,
 * and replaces the originals in place. Prevents broken image links by
 * rehosting remote images on Gyazo.
 */
export class GyazoImageMigrator {
	private gyazoService: GyazoService;

	constructor(gyazoService: GyazoService) {
		this.gyazoService = gyazoService;
	}

	async replaceExternalImagesInActiveNote(editor: Editor, view: MarkdownView): Promise<void> {
		if (!view.file) {
			new Notice('ファイルが開かれていません');
			return;
		}

		const cursor = editor.getCursor();
		const content = editor.getValue();
		const urls = this.collectImageUrls(content);

		if (urls.length === 0) {
			new Notice('置換対象の画像URLが見つかりませんでした');
			return;
		}

		new Notice(`${urls.length}件の画像をGyazoにアップロード中...`);

		const mapping = new Map<string, string>();
		let failed = 0;

		for (const url of urls) {
			try {
				const newUrl = await this.gyazoService.uploadFromUrl(url);
				mapping.set(url, newUrl);
			} catch (error) {
				console.error(`Failed to migrate image to Gyazo: ${url}`, error);
				failed++;
			}
		}

		if (mapping.size === 0) {
			new Notice(`画像のアップロードに失敗しました (${failed}件)`);
			return;
		}

		// Replace longest URLs first so shorter URLs that are prefixes of others are not corrupted.
		const sortedUrls = Array.from(mapping.keys()).sort((a, b) => b.length - a.length);
		let newContent = content;
		for (const oldUrl of sortedUrls) {
			newContent = newContent.split(oldUrl).join(mapping.get(oldUrl)!);
		}

		editor.setValue(newContent);
		editor.setCursor(cursor);
		requestAnimationFrame(() => {
			editor.scrollIntoView({ from: cursor, to: cursor }, true);
		});

		const summary = failed > 0
			? `${mapping.size}件をGyazoに置換、${failed}件失敗`
			: `${mapping.size}件の画像をGyazoに置換しました`;
		new Notice(summary);
	}

	/**
	 * Collect unique external image URLs from markdown images, HTML <img> tags,
	 * and bare image URLs. Gyazo-hosted URLs are skipped.
	 */
	private collectImageUrls(content: string): string[] {
		const urls = new Set<string>();

		// Markdown image: ![alt](https://...) — stops the URL at whitespace (optional title) or ')'
		const markdownImageRegex = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)/g;
		// HTML <img src="https://...">
		const htmlImageRegex = /<img\b[^>]*?\bsrc\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
		// Bare image URL with a known extension, bounded by whitespace/delimiters
		const bareImageRegex = /https?:\/\/[^\s<>)"'\]]+\.(?:png|jpe?g|gif|webp|bmp|svg)(?:\?[^\s<>)"'\]]*)?(?=$|[\s<>)"'\]])/gi;

		let match: RegExpExecArray | null;
		while ((match = markdownImageRegex.exec(content)) !== null) {
			urls.add(match[1]);
		}
		while ((match = htmlImageRegex.exec(content)) !== null) {
			urls.add(match[1]);
		}
		while ((match = bareImageRegex.exec(content)) !== null) {
			urls.add(match[0]);
		}

		return Array.from(urls).filter(url => !this.isGyazoUrl(url));
	}

	private isGyazoUrl(url: string): boolean {
		return /^https?:\/\/(?:[a-z0-9-]+\.)?gyazo\.com\//i.test(url);
	}
}
