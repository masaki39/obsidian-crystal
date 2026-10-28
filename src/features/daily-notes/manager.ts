import { App, Plugin, TFile, MarkdownView, Notice } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import { promptForText } from '../../shared/ui/prompt-modal';
import { registerDailyNoteAutoLink } from './auto-link';
import { registerDailyNoteAutoSort } from './auto-sort';
import { registerDailyNoteCommands } from './commands';
import { getDailyNoteFilePath, isDailyNotesPluginLoaded } from './paths';
import { orderTaskList } from './task-order';
import { recombineSections, splitByTimeline, transformBeforeTimeline } from './timeline';
import { createDailyNote, getDateFromFile } from 'obsidian-daily-notes-interface';
const moment = require('moment');

export class DailyNotesManager {
    private app: App;
    private settings: CrystalPluginSettings;
    private plugin: Plugin;

    constructor(app: App, settings: CrystalPluginSettings, plugin: Plugin) {
        this.app = app;
        this.settings = settings;
        this.plugin = plugin;
    }

    updateSettings(settings: CrystalPluginSettings) {
        this.settings = settings;
    }

    /**
     * 現在アクティブなファイルから基準日付を取得する
     */
    private getBaseDateFromActiveFile(): Date {
        const activeFile = this.app.workspace.getActiveFile();
        
        if (activeFile) {
            const date = getDateFromFile(activeFile, 'day');
            if (date) {
                return date.toDate();
            }
        }
        
        // アクティブファイルから日付が抽出できない場合は今日を返す
        return new Date();
    }

    /**
     * 指定された日付のデイリーノートを開くか作成する
     */
    async openOrCreateDailyNote(date: Date): Promise<void> {
        try {
            const file = await this.ensureDailyNoteFile(date);
            if (!file) {
                return;
            }

            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            const pinned = view?.leaf.getViewState().pinned;
            if (view && pinned) {
                view.leaf.setPinned(false);
                await this.app.workspace.getLeaf().openFile(file as TFile);
                view.leaf.setPinned(true);
            } else {
                await this.app.workspace.getLeaf().openFile(file as TFile);
            }
            
        } catch (error) {
            console.error('Error opening/creating daily note:', error);
        }
    }

    /**
     * 今日のデイリーノートを開く/作成する
     */
    async openToday(): Promise<void> {
        const today = new Date();
        await this.openOrCreateDailyNote(today);
    }

    /**
     * 現在のファイルの前日のデイリーノートを開く/作成する
     */
    async openYesterday(): Promise<void> {
        const baseDate = this.getBaseDateFromActiveFile();
        const yesterday = new Date(baseDate);
        yesterday.setDate(yesterday.getDate() - 1);
        await this.openOrCreateDailyNote(yesterday);
    }

