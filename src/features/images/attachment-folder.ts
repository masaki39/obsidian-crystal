import type { App } from 'obsidian';

/**
 * Resolve the vault-relative folder where attachments should be saved, honoring
 * Obsidian's "attachment folder path" setting (absolute "/", same-folder ".",
 * or note-relative "./sub" forms). Returns '' for the vault root.
 */
export async function resolveAttachmentFolder(app: App): Promise<string> {
	const sourcePath = app.workspace.getActiveFile()?.path ?? '';
	// Probe Obsidian's resolver with a throwaway filename; the parent of the
	// returned path is the actual attachment folder. The probe file is never created.
	const probePath = await app.fileManager.getAvailablePathForAttachment('__crystal_probe__.tmp', sourcePath);
	const slash = probePath.lastIndexOf('/');
	return slash === -1 ? '' : probePath.substring(0, slash);
}
