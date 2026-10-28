import { MarkdownView, Notice, Plugin } from 'obsidian';
const { shell } = require('electron');
const http = require('http');
import type { ChildProcess } from 'child_process';
import type { TerminalService } from '../../shared/terminal-service';
import type { CrystalPluginSettings } from '../../settings';
import { getThemeSetOption } from './options';
import { MARP_SERVER_ORIGIN, findMarpViewerLeaf, findMarpViewerLeaves, pageUrlForFile } from './server-url';
import { slideNumberForLine } from './slide-index';

/** The `marp -s` server process: start/stop, liveness polling and the viewer tab. */
export class MarpServer {
	private serverMonitorId: number | null = null;
	private serverProcess: ChildProcess | null = null;
	private startPollTimeoutId: number | null = null;
	private serverRunning = false;
	private serverStateListeners: (() => void)[] = [];

	constructor(
		private terminalService: TerminalService,
		private plugin: Plugin,
		private getSettings: () => CrystalPluginSettings
	) {}

	private get settings(): CrystalPluginSettings {
		return this.getSettings();
	}

	/**
	 * Marpサーバーが起動中か（このプラグインが把握している範囲で）
	 */
	isServerRunning(): boolean {
		return this.serverRunning;
	}

	/**
	 * サーバーの起動状態が変わったときに呼ばれるリスナーを登録する
	 */
	onServerStateChange(listener: () => void): void {
		this.serverStateListeners.push(listener);
	}

	private setServerRunning(running: boolean): void {
		if (this.serverRunning === running) return;

		this.serverRunning = running;
		this.serverStateListeners.forEach(listener => listener());
	}

