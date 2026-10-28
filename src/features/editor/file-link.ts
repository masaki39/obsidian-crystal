import { App, Editor, MarkdownView, Notice } from 'obsidian';

/**
 * Copy current file link to clipboard
 */
export async function copyFileLink(app: App, editor?: Editor, view?: MarkdownView) {
	// Get file from view if available, otherwise try to get active file
	const file = view?.file || app.workspace.getActiveFile();

	if (!file) {
		new Notice('⚠️ No file is currently open');
		return;
	}

	// For markdown files, use basename (no extension). For other files (images, etc.), use full name with extension
	const fileName = file.extension === 'md' ? file.basename : file.name;
	const fileLink = `[[${fileName}]]`;
	await navigator.clipboard.writeText(fileLink);
	new Notice('✅ File link is copied!');
}

/**
 * Copy current file link with alias to clipboard
 */
export async function copyFileLinkWithAlias(app: App, editor: Editor, view: MarkdownView) {
	if (!view.file) {
		new Notice('⚠️ No file is currently open');
		return;
	}

	const fileCache = app.metadataCache.getFileCache(view.file);
	const aliases = fileCache?.frontmatter?.aliases;

	if (!aliases || !Array.isArray(aliases) || aliases.length === 0) {
		new Notice('⚠️ No aliases found in frontmatter');
		return;
	}

	const fileLink = `[[${view.file.basename}|${aliases[0]}]]`;
	await navigator.clipboard.writeText(fileLink);
	new Notice('✅ File link with alias is copied!');
}
