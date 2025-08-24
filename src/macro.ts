import { Editor, MarkdownView, Plugin } from 'obsidian';
import { MarpCommands } from './marp';
import { EditorCommands } from './editor-commands';

export class MacroCommands {
	private marpCommands: MarpCommands;
	private editorCommands: EditorCommands;
	private plugin: Plugin;

	constructor(marpCommands: MarpCommands, editorCommands: EditorCommands, plugin: Plugin) {
		this.marpCommands = marpCommands;
		this.editorCommands = editorCommands;
		this.plugin = plugin;
	}

	/**
	 * Execute move images to Marp folder followed by convert links to relative paths
	 */
	async moveImagesAndConvertLinks(editor: Editor, view: MarkdownView) {
		// First, move images to Marp folder
		await this.marpCommands.moveImagesToMarpFolder(editor, view);
		
		// Then, convert links to relative paths
		await this.editorCommands.convertLinksToRelativePaths(editor, view);
	}

	/**
	 * Initialize and register all macro commands
	 */
	onload() {
		this.plugin.addCommand({
			id: 'crystal-move-images-and-convert-links',
			name: 'Move Images to Marp Folder and Convert Links to Relative Paths',
			editorCallback: (editor: Editor, view: MarkdownView) =>
				this.moveImagesAndConvertLinks(editor, view)
		});
	}
}