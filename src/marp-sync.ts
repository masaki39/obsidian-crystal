import { MarkdownView, Plugin, TFile, WorkspaceLeaf, normalizePath } from 'obsidian';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { CrystalPluginSettings } from './settings';
import { slideNumberForLine } from './marp-slide-index';

const MARP_SERVER_ORIGIN = 'http://localhost:8080';
const WEBVIEWER_VIEW_TYPE = 'webviewer';
const SYNC_DEBOUNCE_MS = 150;

/**
 * 編集中のカーソル位置に合わせて、Web Viewer で開いている
 * Marpサーバーのプレビューを対応するスライドへ移動させる。
 *
 * Marpのbespokeテンプレートは location.hash（`#<1始まりのスライド番号>`）で
 * 表示スライドを決め、hashchange を監視している。そのためハッシュを書き換えるだけで
 * ページを再読み込みせずにスライドを切り替えられる。
 * 外部ブラウザは制御できないため、コアプラグイン Web Viewer 使用時のみ動作する。
 */
export class MarpCursorSync {
	private plugin: Plugin;
	private settings: CrystalPluginSettings;
	private debounceId: number | null = null;

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
			this.plugin.app.workspace.on('active-leaf-change', () => this.scheduleSync())
		);
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

		const relativePath = this.slideRelativePath(file);
		if (!relativePath) return;

		// Marpサーバーを開いている Web Viewer がなければ何もしない
		const leaf = this.findServerLeaf();
		if (!leaf) return;

		const pageUrl = this.buildPageUrl(relativePath);
		const slide = slideNumberForLine(markdownView.editor.getValue(), markdownView.editor.getCursor().line);
		const targetUrl = `${pageUrl}#${slide}`;
		const currentUrl = this.currentUrl(leaf);

		if (currentUrl === targetUrl) return;

		if (!this.isSamePage(currentUrl, pageUrl)) {
			// 別ファイルを表示している場合のみページ遷移する
			await this.navigate(leaf, targetUrl);
			return;
		}

		// 同じページならハッシュだけ差し替える（再読み込みなし）
		const webview = this.getWebview(leaf);
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
	 * スライドフォルダ配下のファイルなら、フォルダからの相対パスを返す
	 */
	private slideRelativePath(file: TFile): string | null {
		const folder = this.settings.marpSlideFolderPath?.trim();
		if (!folder) return null;
		if (file.extension !== 'md') return null;

		const normalized = normalizePath(folder);
		if (normalized === '/' || normalized === '') {
			return file.path;
		}

		const prefix = `${normalized}/`;
		return file.path.startsWith(prefix) ? file.path.slice(prefix.length) : null;
	}

	private buildPageUrl(relativePath: string): string {
		const encoded = relativePath.split('/').map(encodeURIComponent).join('/');
		return `${MARP_SERVER_ORIGIN}/${encoded}`;
	}

	/**
	 * Marpサーバーを表示している Web Viewer のリーフを探す
	 */
	private findServerLeaf(): WorkspaceLeaf | null {
		const leaves = this.plugin.app.workspace.getLeavesOfType(WEBVIEWER_VIEW_TYPE);
		return leaves.find(leaf => this.currentUrl(leaf)?.startsWith(MARP_SERVER_ORIGIN)) ?? null;
	}

	private getWebview(leaf: WorkspaceLeaf): any {
		return (leaf.view as any)?.webview ?? null;
	}

	private currentUrl(leaf: WorkspaceLeaf): string | null {
		const view = leaf.view as any;

		try {
			const fromWebview = view?.webview?.getURL?.();
			if (fromWebview) return fromWebview;
		} catch {
			// webview がまだ準備できていない場合は他の手段にフォールバックする
		}

		if (typeof view?.url === 'string' && view.url) return view.url;

		const state = leaf.getViewState().state as { url?: string } | undefined;
		return state?.url ?? null;
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
}
