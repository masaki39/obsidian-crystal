import { App, Notice, Editor, MarkdownView, Plugin, TFile } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { TerminalService } from './terminal-service';

export class PdfHandler {
    private app: App;
    private plugin: Plugin;
    private terminalService: TerminalService;
    private settings: CrystalPluginSettings;

    constructor(app: App, terminalService: TerminalService, settings: CrystalPluginSettings, plugin: Plugin) {
        this.app = app;
        this.terminalService = terminalService;
        this.settings = settings;
        this.plugin = plugin;
    }

    private checkSettings(view: MarkdownView): { file: TFile, exportFolder: string, pdfPath: string[] } | null {
        // fileの存在確認
        const file = view.file;
        if (!file) return null;

        // export folderの存在確認
        const exportFolder = this.settings.exportFolderPath;
        if (!exportFolder) {
            new Notice('Export folder is not set.');
            return null;
        }

        // フロントマターのpdfのパスを取得(string or arrayだがarrayで統一)
        const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache?.frontmatter?.pdf) {
            new Notice('No PDF path specified in frontmatter.');
			return null;
		}

        // frontmatterからpdfパスを取得
        const pdf = fileCache.frontmatter.pdf;
        const pdfPath: string[] = Array.isArray(pdf) ? pdf : [pdf];
        return { file, pdfPath, exportFolder };
    }

    async exportPdf(_editor: Editor, view: MarkdownView): Promise<void> {
        const result = this.checkSettings(view);
        if (!result) return;

        const { pdfPath, exportFolder } = result;

        try {
            // PDFファイルをexport folderにコピー
            for (const pdf of pdfPath) {
                const command = `cp "${pdf}" "${exportFolder}"`;
                await this.terminalService.executeCommand(command);
            }
            new Notice('PDF export completed.');
        } catch (error) {
            console.error('PDF export failed:', error);
            new Notice('PDF export failed: ' + error.message);
        }
    }

    async exportPdfImages(_editor: Editor, view: MarkdownView): Promise<void> {
        const result = this.checkSettings(view);
        if (!result) return;

        const { pdfPath, exportFolder } = result;

        try {
            // PDFから画像を抽出
            for (let i = 0; i < pdfPath.length; i++) {
                const pdf = pdfPath[i];
                const prefix = `pdf${i + 1}`;
                const command = `pdfimages -png "${pdf}" "${exportFolder}/${prefix}"`;
                await this.terminalService.executeCommand(command);
            }
            new Notice('PDF image export completed.');
        } catch (error) {
            console.error('PDF image export failed:', error);
            new Notice('PDF image export failed: ' + error.message);
        }
    }

    async exportPdfText(_editor: Editor, view: MarkdownView): Promise<void> {
        const result = this.checkSettings(view);
        if (!result) return;

        const { pdfPath, exportFolder } = result;

        try {
            // PDFからテキストを抽出
            for (let i = 0; i < pdfPath.length; i++) {
                const pdf = pdfPath[i];
                const outputFile = `pdf${i + 1}.txt`;
                const command = `pdftotext "${pdf}" "${exportFolder}/${outputFile}"`;
                await this.terminalService.executeCommand(command);
            }
            new Notice('PDF text export completed.');
        } catch (error) {
            console.error('PDF text export failed:', error);
            new Notice('PDF text export failed: ' + error.message);
        }
    }

    async onload() {
        this.plugin.addCommand({
            id: 'crystal-pdf-export',
            name: 'Export PDF',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.exportPdf(editor, view);
            }
        });

        this.plugin.addCommand({
            id: 'crystal-pdf-image-export',
            name: 'Export PDF Images',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.exportPdfImages(editor, view);
            }
        });

        this.plugin.addCommand({
            id: 'crystal-pdf-text-export',
            name: 'Export PDF Text',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.exportPdfText(editor, view);
            }
        });
    }
}
