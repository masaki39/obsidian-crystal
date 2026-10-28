import { App, Editor, MarkdownView, Notice } from 'obsidian';

/**
 * Create a new file with timestamp filename
 */
export async function createTimestampFile(app: App) {
	const basefilename = generateTimestampFilename();
	try {
		const newFile = await app.vault.create(basefilename + '.md', '\n');
		await app.workspace.getLeaf().openFile(newFile);
		await openInInsertModeOrEditTitle(app);
	} catch (error) {
		new Notice('❌ Failed to create new file: ' + error.message);
	}
}

/**
 * Create a new file with link at cursor position
 */
export async function createLinkedTimestampFile(app: App, editor: Editor, view: MarkdownView) {
	const basefilename = generateTimestampFilename();
	try {
		// Insert link at cursor position
		editor.replaceSelection(`[[${basefilename}]] `);

		// Create new file
		const newFile = await app.vault.create(basefilename + '.md', '\n');
		await app.workspace.getLeaf().openFile(newFile);
		await openInInsertModeOrEditTitle(app);
	} catch (error) {
		new Notice('❌ Failed to create linked file: ' + error.message);
	}
}

/**
 * If vim mode is enabled, focus editor and enter insert mode.
 * Otherwise fall back to renaming the file title.
 */
async function openInInsertModeOrEditTitle(app: App) {
	const isVimMode = (app.vault as any).config?.vimMode;
	if (!isVimMode) {
		await (app as any).commands.executeCommandById("workspace:edit-file-title");
		return;
	}

	// Wait for the editor to be ready
	await new Promise(resolve => setTimeout(resolve, 50));

	const view = app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) return;

	const editor = view.editor;
	editor.focus();

	// Move cursor to the last line
	const lastLine = editor.lastLine();
	editor.setCursor({ line: lastLine, ch: 0 });

	// Enter vim insert mode by dispatching 'i' on the CM6 contentDOM
	const cm = (editor as any).cm;
	cm?.contentDOM?.dispatchEvent(
		new KeyboardEvent('keydown', { key: 'i', code: 'KeyI', bubbles: true, cancelable: true })
	);
}

/**
 * Generate timestamp filename in YYYYMMDDHHmmss format
 */
function generateTimestampFilename(): string {
	const now = new Date();
	const year = now.getFullYear().toString();
	const month = (now.getMonth() + 1).toString().padStart(2, '0');
	const day = now.getDate().toString().padStart(2, '0');
	const hour = now.getHours().toString().padStart(2, '0');
	const minute = now.getMinutes().toString().padStart(2, '0');
	const second = now.getSeconds().toString().padStart(2, '0');

	return `${year}${month}${day}${hour}${minute}${second}`;
}
