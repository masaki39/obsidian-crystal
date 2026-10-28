import type { Editor, MarkdownView, Plugin } from 'obsidian';
import type { TerminalService } from '../../shared/terminal-service';
import type { CrystalPluginSettings } from '../../settings';
import { MarpExporter } from './export';
import { getThemeSetOption } from './options';
import { MarpImages } from './images';
import { goToAdjacentSlide, moveCurrentSlide } from './navigation';
import { MarpServer } from './server';

export class MarpCommands {
	private settings: CrystalPluginSettings;
	private plugin: Plugin;
	private exporter: MarpExporter;
	private server: MarpServer;
	private images: MarpImages;

	constructor(terminalService: TerminalService, settings: CrystalPluginSettings, plugin: Plugin) {
		this.settings = settings;
		this.plugin = plugin;
		this.exporter = new MarpExporter(terminalService, plugin, () => this.settings);
		this.server = new MarpServer(terminalService, plugin, () => this.settings);
		this.images = new MarpImages(plugin, () => this.settings);
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	/**
	 * Marpサーバーが起動中か（このプラグインが把握している範囲で）
	 */
	isServerRunning(): boolean {
		return this.server.isServerRunning();
	}

	/**
	 * サーバーの起動状態が変わったときに呼ばれるリスナーを登録する
	 */
	onServerStateChange(listener: () => void): void {
		this.server.onServerStateChange(listener);
	}

	private getThemeSetOption(): string {
		return getThemeSetOption(this.settings);
	}

	executeMarpPreviewCommand(editor: Editor, view: MarkdownView) {
		return this.exporter.executeMarpPreviewCommand(editor, view);
	}

	executeMarpExportCommand(editor: Editor, view: MarkdownView, format: string = 'pptx', editable: boolean = false) {
		return this.exporter.executeMarpExportCommand(editor, view, format, editable);
	}

	executeMarpExportHtmlFolderCommand(editor: Editor, view: MarkdownView) {
		return this.exporter.executeMarpExportHtmlFolderCommand(editor, view);
	}

	executeMarpNotesCommand(editor: Editor, view: MarkdownView) {
		return this.exporter.executeMarpNotesCommand(editor, view);
	}

	executeMarpServerCommand() {
		return this.server.executeMarpServerCommand();
	}

	stopMarpServerCommand() {
		return this.server.stopMarpServerCommand();
	}

	/**
	 * プラグインのアンロード時に呼び出し、サーバーを残さず後片付けする
	 */
	onunload(): void {
		this.server.onunload();
	}

	goToAdjacentSlide(editor: Editor, direction: -1 | 1) {
		goToAdjacentSlide(editor, direction);
	}

	moveCurrentSlide(editor: Editor, direction: -1 | 1) {
		moveCurrentSlide(editor, direction);
	}

	/** Also used by the macro command. */
	moveImagesToMarpFolder(editor: Editor, view: MarkdownView) {
		return this.images.moveImagesToMarpFolder(editor, view);
	}

	async onload() {
		this.plugin.addCommand({
			id: 'crystal-preview-marp-slide',
			name: 'Marp: Preview slide',
			icon: 'eye',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpPreviewCommand(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide',
			name: 'Marp: Export slide (PPTX)',
			icon: 'file-down',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view, 'pptx');
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide-editable',
			name: 'Marp: Export slide (PPTX editable)',
			icon: 'file-pen',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view, 'pptx', true);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide-html',
			name: 'Marp: Export slide (HTML)',
			icon: 'file-code',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view, 'html');
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide-html-folder',
			name: 'Marp: Export slide (HTML folder with attachments)',
			icon: 'folder-down',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportHtmlFolderCommand(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide-pdf',
			name: 'Marp: Export slide (PDF)',
			icon: 'file-text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view, 'pdf');
			}
		});

		this.plugin.addCommand({
			id: 'crystal-marp-server',
			name: 'Marp: Start server',
			icon: 'play',
			callback: () => {
				this.executeMarpServerCommand();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-stop-marp-server',
			name: 'Marp: Stop server',
			icon: 'square',
			callback: () => {
				this.stopMarpServerCommand();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-marp-next-slide',
			name: 'Marp: Go to next slide',
			icon: 'chevron-down',
			editorCallback: (editor: Editor) => {
				this.goToAdjacentSlide(editor, 1);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-marp-previous-slide',
			name: 'Marp: Go to previous slide',
			icon: 'chevron-up',
			editorCallback: (editor: Editor) => {
				this.goToAdjacentSlide(editor, -1);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-marp-move-slide-down',
			name: 'Marp: Move slide down',
			icon: 'arrow-down',
			editorCallback: (editor: Editor) => {
				this.moveCurrentSlide(editor, 1);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-marp-move-slide-up',
			name: 'Marp: Move slide up',
			icon: 'arrow-up',
			editorCallback: (editor: Editor) => {
				this.moveCurrentSlide(editor, -1);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-move-images-to-marp-folder',
			name: 'Marp: Move images to Marp folder',
			icon: 'folder-input',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.moveImagesToMarpFolder(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-notes',
			name: 'Marp: Export presenter notes',
			icon: 'sticky-note',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpNotesCommand(editor, view);
			}
		});
	}
}
