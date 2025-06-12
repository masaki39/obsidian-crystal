import { App, Notice, TFile, Modal } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { promptForText } from './utils';

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
				const newContent = this.orderTaskList(`- [ ] ${task}\n${content}`);
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
		return promptForText(this.app, 'タスクを入力してください', 'タスクの内容...', '追加');
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

	private orderTaskList(taskList: string): string {
		const lines = taskList.split('\n');
		const orderedLines = lines.sort((a, b) => {
			const aIsDone = a.trim().startsWith('- [x]');
			const bIsDone = b.trim().startsWith('- [x]');
			if (aIsDone && !bIsDone) return -1;
			if (!aIsDone && bIsDone) return 1;
			return 0;
		});
		return orderedLines.join('\n');
	}
} 