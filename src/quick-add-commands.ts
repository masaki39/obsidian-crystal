import { App, Notice, TFile } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export class QuickAddCommands {
	private app: App;
	private settings: CrystalPluginSettings;

	constructor(app: App, settings: CrystalPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	/**
	 * Add task to daily note
	 */
	async addTaskToDailyNote() {
		// ユーザーにタスクを入力してもらう
		const task = await this.promptForTask();
		if (!task || task.trim() === "") {
			return;
		}

		// 今日の日付を取得
		const today = this.getTodayString();
		
		try {
			// デイリーノートのフォルダを設定から取得
			const dailyNotesFolder = this.getDailyNotesFolder();
			
			// デイリーノートフォルダ内で今日の日付のファイルを探す
			let dailyFile = this.findFileInFolder(today, dailyNotesFolder);
			
			if (!dailyFile) {
				// ファイルが存在しない場合は作成
				const filePath = dailyNotesFolder ? `${dailyNotesFolder}/${today}.md` : `${today}.md`;
				dailyFile = await this.app.vault.create(filePath, `- [ ] ${task}`);
				new Notice(`デイリーノートを作成してタスクを追加しました: ${today}`);
			} else {
				// ファイルが存在する場合は一番上にタスクを追加
				const content = await this.app.vault.read(dailyFile);
				const newContent = `- [ ] ${task}\n${content}`;
				await this.app.vault.modify(dailyFile, newContent);
				new Notice('デイリーノートにタスクを追加しました');
			}
		} catch (error) {
			new Notice('タスクの追加に失敗しました: ' + error.message);
			console.error('Add task to daily note error:', error);
		}
	}

	/**
	 * Add task to ToDo list
	 */
	async addTaskToTodo() {
		// ユーザーにタスクを入力してもらう
		const task = await this.promptForTask();
		if (!task || task.trim() === "") {
			return;
		}

		try {
			// ToDoファイルを探す
			const todoFile = this.findFileByName("ToDo");
			
			if (!todoFile) {
				new Notice('ToDoファイルが見つかりません');
				return;
			}

			// ファイルの内容を読み取り、"- Inbox"の行を探して下に追加
			await this.app.vault.process(todoFile, (data) => {
				return data.replace("- Inbox", `- Inbox\n\t- ${task}`);
			});

			new Notice('ToDoリストにタスクを追加しました');
		} catch (error) {
			new Notice('タスクの追加に失敗しました: ' + error.message);
			console.error('Add task to todo error:', error);
		}
	}

	/**
	 * Prompt user for task input
	 */
	private async promptForTask(): Promise<string | null> {
		return new Promise((resolve) => {
			let isComposing = false; // 日本語変換中かどうかを追跡

			const modal = document.createElement('div');
			modal.className = 'modal-container';
			modal.style.position = 'fixed';
			modal.style.top = '0';
			modal.style.left = '0';
			modal.style.width = '100%';
			modal.style.height = '100%';
			modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
			modal.style.zIndex = '1000';
			modal.style.display = 'flex';
			modal.style.alignItems = 'center';
			modal.style.justifyContent = 'center';

			const dialog = document.createElement('div');
			dialog.style.backgroundColor = 'var(--background-primary)';
			dialog.style.padding = '20px';
			dialog.style.borderRadius = '8px';
			dialog.style.width = '400px';
			dialog.style.maxWidth = '90%';

			const title = document.createElement('h3');
			title.textContent = 'タスクを入力してください';
			title.style.marginBottom = '16px';
			title.style.color = 'var(--text-normal)';

			const input = document.createElement('input');
			input.type = 'text';
			input.placeholder = 'タスクの内容...';
			input.style.width = '100%';
			input.style.padding = '8px';
			input.style.marginBottom = '16px';
			input.style.border = '1px solid var(--background-modifier-border)';
			input.style.borderRadius = '4px';
			input.style.backgroundColor = 'var(--background-primary)';
			input.style.color = 'var(--text-normal)';

			const buttonContainer = document.createElement('div');
			buttonContainer.style.display = 'flex';
			buttonContainer.style.gap = '8px';
			buttonContainer.style.justifyContent = 'flex-end';

			const cancelButton = document.createElement('button');
			cancelButton.textContent = 'キャンセル';
			cancelButton.style.padding = '8px 16px';
			cancelButton.style.border = '1px solid var(--background-modifier-border)';
			cancelButton.style.borderRadius = '4px';
			cancelButton.style.backgroundColor = 'var(--background-primary)';
			cancelButton.style.color = 'var(--text-normal)';
			cancelButton.style.cursor = 'pointer';

			const addButton = document.createElement('button');
			addButton.textContent = '追加';
			addButton.style.padding = '8px 16px';
			addButton.style.border = 'none';
			addButton.style.borderRadius = '4px';
			addButton.style.backgroundColor = 'var(--interactive-accent)';
			addButton.style.color = 'var(--text-on-accent)';
			addButton.style.cursor = 'pointer';

			// イベントリスナー
			const cleanup = () => {
				document.body.removeChild(modal);
			};

			const submitTask = () => {
				const task = input.value.trim();
				cleanup();
				resolve(task);
			};

			cancelButton.addEventListener('click', () => {
				cleanup();
				resolve(null);
			});

			addButton.addEventListener('click', submitTask);

			// 日本語変換状態を追跡
			input.addEventListener('compositionstart', () => {
				isComposing = true;
			});

			input.addEventListener('compositionend', () => {
				isComposing = false;
			});

			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					// 日本語変換中でない場合のみ送信
					if (!isComposing) {
						e.preventDefault();
						submitTask();
					}
				} else if (e.key === 'Escape') {
					cleanup();
					resolve(null);
				}
			});

			modal.addEventListener('click', (e) => {
				if (e.target === modal) {
					cleanup();
					resolve(null);
				}
			});

			// DOM に追加
			buttonContainer.appendChild(cancelButton);
			buttonContainer.appendChild(addButton);
			dialog.appendChild(title);
			dialog.appendChild(input);
			dialog.appendChild(buttonContainer);
			modal.appendChild(dialog);
			document.body.appendChild(modal);

			// フォーカスを設定
			input.focus();
		});
	}

	/**
	 * Get daily notes folder from settings
	 */
	private getDailyNotesFolder(): string {
		// プラグイン設定から取得
		if (this.settings.dailyNotesFolder && this.settings.dailyNotesFolder.trim() !== '') {
			return this.settings.dailyNotesFolder;
		}

		// デフォルトフォルダ
		return 'DailyNotes';
	}

	/**
	 * Get today's date string in format specified in settings
	 */
	private getTodayString(): string {
		const now = new Date();
		const format = this.settings.dailyNoteDateFormat || 'YYYY-MM-DD';
		
		// 基本的なフォーマット対応
		const year = now.getFullYear();
		const month = (now.getMonth() + 1).toString().padStart(2, '0');
		const day = now.getDate().toString().padStart(2, '0');
		
		return format
			.replace('YYYY', year.toString())
			.replace('MM', month)
			.replace('DD', day);
	}

	/**
	 * Find file by name
	 */
	private findFileByName(fileName: string): TFile | null {
		const files = this.app.vault.getMarkdownFiles();
		return files.find(file => file.basename === fileName) || null;
	}

	/**
	 * Find file in specific folder
	 */
	private findFileInFolder(fileName: string, folderName: string): TFile | null {
		const files = this.app.vault.getMarkdownFiles();
		const targetPath = folderName ? `${folderName}/${fileName}.md` : `${fileName}.md`;
		return files.find(file => file.path === targetPath) || null;
	}
} 