	/**
	 * Marpサーバーを起動してSlidesフォルダ全体を対象にする
	 */
	async executeMarpServerCommand() {
		// 設定チェック
		if (!this.settings.marpSlideFolderPath) {
			new Notice('⚠️ Marp Slide Folder Path is not configured in settings');
			return;
		}

		try {
			// 既に8080が応答している場合は二重起動しない。
			// （前回起動したサーバーが残っている場合、新しい marp は
			//   ポート衝突で即死するのに古いサーバーの応答で成功に見えてしまう）
			// アクティブファイルがスライドフォルダ内ならそのページを直接開く
			const pageUrl = this.activePageUrl();

			if (await this.isServerAlive()) {
				new Notice('ℹ️ Marpサーバーは既に起動しています');
				this.setServerRunning(true);
				await this.openServerInBrowser(pageUrl);
				this.startServerMonitor();
				return;
			}

			const themeOption = getThemeSetOption(this.settings);

			// Marpサーバーコマンドを生成
				const marpCommand = `marp -s --allow-local-files${themeOption} -- "${this.settings.marpSlideFolderPath}"`;

			new Notice('⏳ Marpサーバーを起動中...');

			// サーバーをバックグラウンドで起動し、停止できるようプロセスを保持する
			const child = this.terminalService.spawnBackgroundCommand(marpCommand);
			this.serverProcess = child;

			// パイプが詰まらないよう出力は必ず消費する（ポート衝突の検知にも使う）
			child.stdout?.on('data', (data: Buffer) => console.log('[marp server]', data.toString().trim()));
			child.stderr?.on('data', (data: Buffer) => console.error('[marp server]', data.toString().trim()));
			child.on('close', () => {
				if (this.serverProcess === child) {
					this.serverProcess = null;
					this.setServerRunning(false);
				}
			});
			child.on('error', (error: Error) => {
				if (this.serverProcess === child) {
					this.serverProcess = null;
					this.setServerRunning(false);
				}
				console.error('Marp server process error:', error);
			});

			// サーバーの応答を確認してからブラウザを開く
			this.waitForServerAndOpen(pageUrl);
		} catch (error) {
			console.error('Failed to start Marp server:', error);
			new Notice('❌ Marpサーバーの起動に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpサーバーを停止する
	 */
	async stopMarpServerCommand() {
		try {
			new Notice('⏳ Marpサーバーを停止中...');

			// プロセス監視と起動待ちを停止
			this.stopServerMonitor();
			this.stopStartPolling();
			this.setServerRunning(false);

			// プレビューのタブを閉じる。プロセスを止めた後だと webview が
			// エラーページに遷移してURLで判定できなくなるため、kill より先に行う
			this.closeViewerTabs();

			// このプラグインが起動したプロセスはプロセスグループごと停止する
			const killed = this.killServerProcess();

			if (!killed) {
				// ハンドルを持っていない場合（Obsidian再起動後に残った孤児プロセスなど）の
				// フォールバック。ポート8080の持ち主が marp の場合のみ終了させる。
				const killCommand = process.platform === 'win32'
					? 'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :8080\') do taskkill /F /PID %a'
					: 'for pid in $(lsof -ti:8080); do ps -p "$pid" -o args= 2>/dev/null | grep -qi marp && kill "$pid"; done';

				await this.terminalService.executeCommand(killCommand);
			}

			// プロセスが見つからない場合も停止済みとみなす
			new Notice('✅ Marpサーバーを停止しました');
		} catch (error) {
			console.error('Failed to stop Marp server:', error);
			new Notice('❌ Marpサーバーの停止に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpサーバーを表示している Web Viewer のタブを閉じる。
	 * 外部ブラウザで開いた場合は制御できないため何もしない
	 */
	private closeViewerTabs(): void {
		for (const leaf of findMarpViewerLeaves(this.plugin.app)) {
			leaf.detach();
		}
	}

	/**
	 * 保持しているサーバープロセスをプロセスグループごと停止する
	 * @returns 停止シグナルを送れた場合 true
	 */
	private killServerProcess(): boolean {
		const child = this.serverProcess;
		this.serverProcess = null;

		if (!child || child.pid === undefined || child.exitCode !== null || child.signalCode !== null) {
			return false;
		}

		try {
			// detached で起動しているのでプロセスグループ(-pid)に送り、
			// ログインシェル配下の marp 本体まで確実に終了させる
			process.kill(-child.pid, 'SIGTERM');
			return true;
		} catch (error) {
			console.error('Failed to kill Marp server process:', error);
			return false;
		}
	}

	/**
	 * プラグインのアンロード時に呼び出し、サーバーを残さず後片付けする
	 */
	onunload(): void {
		this.stopServerMonitor();
		this.stopStartPolling();
		this.killServerProcess();
	}

	/**
	 * Marpサーバー(localhost:8080)が応答するか確認する
	 */
	private async isServerAlive(): Promise<boolean> {
		return new Promise((resolve) => {
			const req = http.get(MARP_SERVER_ORIGIN, (res: any) => {
				resolve(res.statusCode === 200);
			});

			req.on('error', () => {
				resolve(false);
			});

			req.setTimeout(1000, () => {
				req.destroy();
				resolve(false);
			});
		});
	}

	/**
	 * サーバーの応答を確認してからブラウザを開く
	 */
	private async waitForServerAndOpen(pageUrl: string): Promise<void> {
		const maxAttempts = 30; // 最大30回試行（30秒）
		let attempts = 0;

		const tryOpenBrowser = async () => {
			this.startPollTimeoutId = null;
			attempts++;

			if (await this.isServerAlive()) {
				this.setServerRunning(true);
				await this.openServerInBrowser(pageUrl);
				new Notice('✅ Marpサーバーが起動しました');
				// 起動を確認できたらプロセス監視を開始する
				this.startServerMonitor();
				return;
			}

			// 起動に失敗してプロセスが終了している場合は待ち続けない
			// （ポート衝突などはここで検知される）
			if (!this.serverProcess) {
				new Notice('❌ Marpサーバーの起動に失敗しました');
				return;
			}

			if (attempts >= maxAttempts) {
				new Notice('⚠️ Marpサーバーの起動を確認できませんでしたが、ブラウザを開きます');
				shell.openExternal(pageUrl);
				return;
			}

			// 1秒後に再試行
			this.startPollTimeoutId = window.setTimeout(tryOpenBrowser, 1000);
		};

		tryOpenBrowser();
	}

	/**
	 * アクティブファイルに対応するページのURL。
	 * スライドフォルダ外のファイル（または未選択）ならサーバーのトップを返す
	 */
	private activePageUrl(): string {
		const file = this.plugin.app.workspace.getActiveFile();
		const url = file ? pageUrlForFile(file, this.settings.marpSlideFolderPath) : null;
		if (!url) return MARP_SERVER_ORIGIN;

		// 開いた直後に1枚目ではなく編集中のスライドが出るよう、
		// カーソル位置のスライド番号をハッシュ（bespokeの `#5` 形式）で渡す
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.editor || view.file !== file) return url;

		const slide = slideNumberForLine(view.editor.getValue(), view.editor.getCursor().line);
		return `${url}#${slide}`;
	}

	/**
	 * 起動中のサーバーを WebViewer（無効なら外部ブラウザ）で開く
	 */
	private async openServerInBrowser(pageUrl: string = MARP_SERVER_ORIGIN): Promise<void> {
		const isWebViewerEnabled = (this.plugin.app as any).internalPlugins.getEnabledPluginById?.('webviewer');

		if (isWebViewerEnabled) {
			// 既にサーバーを開いているタブがあれば使い回す
			const existingLeaf = findMarpViewerLeaf(this.plugin.app);
			if (existingLeaf && typeof (existingLeaf.view as any).navigate === 'function') {
				(existingLeaf.view as any).navigate(pageUrl);
				this.plugin.app.workspace.revealLeaf(existingLeaf);
				return;
			}

			try {
				const leaf = this.plugin.app.workspace.getLeaf("tab");
				await leaf.setViewState({
					type: 'webviewer',
					state: {
						url: pageUrl,
						navigate: true,
					},
					active: true,
				});
				console.log('WebViewer opened successfully');
				return;
			} catch (error) {
				console.log('WebViewer failed to open, falling back to external browser:', error);
			}
		} else {
			console.log('WebViewer core plugin is disabled, opening in external browser');
		}

		shell.openExternal(pageUrl);
	}

	/**
	 * 起動待ちのポーリングを止める
	 */
	private stopStartPolling(): void {
		if (this.startPollTimeoutId !== null) {
			window.clearTimeout(this.startPollTimeoutId);
			this.startPollTimeoutId = null;
		}
	}

	/**
	 * サーバープロセスを定期的にポーリングし、停止を検知したら通知する
	 */
	private startServerMonitor(): void {
		// 既存の監視があればクリアしてから開始（二重起動防止）
		this.stopServerMonitor();

		const intervalId = window.setInterval(async () => {
			if (!(await this.isServerAlive())) {
				this.stopServerMonitor();
				this.setServerRunning(false);
				new Notice('✅ Marpサーバーが停止しました');
			}
		}, 5000);

		// unload 時に確実にクリーンアップされるよう登録
		this.plugin.registerInterval(intervalId);
		this.serverMonitorId = intervalId;
	}

	/**
	 * サーバープロセスの監視を停止する
	 */
	private stopServerMonitor(): void {
		if (this.serverMonitorId !== null) {
			window.clearInterval(this.serverMonitorId);
			this.serverMonitorId = null;
		}
	}
}
