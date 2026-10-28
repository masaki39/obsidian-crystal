import { App, Editor, MarkdownView, Notice } from 'obsidian';
import * as path from 'path';

/**
 * Convert Obsidian Wiki links and Markdown links to relative path Markdown links
 */
export async function convertLinksToRelativePaths(app: App, editor: Editor, view: MarkdownView) {
	if (!view.file) {
		new Notice('⚠️ ファイルが開かれていません');
		return;
	}

	// ファイルのカーソル位置を記憶
	const cursorPosition = editor.getCursor();

	const content = editor.getValue();
	let convertedContent = content;
	let changeCount = 0;

	// Get current file's folder path for relative path calculation
	const currentFile = view.file;
	const currentFolder = currentFile.parent?.path || '';

	// Convert Wiki links: [[filename]] or [[filename|display]] and embed links: ![[filename]]
	const wikiLinkRegex = /(!)?\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
	convertedContent = convertedContent.replace(wikiLinkRegex, (match, embed, filename, alias) => {
		// Use Obsidian's built-in link resolution logic
		const targetFile = app.metadataCache.getFirstLinkpathDest(filename, currentFile.path);

		if (targetFile && targetFile.path) {
			// Calculate relative path
			const relativePath = getRelativePath(currentFolder, targetFile.path);
			// For embed links (![[...]]), use empty alt text; otherwise use alias or filename
			const displayText = embed ? '' : (alias ? alias.slice(1) : filename); // Remove | from alias
			changeCount++;
			return `${embed || ''}[${displayText}](${relativePath})`;
		}

		// If file not found, keep original
		return match;
	});

	// Convert Markdown links to relative if they point to vault files
	const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
	convertedContent = convertedContent.replace(markdownLinkRegex, (match, text, url) => {
		// Skip external URLs
		if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
			return match;
		}

		// Try to find the file in vault - first try as absolute path, then as filename
		let targetFile = app.vault.getAbstractFileByPath(url);

		// If not found as absolute path, try to find by filename
		if (!targetFile) {
			const filename = url.split('/').pop(); // Get filename from path
			if (filename) {
				// Search for file with this name in the vault
				const allFiles = app.vault.getFiles();
				const foundFile = allFiles.find(file => file.name === filename);
				if (foundFile) {
					targetFile = foundFile;
				}
			}
		}

		if (targetFile && targetFile.path) {
			// Calculate relative path
			const relativePath = getRelativePath(currentFolder, targetFile.path);
			// Only count as change if the path actually changed
			if (relativePath !== url) {
				changeCount++;
			}
			return `[${text}](${relativePath})`;
		}

		return match;
	});

	if (changeCount > 0) {
		editor.setValue(convertedContent);
		new Notice(`✅ ${changeCount}個のリンクを相対パスに変換済`);
	} else {
		new Notice('⚠️ 変換対象のリンクが見つかりませんでした');
	}

	// カーソル位置を復元
	editor.setCursor(cursorPosition);

	requestAnimationFrame(() => {
		editor.scrollIntoView({ from: cursorPosition, to: cursorPosition }, true);
	});
}

/**
 * Calculate relative path from current folder to target file
 */
function getRelativePath(currentFolder: string, targetPath: string): string {
	// path.posix.relative を使って相対パスを計算
	let relativePath = path.posix.relative(currentFolder, targetPath);

	// 同じフォルダ内の場合、'./' を付け加えるとより親切
	if (!relativePath.startsWith('../')) {
		relativePath = './' + relativePath;
	}
	return relativePath;
}
