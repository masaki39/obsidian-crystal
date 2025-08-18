import { App, Plugin, TFile, MarkdownView } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { parseFrontmatter } from './utils';
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
     * 日付文字列をフォーマットする
     */
    private formatDate(date: Date): string {
        const format = this.settings.dailyNoteDateFormat || 'YYYY-MM-DD';
        
        // 基本的なフォーマット対応
        return format
            .replace('YYYY', date.getFullYear().toString())
            .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
            .replace('DD', date.getDate().toString().padStart(2, '0'));
    }

    /**
     * ファイル名から日付を抽出する
     */
    private extractDateFromFileName(fileName: string): Date | null {
        const format = this.settings.dailyNoteDateFormat || 'YYYY-MM-DD';
        
        // 日付フォーマットを正規表現に変換
        let regexPattern = format
            .replace('YYYY', '(\\d{4})')
            .replace('MM', '(\\d{2})')
            .replace('DD', '(\\d{2})');
        
        const regex = new RegExp(regexPattern);
        const match = fileName.match(regex);
        
        if (match) {
            const [, year, month, day] = match;
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            
            // 有効な日付かチェック
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        
        return null;
    }

    /**
     * 現在アクティブなファイルから基準日付を取得する
     */
    private getBaseDateFromActiveFile(): Date {
        const activeFile = this.app.workspace.getActiveFile();
        
        if (activeFile) {
            // ファイル名から拡張子を除去
            const fileNameWithoutExt = activeFile.name.replace(/\.md$/, '');
            const extractedDate = this.extractDateFromFileName(fileNameWithoutExt);
            
            if (extractedDate) {
                return extractedDate;
            }
        }
        
        // アクティブファイルから日付が抽出できない場合は今日を返す
        return new Date();
    }

    /**
     * 指定された日付のデイリーノートファイルパスを取得する
     */
    private getDailyNoteFilePath(date: Date): string {
        const fileName = this.formatDate(date);
        const folder = this.settings.dailyNotesFolder || 'DailyNotes';
        return `${folder}/${fileName}.md`;
    }

    /**
     * 指定された日付のデイリーノートを開くか作成する
     */
    async openOrCreateDailyNote(date: Date): Promise<void> {
        const filePath = this.getDailyNoteFilePath(date);
        
        try {
            // ファイルが存在するかチェック
            let file = this.app.vault.getAbstractFileByPath(filePath);
            
            if (!file || !(file instanceof TFile)) {
                // ファイルが存在しない場合、フォルダーを作成して新しいファイルを作成
                const folder = this.settings.dailyNotesFolder || 'DailyNotes';
                
                // フォルダーが存在しない場合は作成
                if (!this.app.vault.getAbstractFileByPath(folder)) {
                    await this.app.vault.createFolder(folder);
                }
                
                // 空のデイリーノートを作成
                file = await this.app.vault.create(filePath, '');
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
        const lines = taskList.split('\n');
        const filteredLines = lines.filter(line => line.trim() !== '');
        const orderedLines = filteredLines.sort((a, b) => {
            const aIsDone = a.trim().startsWith('- [x]');
            const aIsNotDone = a.trim().startsWith('- [ ]');
            const bIsDone = b.trim().startsWith('- [x]');
            const bIsNotDone = b.trim().startsWith('- [ ]');
            
            // 完了済みタスクが最優先
            if (aIsDone && !bIsDone) return -1;
            if (!aIsDone && bIsDone) return 1;
            
            // 未完了タスクが2番目の優先度
            if (aIsNotDone && !bIsNotDone) return -1;
            if (!aIsNotDone && bIsNotDone) return 1;
            
            // その他の行が最後（同じカテゴリ内では元の順序を保持）
            return 0;
        });
        return orderedLines.join('\n') + '\n';
    }

    private async rollOverYesterdayUndoTaskList(editor: any): Promise<void> {
        const baseDate = this.getBaseDateFromActiveFile();
        const yesterday = new Date(baseDate);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const yesterdayFilePath = this.getDailyNoteFilePath(yesterday);
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

    async onLoad() {
        this.plugin.addCommand({
            id: 'crystal-open-today',
            name: 'Open Today\'s Daily Note',
            callback: () => this.openToday()
        });

        this.plugin.addCommand({
            id: 'crystal-open-yesterday',
            name: 'Open Yesterday\'s Daily Note',
            callback: () => this.openYesterday()
        });

        this.plugin.addCommand({
            id: 'crystal-open-tomorrow',
            name: 'Open Tomorrow\'s Daily Note',
            callback: () => this.openTomorrow()
        });

        this.plugin.addCommand({
            id: 'crystal-roll-over-tasks',
            name: 'Roll Over Yesterday Undo Task List',
            editorCallback: (editor) => this.rollOverYesterdayUndoTaskList(editor)
        });

        this.plugin.registerEvent(this.app.vault.on('modify', file => {
            if (!(file instanceof TFile)) {
                return;
            }
            const fileFolder = file.path.split('/').slice(0, -1).join('/');
            const dailyNotesFolder = this.settings.dailyNotesFolder || 'DailyNotes';
            if (fileFolder === dailyNotesFolder) {
                this.app.vault.process(file, (content) => {
                    const { frontmatter, content: parsedContent } = parseFrontmatter(content);
                    const orderedContent = this.orderTaskList(parsedContent);
                    const newContent = `${frontmatter}${orderedContent}`;
                    return newContent;
                });
            }
        }));

        if (this.settings.dailyNoteAutoLink) {
            this.app.workspace.onLayoutReady(() => { //ロード完了後に実行
                this.plugin.registerEvent(this.app.vault.on('create', file => {
                    if (!(file instanceof TFile) || file.extension !== 'md') {
                        return;
                    }
                    const todayNote = this.app.vault.getAbstractFileByPath(this.getDailyNoteFilePath(new Date()));
                    if (!todayNote) {
                        return;
                    }
                    const timeStamp = moment(new Date()).format('HH:mm');
                    const fileLink = `[[${file.name.replace(/\.md$/, '')}]]`;
                    const line = `- ${timeStamp} ${fileLink}`;
                    this.app.vault.process(todayNote as TFile, (content) => {
                        const newContent = `${content}\n${line}`;
                        return newContent;
                    });
                }));

                this.plugin.registerEvent(this.app.vault.on('delete', file => {
                    if (!(file instanceof TFile) || file.extension !== 'md') {
                        return;
                    }
                    const todayNote = this.app.vault.getAbstractFileByPath(this.getDailyNoteFilePath(new Date()));
                    if (!todayNote) {
                        return;
                    }
                    const fileLink = `[[${file.name.replace(/\.md$/, '')}]]`;
                    // 正規表現の特殊文字をエスケープ
                    const escapedFileLink = fileLink.replace(/[[\](){}.*+?^$|\\]/g, '\\$&');
                    this.app.vault.process(todayNote as TFile, (content) => {
                        // 行全体をマッチして削除（改行も含む）
                        const regex = new RegExp(`^- \\d{2}:\\d{2} ${escapedFileLink}$`, 'gm');
                        const newContent = content.replace(regex, '').replace(/\n\n+/g, '\n');
                        return newContent;
                    });
                }));
            });
        }
    }
} 