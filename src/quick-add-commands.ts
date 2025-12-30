import { App, Notice, TFile, Editor, MarkdownView } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { parseFrontmatter, promptForText } from './utils';
import { splitByTimeline, recombineSections } from './daily-notes';
import {
	appHasDailyNotesPluginLoaded,
	createDailyNote,
	DEFAULT_DAILY_NOTE_FORMAT,
	getDailyNoteSettings
} from 'obsidian-daily-notes-interface';
const moment = require('moment');

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

		try {
			const config = this.getDailyNotesConfig();
			if (!config) {
				return;
			}
			const today = moment();
			const todayKey = today.format(config.format);
			const timelineHeading = this.settings.dailyNoteTimelineHeading || '# Time Line';

			// デイリーノートフォルダ内で今日の日付のファイルを探す
			let dailyFile = this.findDailyNoteFile(todayKey, config.folder);
			
			if (!dailyFile) {
				dailyFile = await createDailyNote(today);
				new Notice(`デイリーノートを作成してタスクを追加しました: ${todayKey}`);
			}

			// ファイルが存在する場合は一番下にタスクを追加
			await this.app.vault.process(dailyFile, (content) => {
				const { frontmatter, content: body } = parseFrontmatter(content);
				const { before, timeline } = splitByTimeline(body, timelineHeading);
				const beforeTrimmed = before.trimEnd();
				const taskLine = `- [ ] ${task}`;
				const updatedBefore = this.settings.dailyNoteNewestFirst
					? (beforeTrimmed.length > 0 ? `${taskLine}\n${beforeTrimmed}` : taskLine)
					: (beforeTrimmed.length > 0 ? `${beforeTrimmed}\n${taskLine}` : taskLine);
				const newBody = recombineSections(updatedBefore, timeline);
				const newContent = `${frontmatter}${newBody}`;
				return newContent.endsWith('\n') ? newContent : `${newContent}\n`;
			});
			new Notice('デイリーノートにタスクを追加しました');
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
	/**
	 * Find file in specific folder
	 */
	private findDailyNoteFile(fileName: string, folderName: string): TFile | null {
		const targetPath = folderName ? `${folderName}/${fileName}.md` : `${fileName}.md`;
		const file = this.app.vault.getAbstractFileByPath(targetPath);
		return file instanceof TFile ? file : null;
	}

	private getDailyNotesConfig(): { folder: string; format: string } | null {
		if (!appHasDailyNotesPluginLoaded()) {
			new Notice('Daily Notes plugin is disabled.');
			return null;
		}
		const settings = getDailyNoteSettings();
		const folder = settings?.folder?.trim() ?? '';
		const format = settings?.format?.trim() || DEFAULT_DAILY_NOTE_FORMAT;
		return { folder, format };
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
