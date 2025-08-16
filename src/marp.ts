import { Editor, MarkdownView, Notice, Plugin, normalizePath } from 'obsidian';
const { shell } = require('electron');
import { TerminalService } from './terminal-service';
import { CrystalPluginSettings } from './settings';

export class MarpCommands {
	private terminalService: TerminalService;
	private settings: CrystalPluginSettings;
	private plugin: Plugin;

	constructor(terminalService: TerminalService, settings: CrystalPluginSettings, plugin: Plugin) {
		this.terminalService = terminalService;
		this.settings = settings;
		this.plugin = plugin;
	}

	/**
	 * Marpプレビューコマンドを直接実行する
	 */
	async executeMarpPreviewCommand(_editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの相対パス
			const activeFilePath = normalizePath(file.path);
			
			// 出力ファイル名（固定）- 常にVaultのrootに出力
			const outputPath = 'marp-preview.html';

			// テーマオプションの追加
			const themeOption = this.settings.marpThemePath 
				? ` --theme "${this.settings.marpThemePath}"` 
				: '';

			// Marpコマンドを生成
			const marpCommand = `marp -p${themeOption} "${activeFilePath}" -o "${outputPath}"`;

			new Notice('Marpプレビューを実行中...');
			
			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);
			
			if (result.exitCode === 0) {
				new Notice('Marpプレビューが完了しました');
			} else {
				new Notice(`Marpプレビューでエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp preview command:', error);
			new Notice('Marpプレビューの実行に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpエクスポートコマンドを直接実行する
	 */
	async executeMarpExportCommand(_editor: Editor, view: MarkdownView) {
		const file = view.file;
		if (!file) return;

		try {
			// アクティブファイルの相対パス
			const activeFilePath = normalizePath(file.path);

			// エクスポート先フォルダの決定
			const parentPath = file.parent?.path === '/' ? '' : (file.parent?.path || '');
			const exportFolderPath = this.settings.exportFolderPath || parentPath;
			
			// 出力ファイルパス（.pptx形式）
			const outputPath = exportFolderPath 
				? `${exportFolderPath}/${file.basename}.pptx`
				: `${file.basename}.pptx`;

			// テーマオプションの追加
			const themeOption = this.settings.marpThemePath 
				? ` --theme "${this.settings.marpThemePath}"` 
				: '';

			// Marpエクスポートコマンドを生成
			const marpCommand = `marp --allow-local-files${themeOption} "${activeFilePath}" -o "${outputPath}"`;

			new Notice('Marpエクスポートを実行中...');
			
			// コマンドを実行
			const result = await this.terminalService.executeCommand(marpCommand);
			
			if (result.exitCode === 0) {
				new Notice('Marpエクスポートが完了しました');
			} else {
				new Notice(`Marpエクスポートでエラーが発生しました: ${result.stderr}`);
			}
		} catch (error) {
			console.error('Failed to execute Marp export command:', error);
			new Notice('Marpエクスポートの実行に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpサーバーを起動してSlidesフォルダ全体を対象にする
	 */
	async executeMarpServerCommand() {
		// 設定チェック
		if (!this.settings.marpSlideFolderPath) {
			new Notice('Marp Slide Folder Path is not configured in settings');
			return;
		}

		try {
			// テーマオプションの追加
			const themeOption = this.settings.marpThemePath 
				? ` --theme "${this.settings.marpThemePath}"` 
				: '';

			// Marpサーバーコマンドを生成
			const marpCommand = `marp -s --allow-local-files${themeOption} "${this.settings.marpSlideFolderPath}"`;

			new Notice('Marpサーバーにアクセス中...');
			
			// サーバーをバックグラウンドで実行（非同期で起動、結果は待たない）
			this.terminalService.executeCommand(marpCommand);
			
			// 即座にブラウザを開く（サーバー起動を待つ）
			setTimeout(async () => {
				// WebViewerコアプラグインが有効かどうかを確認
				const isWebViewerEnabled = (this.plugin.app as any).internalPlugins.getEnabledPluginById?.('webviewer');
				
				if (isWebViewerEnabled) {
					try {
						const leaf = this.plugin.app.workspace.getLeaf("tab");
						await leaf.setViewState({
							type: 'webviewer',
							state: {
								url: 'http://localhost:8080',
								navigate: true,
							},
							active: true,
						});
						console.log('WebViewer opened successfully');
					} catch (error) {
						console.log('WebViewer failed to open, falling back to external browser:', error);
						shell.openExternal('http://localhost:8080');
					}
				} else {
					console.log('WebViewer core plugin is disabled, opening in external browser');
					shell.openExternal('http://localhost:8080');
				}
			}, 1000);
			
			// 遅延して起動完了通知
			setTimeout(() => {
				new Notice('Marpサーバーが起動しました');
			}, 2000);
		} catch (error) {
			console.error('Failed to start Marp server:', error);
			new Notice('Marpサーバーの起動に失敗しました: ' + error.message);
		}
	}

	/**
	 * Marpサーバーを停止する
	 */
	async stopMarpServerCommand() {
		try {
			new Notice('Marpサーバーを停止中...');
			
			// ポート8080を使用しているプロセスのみを終了
			const killCommand = process.platform === 'win32' 
				? 'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :8080\') do taskkill /F /PID %a'
				: 'lsof -ti:8080 | xargs kill -9';
			
			const result = await this.terminalService.executeCommand(killCommand);
			
			if (result.exitCode === 0) {
				new Notice('Marpサーバーを停止しました');
			} else {
				// プロセスが見つからない場合も正常とみなす
				new Notice('Marpサーバーを停止しました');
			}
		} catch (error) {
			console.error('Failed to stop Marp server:', error);
			new Notice('Marpサーバーの停止に失敗しました: ' + error.message);
		}
	}

	async onload() {
		this.plugin.addCommand({
			id: 'crystal-preview-marp-slide',
			name: 'Preview Marp Slide',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpPreviewCommand(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-export-marp-slide',
			name: 'Export Marp Slide',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.executeMarpExportCommand(editor, view);
			}
		});

		this.plugin.addCommand({
			id: 'crystal-marp-server',
			name: 'Start Marp Server',
			callback: () => {
				this.executeMarpServerCommand();
			}
		});

		this.plugin.addCommand({
			id: 'crystal-stop-marp-server',
			name: 'Stop Marp Server',
			callback: () => {
				this.stopMarpServerCommand();
			}
		});
	}
}
