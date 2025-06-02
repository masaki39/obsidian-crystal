import { App, TFile } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export class DailyNotesManager {
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
            
            // ファイルを開く
            await this.app.workspace.getLeaf().openFile(file as TFile);
            
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
} 