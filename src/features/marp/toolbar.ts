import { MarkdownView, Plugin, setIcon } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import type { MarpCommands } from './commands';
import { slideRelativePath } from './server-url';

const HOST_CLASS = 'crystal-marp-toolbar-host';

interface ToolbarItem {
	icon: string;
	label: string;
	/** 前のボタンとの間に区切りを入れる */
	startsGroup?: boolean;
	onClick: (view: MarkdownView) => void;
}

/**
 * スライドフォルダ内のファイルを編集しているときだけ、
 * エディタ右下によく使うMarp操作のボタンを浮かせる。
 */
export class MarpSlideToolbar {
	private plugin: Plugin;
	private settings: CrystalPluginSettings;
	private marpCommands: MarpCommands;
	private toolbarEl: HTMLElement | null = null;
	private serverButtonEl: HTMLElement | null = null;
	private hostView: MarkdownView | null = null;

	constructor(plugin: Plugin, settings: CrystalPluginSettings, marpCommands: MarpCommands) {
		this.plugin = plugin;
		this.settings = settings;
		this.marpCommands = marpCommands;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
		this.update();
	}

	onload() {
		const refresh = () => this.update();

		this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', refresh));
		this.plugin.registerEvent(this.plugin.app.workspace.on('layout-change', refresh));
		this.plugin.registerEvent(this.plugin.app.workspace.on('file-open', refresh));
		this.marpCommands.onServerStateChange(() => this.renderServerButton());
		this.plugin.app.workspace.onLayoutReady(refresh);
	}

	onunload() {
		this.detach();
		this.toolbarEl?.remove();
		this.toolbarEl = null;
		this.serverButtonEl = null;
	}

	/**
	 * 表示条件を満たすビューを返す
	 */
	private targetView(): MarkdownView | null {
		if (!this.settings.marpShowSlideToolbar) return null;

		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file || view.getMode() !== 'source') return null;

		return slideRelativePath(view.file, this.settings.marpSlideFolderPath) ? view : null;
	}

	private update(): void {
		const view = this.targetView();

		if (!view) {
			this.detach();
			return;
		}

		if (!this.toolbarEl) {
			this.toolbarEl = this.createToolbar();
		}

		if (this.hostView !== view) {
			this.detach();
			view.contentEl.addClass(HOST_CLASS);
			view.contentEl.appendChild(this.toolbarEl);
			this.hostView = view;
		}

		this.renderServerButton();
	}

	private detach(): void {
		this.toolbarEl?.detach();
		this.hostView?.contentEl.removeClass(HOST_CLASS);
		this.hostView = null;
	}

	private items(): ToolbarItem[] {
		return [
			{
				icon: 'chevron-up',
				label: 'Previous slide',
				onClick: view => this.marpCommands.goToAdjacentSlide(view.editor, -1)
			},
			{
				icon: 'chevron-down',
				label: 'Next slide',
				onClick: view => this.marpCommands.goToAdjacentSlide(view.editor, 1)
			},
			{
				icon: 'arrow-up',
				label: 'Move slide up',
				startsGroup: true,
				onClick: view => this.marpCommands.moveCurrentSlide(view.editor, -1)
			},
			{
				icon: 'arrow-down',
				label: 'Move slide down',
				onClick: view => this.marpCommands.moveCurrentSlide(view.editor, 1)
			},
			{
				icon: 'file-down',
				label: 'Export to PPTX',
				startsGroup: true,
				onClick: view => this.marpCommands.executeMarpExportCommand(view.editor, view, 'pptx')
			},
			{
				icon: 'file-text',
				label: 'Export to PDF',
				onClick: view => this.marpCommands.executeMarpExportCommand(view.editor, view, 'pdf')
			}
		];
	}

	private createToolbar(): HTMLElement {
		const toolbar = createDiv({ cls: 'crystal-marp-toolbar' });

		for (const item of this.items()) {
			if (item.startsGroup) {
				toolbar.createDiv({ cls: 'crystal-marp-toolbar-separator' });
			}
			this.createButton(toolbar, item);
		}

		toolbar.createDiv({ cls: 'crystal-marp-toolbar-separator' });
		this.serverButtonEl = this.createButton(toolbar, {
			icon: 'play',
			label: 'Start Marp server',
			onClick: () => this.toggleServer()
		});

		return toolbar;
	}

	private createButton(parent: HTMLElement, item: ToolbarItem): HTMLElement {
		const button = parent.createDiv({ cls: 'clickable-icon crystal-marp-toolbar-button' });
		setIcon(button, item.icon);
		button.setAttr('aria-label', item.label);

		// クリックでエディタのフォーカスを奪わない
		button.addEventListener('mousedown', event => event.preventDefault());
		button.addEventListener('click', () => {
			const view = this.hostView;
			if (view) item.onClick(view);
		});

		return button;
	}

	private toggleServer(): void {
		if (this.marpCommands.isServerRunning()) {
			this.marpCommands.stopMarpServerCommand();
		} else {
			this.marpCommands.executeMarpServerCommand();
		}
	}

	/**
	 * サーバーの起動状態をボタンに反映する
	 */
	private renderServerButton(): void {
		if (!this.serverButtonEl) return;

		const running = this.marpCommands.isServerRunning();
		setIcon(this.serverButtonEl, running ? 'square' : 'play');
		this.serverButtonEl.setAttr('aria-label', running ? 'Stop Marp server' : 'Start Marp server');
		this.serverButtonEl.toggleClass('is-active', running);
	}
}
