import { App, Notice, Plugin, TFile } from 'obsidian';
import { getDateFromFile, getDailyNote, getAllDailyNotes } from 'obsidian-daily-notes-interface';
const moment = require('moment');
import { CrystalPluginSettings } from './settings';
import { TerminalService } from './terminal-service';
import { GeminiService } from './gemini-service';

export class GitSummaryService {
    private app: App;
    private plugin: Plugin;
    private settings: CrystalPluginSettings;
    private terminalService: TerminalService;
    private geminiService: GeminiService;

    constructor(
        app: App,
        plugin: Plugin,
        settings: CrystalPluginSettings,
        terminalService: TerminalService,
        geminiService: GeminiService
    ) {
        this.app = app;
        this.plugin = plugin;
        this.settings = settings;
        this.terminalService = terminalService;
        this.geminiService = geminiService;
    }

    private formatDate(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    async generateSummary(): Promise<void> {
        if (!this.geminiService.isAvailable()) {
            new Notice('Gemini API Keyが設定されていません。設定からAPIキーを入力してください。');
            return;
        }

        try {
            // デイリーノートかどうか判定
            const file = this.app.workspace.getActiveFile();
            const dateFromFile = file ? getDateFromFile(file, 'day') : null;
            const isDailyNote = dateFromFile !== null;
            const targetDate = isDailyNote ? dateFromFile!.toDate() : new Date();
            const dateStr = this.formatDate(targetDate);
            const isToday = dateStr === this.formatDate(new Date());
            const useWorkingTree = !isDailyNote || isToday;

            new Notice('Gitコミット差分を取得中...');

            let lastCommit = '';
            if (!useWorkingTree) {
                // 過去のデイリーノートのみ: 対象日のlastcommitを取得
                const lastCommitResult = await this.terminalService.executeCommand(
                    `git log --format="%H" --after="${dateStr} 00:00:00" --before="${dateStr} 23:59:59" -1`
                );
                lastCommit = lastCommitResult.stdout.trim();
                if (!lastCommit) {
                    new Notice(`${dateStr} のコミットが見つかりませんでした。`);
                    return;
                }
            }

            // 比較コミット (対象日の 00:00:00 より前の最新コミット)
            const beforeCommitResult = await this.terminalService.executeCommand(
                `git log --format="%H" --before="${dateStr} 00:00:00" -1`
            );
            const beforeCommit = beforeCommitResult.stdout.trim() ||
                '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

            // 差分取得
            const diffCmd = useWorkingTree
                ? `git diff ${beforeCommit} -- '*.md'`
                : `git diff ${beforeCommit} ${lastCommit} -- '*.md'`;
            const diffResult = await this.terminalService.executeCommand(diffCmd);
            const diff = diffResult.stdout.trim();

            if (!diff) {
                new Notice('差分が見つかりませんでした。');
                return;
            }

            new Notice('Geminiでサマリーを生成中...');
            const summary = await this.geminiService.generateGitSummary(diff, dateStr);

            // 書き込み先: デイリーノートならそのファイル、そうでなければ今日のデイリーノート
            let targetFile: TFile | null = isDailyNote ? file : null;
            if (!isDailyNote) {
                const todayNote = getDailyNote(moment(), getAllDailyNotes());
                if (!todayNote) {
                    new Notice('今日のデイリーノートが見つかりませんでした。');
                    return;
                }
                targetFile = todayNote;
            }

            await this.app.fileManager.processFrontMatter(targetFile!, (frontmatter) => {
                frontmatter.summary = summary;
            });

            new Notice(`サマリー生成完了: ${summary}`);

        } catch (error) {
            console.error('Error generating git summary:', error);
            new Notice(`サマリー生成エラー: ${error.message}`);
        }
    }

    onload(): void {
        this.plugin.addCommand({
            id: 'crystal-generate-git-commit-summary',
            name: 'Generate Git Commit Summary',
            callback: () => {
                this.generateSummary();
            }
        });
    }
}
