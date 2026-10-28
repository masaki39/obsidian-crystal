import { MarkdownView, Plugin, WorkspaceLeaf } from 'obsidian';
import { EditorView, ViewUpdate } from '@codemirror/view';
import type { CrystalPluginSettings } from '../../settings';
import { lineForSlideNumber, slideNumberForLine } from './slide-index';
import {
	WEBVIEWER_VIEW_TYPE,
	findMarpViewerLeaf,
	pageUrlForFile,
	slideNumberFromUrl,
	vaultPathForUrl,
	webviewOf,
	webviewerUrl
} from './server-url';

const MARKDOWN_VIEW_TYPE = 'markdown';
const SYNC_DEBOUNCE_MS = 150;

/**
 * 編集中のカーソル位置に合わせて、Web Viewer で開いている
 * Marpサーバーのプレビューを対応するスライドへ移動させる。
 *
 * Marpのbespokeテンプレートは location.hash（`#<1始まりのスライド番号>`）で
 * 表示スライドを決め、hashchange を監視している。そのためハッシュを書き換えるだけで
 * ページを再読み込みせずにスライドを切り替えられる。
 * 逆方向（プレビュー側でスライドを送ったらカーソルも移動する）は、
 * webview の did-navigate-in-page でハッシュの変化を受け取って実現する。
 * 外部ブラウザは制御できないため、コアプラグイン Web Viewer 使用時のみ動作する。
 */
export class MarpCursorSync {
	private plugin: Plugin;
	private settings: CrystalPluginSettings;
	private debounceId: number | null = null;
	private listenedWebviews = new WeakSet<object>();

	constructor(plugin: Plugin, settings: CrystalPluginSettings) {
		this.plugin = plugin;
		this.settings = settings;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	onload() {
		// カーソル移動・編集の両方を拾う
		this.plugin.registerEditorExtension(
			EditorView.updateListener.of((update: ViewUpdate) => {
				if (!update.selectionSet && !update.docChanged) return;
				this.scheduleSync();
			})
		);

		// ファイルを切り替えたときも追従させる
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('active-leaf-change', () => {
				this.scheduleSync();
				this.attachViewerListeners();
			})
		);

		// Web Viewer が開かれたら逆方向同期のリスナーを張る
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('layout-change', () => this.attachViewerListeners())
		);
		this.plugin.app.workspace.onLayoutReady(() => this.attachViewerListeners());
	}

	onunload() {
		if (this.debounceId !== null) {
			window.clearTimeout(this.debounceId);
			this.debounceId = null;
		}
	}

	/**
	 * 連続したカーソル移動をまとめる
	 */
	private scheduleSync(): void {
		if (!this.settings.marpSyncCursorToServer) return;

		if (this.debounceId !== null) {
			window.clearTimeout(this.debounceId);
		}

		this.debounceId = window.setTimeout(() => {
			this.debounceId = null;
			this.syncNow().catch(error => console.error('Marp cursor sync failed:', error));
		}, SYNC_DEBOUNCE_MS);
	}

	private async syncNow(): Promise<void> {
		const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		const file = markdownView?.file;
		if (!markdownView || !file) return;

		const pageUrl = pageUrlForFile(file, this.settings.marpSlideFolderPath);
		if (!pageUrl) return;

		// Marpサーバーを開いている Web Viewer がなければ何もしない
		const leaf = findMarpViewerLeaf(this.plugin.app);
		if (!leaf) return;

		const slide = slideNumberForLine(markdownView.editor.getValue(), markdownView.editor.getCursor().line);
		const targetUrl = `${pageUrl}#${slide}`;
		const currentUrl = webviewerUrl(leaf);

		if (currentUrl === targetUrl) return;

		if (!this.isSamePage(currentUrl, pageUrl)) {
			// 別ファイルを表示している場合のみページ遷移する
			await this.navigate(leaf, targetUrl);
			return;
		}

		// 同じページならハッシュだけ差し替える（再読み込みなし）
		const webview = webviewOf(leaf);
		if (!webview || typeof webview.executeJavaScript !== 'function') {
			await this.navigate(leaf, targetUrl);
			return;
		}

		try {
			await webview.executeJavaScript(`location.hash = ${JSON.stringify(`#${slide}`)}`);
		} catch (error) {
			console.error('Failed to move Marp preview slide, falling back to navigation:', error);
			await this.navigate(leaf, targetUrl);
		}
	}

	/**
	 * ハッシュを除いた部分が同じページかどうか
	 */
	private isSamePage(currentUrl: string | null, pageUrl: string): boolean {
		if (!currentUrl) return false;

		try {
			const current = new URL(currentUrl);
			const target = new URL(pageUrl);
			return current.origin === target.origin && current.pathname === target.pathname;
		} catch {
			return false;
		}
	}

	private async navigate(leaf: WorkspaceLeaf, url: string): Promise<void> {
		const view = leaf.view as any;

		if (typeof view?.navigate === 'function') {
			view.navigate(url);
			return;
		}

		await leaf.setViewState({
			type: WEBVIEWER_VIEW_TYPE,
			state: { url, navigate: true }
		});
	}

	/**
	 * Marpサーバーを開いている webview に、ページ内遷移のリスナーを登録する
	 */
	private attachViewerListeners(): void {
		for (const leaf of this.plugin.app.workspace.getLeavesOfType(WEBVIEWER_VIEW_TYPE)) {
			const webview = webviewOf(leaf);
			if (!webview || this.listenedWebviews.has(webview)) continue;

			this.listenedWebviews.add(webview);

			// registerDomEvent で登録しておくと unload 時に自動で解除される
			const handler = (event: any) => this.handleViewerNavigation(event?.url);
			this.plugin.registerDomEvent(webview as HTMLElement, 'did-navigate-in-page' as any, handler as any);
			this.plugin.registerDomEvent(webview as HTMLElement, 'did-navigate' as any, handler as any);
		}
	}

	/**
	 * プレビュー側のスライド移動をエディタのカーソルに反映する
	 */
	private handleViewerNavigation(url?: string): void {
		if (!this.settings.marpSyncSlideToCursor || !url) return;

		const slide = slideNumberFromUrl(url);
		if (slide === null) return;

		const vaultPath = vaultPathForUrl(url, this.settings.marpSlideFolderPath);
		if (!vaultPath) return;

		const markdownView = this.findMarkdownView(vaultPath);
		if (!markdownView) return;

		const editor = markdownView.editor;
		const content = editor.getValue();

		// 既にそのスライドを編集中なら動かさない。
		// （自分で書き換えたハッシュが返ってきたときにカーソルが飛ぶのも防げる）
		if (slideNumberForLine(content, editor.getCursor().line) === slide) return;

		const line = lineForSlideNumber(content, slide);
		editor.setCursor({ line, ch: 0 });
		editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
	}

	/**
	 * 指定パスのファイルを開いている Markdown ビューを探す
	 */
	private findMarkdownView(path: string): MarkdownView | null {
		for (const leaf of this.plugin.app.workspace.getLeavesOfType(MARKDOWN_VIEW_TYPE)) {
			const view = leaf.view as MarkdownView;
			if (view?.file?.path === path) return view;
		}

		return null;
	}
}
