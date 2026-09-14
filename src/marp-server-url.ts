import { App, TFile, WorkspaceLeaf, normalizePath } from 'obsidian';

/** Marp CLI のサーバーモードが待ち受けるアドレス */
export const MARP_SERVER_ORIGIN = 'http://localhost:8080';

/**
 * スライドフォルダ配下のMarkdownなら、フォルダからの相対パスを返す
 */
export function slideRelativePath(file: TFile, slideFolderPath?: string): string | null {
	const folder = slideFolderPath?.trim();
	if (!folder || file.extension !== 'md') {
		return null;
	}

	const normalized = normalizePath(folder);
	if (normalized === '/' || normalized === '') {
		return file.path;
	}

	const prefix = `${normalized}/`;
	return file.path.startsWith(prefix) ? file.path.slice(prefix.length) : null;
}

/**
 * スライドフォルダからの相対パスをサーバーのURLに変換する
 */
export function buildPageUrl(relativePath: string): string {
	const encoded = relativePath.split('/').map(encodeURIComponent).join('/');
	return `${MARP_SERVER_ORIGIN}/${encoded}`;
}

/**
 * ファイルに対応するサーバーのURL（スライドフォルダ外なら null）
 */
export function pageUrlForFile(file: TFile, slideFolderPath?: string): string | null {
	const relativePath = slideRelativePath(file, slideFolderPath);
	return relativePath ? buildPageUrl(relativePath) : null;
}

/**
 * サーバーのURLから vault 内のファイルパスを復元する
 */
export function vaultPathForUrl(url: string, slideFolderPath?: string): string | null {
	const folder = slideFolderPath?.trim();
	if (!folder) {
		return null;
	}

	try {
		const parsed = new URL(url);
		if (parsed.origin !== MARP_SERVER_ORIGIN) {
			return null;
		}

		const relativePath = decodeURIComponent(parsed.pathname).replace(/^\//, '');
		if (!relativePath) {
			return null;
		}

		const normalized = normalizePath(folder);
		return normalized === '/' || normalized === '' ? relativePath : `${normalized}/${relativePath}`;
	} catch {
		return null;
	}
}

/**
 * URLのハッシュからスライド番号（1始まり）を取り出す
 */
export function slideNumberFromUrl(url: string): number | null {
	try {
		const hash = new URL(url).hash.replace(/^#/, '');
		// bespoke は `#5` 形式。テキストフラグメントが付く場合があるので切り落とす
		const [value] = hash.split(':~:');
		if (!/^\d+$/.test(value)) {
			return null;
		}

		const slide = Number(value);
		return slide > 0 ? slide : null;
	} catch {
		return null;
	}
}

/** Web Viewer のビュータイプ */
export const WEBVIEWER_VIEW_TYPE = 'webviewer';

/**
 * Web Viewer が保持する Electron の webview 要素
 */
export function webviewOf(leaf: WorkspaceLeaf): any {
	return (leaf.view as any)?.webview ?? null;
}

/**
 * Web Viewer が現在表示しているURL
 */
export function webviewerUrl(leaf: WorkspaceLeaf): string | null {
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
 * Marpサーバーを表示している Web Viewer のリーフをすべて返す
 */
export function findMarpViewerLeaves(app: App): WorkspaceLeaf[] {
	const leaves = app.workspace.getLeavesOfType(WEBVIEWER_VIEW_TYPE);
	return leaves.filter(leaf => webviewerUrl(leaf)?.startsWith(MARP_SERVER_ORIGIN));
}

/**
 * Marpサーバーを表示している Web Viewer のリーフを探す
 */
export function findMarpViewerLeaf(app: App): WorkspaceLeaf | null {
	return findMarpViewerLeaves(app)[0] ?? null;
}
