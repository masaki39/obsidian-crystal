import { App, Editor, MarkdownView, Plugin, WorkspaceLeaf } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import { copyFileLink, copyFileLinkWithAlias } from './file-link';
import { organizeFileWithTags } from './file-organizer';
import { convertActiveFileToBulletList, increaseBlockquote, wrapWithSubscript, wrapWithSuperscript } from './formatting';
import { insertOgpLink } from './ogp-link';
import { convertLinksToRelativePaths } from './relative-links';
import { createLinkedTimestampFile, createTimestampFile } from './timestamp-file';

export class EditorCommands {
	private app: App;
	private settings: CrystalPluginSettings;
	private plugin: Plugin;

	constructor(app: App, settings: CrystalPluginSettings, plugin: Plugin) {
		this.app = app;
		this.settings = settings;
		this.plugin = plugin;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	createTimestampFile() {
		return createTimestampFile(this.app);
	}

	createLinkedTimestampFile(editor: Editor, view: MarkdownView) {
		return createLinkedTimestampFile(this.app, editor, view);
	}

	copyFileLink(editor?: Editor, view?: MarkdownView) {
		return copyFileLink(this.app, editor, view);
	}

	copyFileLinkWithAlias(editor: Editor, view: MarkdownView) {
		return copyFileLinkWithAlias(this.app, editor, view);
	}

	wrapWithSubscript(editor: Editor, view: MarkdownView) {
		wrapWithSubscript(editor, view);
	}

	wrapWithSuperscript(editor: Editor, view: MarkdownView) {
		wrapWithSuperscript(editor, view);
	}

	increaseBlockquote(editor: Editor, view: MarkdownView) {
		increaseBlockquote(editor, view);
	}

	organizeFileWithTags(editor: Editor, view: MarkdownView) {
		return organizeFileWithTags(this.app, this.settings, editor, view);
	}

	/** Also used by the Marp macro. */
	convertLinksToRelativePaths(editor: Editor, view: MarkdownView) {
		return convertLinksToRelativePaths(this.app, editor, view);
	}

	convertActiveFileToBulletList(editor: Editor, view: MarkdownView) {
		return convertActiveFileToBulletList(this.app, editor, view);
	}

	insertOgpLink(editor: Editor, view: MarkdownView, layout: 'horizontal' | 'vertical') {
		return insertOgpLink(this.app, editor, view, layout);
	}

	async onload() {
		// Reset vim to normal mode when leaving a leaf
		let previousLeaf: WorkspaceLeaf | null = null;
		this.plugin.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				const isVimMode = (this.app.vault as any).config?.vimMode;
				if (isVimMode && previousLeaf && previousLeaf !== leaf) {
					const view = previousLeaf.view;
					if (view instanceof MarkdownView) {
						const cm = (view.editor as any).cm;
						cm?.contentDOM?.dispatchEvent(
							new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true })
						);
					}
				}
				previousLeaf = leaf;
			})
		);

		// Editor Commands
		this.plugin.addCommand({
			id: 'crystal-create-timestamp-file',
			name: 'Editor: Create new file with timestamp',
			icon: 'file-plus',
			callback: () => {
				this.createTimestampFile();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-create-linked-timestamp-file',
			name: 'Editor: Create new file with link at cursor',
			icon: 'file-symlink',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.createLinkedTimestampFile(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-copy-file-link',
			name: 'Editor: Copy file link',
			icon: 'link',
			callback: () => {
				this.copyFileLink();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-copy-file-link-with-alias',
			name: 'Editor: Copy file link with alias',
			icon: 'link-2',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.copyFileLinkWithAlias(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-wrap-subscript',
			name: 'Editor: Wrap selection with subscript',
			icon: 'subscript',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.wrapWithSubscript(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-wrap-superscript',
			name: 'Editor: Wrap selection with superscript',
			icon: 'superscript',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.wrapWithSuperscript(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-increase-blockquote',
			name: 'Editor: Increase blockquote level',
			icon: 'quote',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.increaseBlockquote(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-organize-file-with-tags',
			name: 'Editor: Organize file with prefix and tags',
			icon: 'folder-tree',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.organizeFileWithTags(editor, view);
			}
		});

		// Convert Links Command
		this.plugin.addCommand({
			id: 'crystal-convert-links-to-relative-paths',
			name: 'Editor: Convert links to relative paths',
			icon: 'route',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.convertLinksToRelativePaths(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-convert-active-file-to-bullet-list',
			name: 'Editor: Convert active file to bullet list',
			icon: 'list',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.convertActiveFileToBulletList(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-insert-ogp-link-horizontal',
			name: 'Editor: Insert OGP link (horizontal)',
			icon: 'rectangle-horizontal',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insertOgpLink(editor, view, 'horizontal');
			}
		});

		this.plugin.addCommand({
			id: 'crystal-insert-ogp-link-vertical',
			name: 'Editor: Insert OGP link (vertical)',
			icon: 'rectangle-vertical',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.insertOgpLink(editor, view, 'vertical');
			}
		});
	}
}
