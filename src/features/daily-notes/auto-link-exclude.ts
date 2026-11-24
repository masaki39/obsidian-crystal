/** Normalize one folder entry: trim whitespace, drop leading/trailing slashes. */
function normalizeFolder(folder: string): string {
	return folder.trim().replace(/^\/+/, '').replace(/\/+$/, '').trim();
}

/** Parse the settings textarea (one folder per line) into a clean folder list. */
export function parseExcludeFolders(text: string): string[] {
	return text.split(/\r?\n/).map(normalizeFolder).filter(f => f.length > 0);
}

/**
 * True when `path` (vault-root relative) lives inside any of `folders`.
 * Matching is per folder segment: `kaname/logs` matches `kaname/logs/a.md`
 * and `kaname/logs/sub/b.md`, but not `kaname/logs2/a.md`.
 */
export function isExcludedFromAutoLink(path: string, folders: string[]): boolean {
	return folders.some(raw => {
		const folder = normalizeFolder(raw);
		return folder.length > 0 && path.startsWith(`${folder}/`);
	});
}
