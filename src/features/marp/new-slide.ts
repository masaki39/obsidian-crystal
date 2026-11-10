import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';

const moment = require('moment');

export type SlideTitleSource = 'basename' | 'alias';

/** Characters Obsidian can't use in a file name, or that break wikilinks. */
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|#^[\]]/g;

/** Title of the parent note: aliases[0] when requested and present, otherwise the basename. */
export function getParentTitle(basename: string, frontmatter: Record<string, unknown> | undefined, source: SlideTitleSource): string {
	if (source === 'alias') {
		const aliases = frontmatter?.aliases ?? frontmatter?.alias;
		const first = Array.isArray(aliases) ? aliases[0] : aliases;
		if (typeof first === 'string' && first.trim()) return first.trim();
	}
	return basename;
}

/** `<prefix><date><separator><title>` with empty parts dropped. Returns the basename (no extension). */
export function buildSlideBasename(settings: CrystalPluginSettings, title: string, now: Date = new Date()): string {
	const date = settings.marpNewSlideDateFormat.trim()
		? moment(now).format(settings.marpNewSlideDateFormat.trim())
		: '';
	const safeTitle = title.replace(ILLEGAL_FILENAME_CHARS, ' ').replace(/\s+/g, ' ').trim();
	const body = [date, safeTitle].filter(Boolean).join(settings.marpNewSlideSeparator);
	const name = `${settings.marpNewSlidePrefix}${body}`.replace(ILLEGAL_FILENAME_CHARS, ' ').trim();
	return name || 'Untitled slide';
}

/**
 * Expand `{{title}}`, `{{date}}` (file-name date format, or YYYY-MM-DD when
 * that is empty) and `{{date:FORMAT}}` (any moment.js format).
 */
export function expandPlaceholders(template: string, settings: CrystalPluginSettings, title: string, now: Date = new Date()): string {
	const defaultFormat = settings.marpNewSlideDateFormat.trim() || 'YYYY-MM-DD';
	return template
		.replace(/\{\{title\}\}/g, () => title)
		.replace(/\{\{date(?::([^}]*))?\}\}/g, (_, format?: string) =>
			moment(now).format(format?.trim() || defaultFormat));
}

/** Initial file content: Marp frontmatter defaults plus a title slide. */
export function buildSlideContent(settings: CrystalPluginSettings, title: string, now: Date = new Date()): string {
	const lines = ['---', 'marp: true'];
	const theme = settings.marpNewSlideTheme.trim();
	if (theme) lines.push(`theme: ${JSON.stringify(theme)}`);
	if (settings.marpNewSlidePaginate) lines.push('paginate: true');
	const header = expandPlaceholders(settings.marpNewSlideHeader, settings, title, now).trim();
	if (header) lines.push(`header: ${JSON.stringify(header)}`);
	lines.push('---', '', `# ${title}`, '');
	return lines.join('\n');
}

/** Append `link` to a frontmatter list property unless the same target is already there. */
function appendLink(app: App, fm: Record<string, unknown>, property: string, target: TFile, sourcePath: string) {
	const existing = fm[property];
	const arr: unknown[] = existing === undefined || existing === null
		? []
		: Array.isArray(existing) ? existing.slice() : [existing];
	const already = arr.some((v) => {
		if (typeof v !== 'string') return false;
		const m = v.trim().match(/^\[\[([^\]|#]+)/);
		return !!m && app.metadataCache.getFirstLinkpathDest(m[1].trim(), sourcePath)?.path === target.path;
	});
	if (already) return;
	arr.push(app.fileManager.generateMarkdownLink(target, sourcePath));
	fm[property] = arr;
}

async function ensureFolder(app: App, folderPath: string) {
	if (!folderPath || folderPath === '/') return;
	const existing = app.vault.getAbstractFileByPath(folderPath);
	if (existing instanceof TFolder) return;
	await app.vault.createFolder(folderPath);
}

function uniquePath(app: App, folder: string, basename: string): string {
	const dir = folder && folder !== '/' ? `${folder}/` : '';
	let path = normalizePath(`${dir}${basename}.md`);
	for (let i = 1; app.vault.getAbstractFileByPath(path); i++) {
		path = normalizePath(`${dir}${basename} ${i}.md`);
	}
	return path;
}

/**
 * Create a Marp slide note from the active note: link it from the parent's
 * slide property, link the parent back from the slide, and open it in a new tab.
 */
export async function createSlideFromNote(app: App, settings: CrystalPluginSettings, parent: TFile) {
	try {
		const frontmatter = app.metadataCache.getFileCache(parent)?.frontmatter;
		const title = getParentTitle(parent.basename, frontmatter, settings.marpNewSlideTitleSource);

		const configured = settings.marpSlideFolderPath.trim();
		const folder = configured ? normalizePath(configured) : (parent.parent?.path ?? '');
		await ensureFolder(app, folder);

		const path = uniquePath(app, folder, buildSlideBasename(settings, title));
		const slide = await app.vault.create(path, buildSlideContent(settings, title));

		const childProp = settings.marpNewSlideChildProperty.trim();
		if (childProp) {
			await app.fileManager.processFrontMatter(slide, (fm) => appendLink(app, fm, childProp, parent, slide.path));
		}
		const parentProp = settings.marpNewSlideParentProperty.trim();
		if (parentProp) {
			await app.fileManager.processFrontMatter(parent, (fm) => appendLink(app, fm, parentProp, slide, parent.path));
		}

		await app.workspace.getLeaf('tab').openFile(slide);
		new Notice(`✅ Slide created: ${slide.basename}`);
	} catch (error) {
		new Notice('❌ Failed to create slide: ' + (error as Error).message);
	}
}
