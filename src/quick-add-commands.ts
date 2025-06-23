import { App, Notice, TFile, Editor, MarkdownView } from 'obsidian';
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
				// ファイルが存在する場合は一番下にタスクを追加
				const content = await this.app.vault.read(dailyFile);
				const newContent = `${content}\n- [ ] ${task}`;
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
			const todoFile = this.app.vault.getFileByPath(this.settings.todoFileName + '.md');
			
			if (!todoFile) {
				new Notice('Can\'t find ToDo file');
				return;
			}

			const inboxName = this.settings.inboxName;

			// ファイルの内容を読み取り、"- Inbox"の行を探して下に追加
			await this.app.vault.process(todoFile, (data) => {
				const match = data.match(new RegExp(`\\n- ${inboxName}`, 'g'));
				if (match) { 
					return data.replace(`- ${inboxName}`, `- ${inboxName}\n\t- ${task}`);
				} else { 
					return data + `\n- ${inboxName}\n\t- ${task}`;
				}
			});

			new Notice('Added task to ToDo list');
		} catch (error) {
			new Notice('Failed to add task to ToDo list: ' + error.message);
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
	 * Find file in specific folder
	 */
	private findFileInFolder(fileName: string, folderName: string): TFile | null {
		const files = this.app.vault.getMarkdownFiles();
		const targetPath = folderName ? `${folderName}/${fileName}.md` : `${fileName}.md`;
		return files.find(file => file.path === targetPath) || null;
	}

	async insertMOC(editor: Editor, view: MarkdownView){
		const mocTemplate = `
# 📒関連

- 

# 📝ダッシュボード

- 

# 📜アーカイブ

- 
`;
		editor.replaceRange(mocTemplate, editor.getCursor());
		new Notice('MOCを挿入しました');
	}
} 