    /**
     * 現在のファイルの翌日のデイリーノートを開く/作成する
     */
    async openTomorrow(): Promise<void> {
        const baseDate = this.getBaseDateFromActiveFile();
        const tomorrow = new Date(baseDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        await this.openOrCreateDailyNote(tomorrow);
    }

    private orderTaskList(taskList: string): string {
        return orderTaskList(taskList, this.settings.dailyNoteNewestFirst);
    }

    private formatTimelineBlock(text: string, time: string, color?: string): string[] {
        const tag = color ? `[!timeline|${color}]` : '[!timeline]';
        const blockLines = [`> ${tag} ${time}`];
        const contentLines = text.split('\n').map(line => line.trimEnd());
        for (const line of contentLines) {
            blockLines.push(`> ${line}`);
        }
        return blockLines;
    }

    private async ensureDailyNoteFile(date: Date): Promise<TFile | null> {
        if (!isDailyNotesPluginLoaded()) {
            new Notice('⚠️ Daily Notes plugin is disabled.');
            return null;
        }
        const filePath = getDailyNoteFilePath(date);
        if (filePath) {
            const existing = this.app.vault.getAbstractFileByPath(filePath);
            if (existing instanceof TFile) {
                return existing;
            }
        }
        if (typeof window === 'undefined') {
            return null;
        }
        try {
            return await createDailyNote(moment(date));
        } catch (error) {
            return null;
        }
    }

    /** Returns whether the block was written. */
    async appendToTimeline(text: string, date: Date = new Date(), color?: string): Promise<boolean> {
        try {
            const file = await this.ensureDailyNoteFile(date);
            if (!file) {
                return false;
            }
            const heading = this.settings.dailyNoteTimelineHeading || '# Time Line';
            const content = await this.app.vault.read(file);
            const timeStamp = moment(date).format('HH:mm');
            const blockLines = this.formatTimelineBlock(text, timeStamp, color);
            const { before, timeline } = splitByTimeline(content, heading);
            const timelineLines = timeline ? timeline.split('\n') : [];
            const newestFirst = this.settings.dailyNoteNewestFirst;

            if (timelineLines.length === 0 || timelineLines[0].trim() !== heading.trim()) {
                timelineLines.unshift(heading);
            }

            if (newestFirst) {
                if (timelineLines.length === 1) {
                    timelineLines.push('');
                }
                let insertIndex = 1;
                if (timelineLines[1] === '') {
                    insertIndex = 2;
                } else {
                    timelineLines.splice(1, 0, '');
                    insertIndex = 2;
                }
                timelineLines.splice(insertIndex, 0, ...blockLines);
                const afterIndex = insertIndex + blockLines.length;
                if (afterIndex < timelineLines.length && timelineLines[afterIndex].trim() !== '') {
                    timelineLines.splice(afterIndex, 0, '');
                }
            } else {
                const needsBlankLine = timelineLines.length > 0 && timelineLines[timelineLines.length - 1].trim() !== '';
                if (needsBlankLine) {
                    timelineLines.push('');
                }
                timelineLines.push(...blockLines);
            }

            const updatedTimeline = timelineLines.join('\n');
            const newContent = recombineSections(before, updatedTimeline);
            await this.app.vault.modify(file, newContent.endsWith('\n') ? newContent : newContent + '\n');
            return true;
        } catch (error) {
            console.error('Error appending to timeline:', error);
            return false;
        }
    }

    /**
     * 入力したタスクを今日のデイリーノートのタイムライン上部に追記する
     */
    async addTaskToDailyNote(): Promise<void> {
        const task = await promptForText(this.app, 'タスクを入力してください', 'タスクの内容...', '追加');
        if (!task || task.trim() === '') {
            return;
        }

        try {
            const file = await this.ensureDailyNoteFile(new Date());
            if (!file) {
                return;
            }
            const heading = this.settings.dailyNoteTimelineHeading || '# Time Line';
            await this.app.vault.process(file, (content) => {
                const newContent = transformBeforeTimeline(content, heading, (before) => {
                    const beforeTrimmed = before.trimEnd();
                    const taskLine = `- [ ] ${task}`;
                    return this.settings.dailyNoteNewestFirst
                        ? (beforeTrimmed.length > 0 ? `${taskLine}\n${beforeTrimmed}` : taskLine)
                        : (beforeTrimmed.length > 0 ? `${beforeTrimmed}\n${taskLine}` : taskLine);
                });
                return newContent.endsWith('\n') ? newContent : `${newContent}\n`;
            });
            new Notice('✅ デイリーノートにタスクを追加しました');
        } catch (error) {
            new Notice('❌ タスクの追加に失敗しました: ' + error.message);
            console.error('Add task to daily note error:', error);
        }
    }

    async rollOverYesterdayUndoTaskList(editor: any): Promise<void> {
        const baseDate = this.getBaseDateFromActiveFile();
        const yesterday = new Date(baseDate);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const yesterdayFilePath = getDailyNoteFilePath(yesterday);
        if (!yesterdayFilePath) {
            return;
        }
        const yesterdayFile = this.app.vault.getAbstractFileByPath(yesterdayFilePath);
        
        if (!yesterdayFile || !(yesterdayFile instanceof TFile)) {
            return;
        }
        
        try {
            const content = await this.app.vault.read(yesterdayFile);
            const lines = content.split('\n');
            
            const undoTasks: string[] = [];
            const remainingLines: string[] = [];
            
            for (const line of lines) {
                if (line.trim().startsWith('- [ ]')) {
                    undoTasks.push(line);
                } else {
                    remainingLines.push(line);
                }
            }
            
            if (undoTasks.length === 0) {
                return;
            }
            
            await this.app.vault.modify(yesterdayFile, remainingLines.join('\n'));
            
            const cursor = editor.getCursor();
            const undoTasksText = undoTasks.join('\n') + '\n';
            editor.replaceRange(undoTasksText, cursor);
            
        } catch (error) {
            console.error('Error rolling over yesterday undo task list:', error);
        }
    }

    async onload() {
        registerDailyNoteCommands(this.plugin, this);
        registerDailyNoteAutoSort(this.app, this.plugin, () => this.settings);
        registerDailyNoteAutoLink(this.app, this.plugin, () => this.settings);
    }
}
