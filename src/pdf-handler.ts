import { App, Notice, Editor, MarkdownView, Plugin, SuggestModal } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { TerminalService } from './terminal-service';

type CamelotFlavor = 'stream' | 'lattice' | 'network' | 'hybrid';

const CAMELOT_FLAVORS: { value: CamelotFlavor; description: string }[] = [
    { value: 'stream', description: 'Use spaces between text (no borders)' },
    { value: 'lattice', description: 'Use lines between text (bordered tables)' },
    { value: 'network', description: 'Use text alignments' },
    { value: 'hybrid', description: 'Combines Network and Lattice' },
];

class FlavorSuggestModal extends SuggestModal<typeof CAMELOT_FLAVORS[number]> {
    constructor(app: App, private onChoose: (flavor: CamelotFlavor) => void) {
        super(app);
        this.setPlaceholder('Select subcommand');
    }

    getSuggestions(query: string) {
        return CAMELOT_FLAVORS.filter(f =>
            f.value.includes(query.toLowerCase()) || f.description.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(item: typeof CAMELOT_FLAVORS[number], el: HTMLElement) {
        el.createEl('div', { text: item.value });
        el.createEl('small', { text: item.description });
    }

    onChooseSuggestion(item: typeof CAMELOT_FLAVORS[number]) {
        this.onChoose(item.value);
    }
}

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

    updateSettings(settings: CrystalPluginSettings) {
        this.settings = settings;
    }

    private checkSettings(view: MarkdownView): { exportFolder: string, pdfPath: string[] } | null {
        const file = view.file;
        if (!file) return null;

        const exportFolder = this.settings.exportFolderPath;
        if (!exportFolder) {
            new Notice('Export folder is not set.');
            return null;
        }

        const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache?.frontmatter?.pdf) {
            new Notice('No PDF path specified in frontmatter.');
			return null;
		}

        const pdf = fileCache.frontmatter.pdf;
        const pdfPath: string[] = Array.isArray(pdf) ? pdf : [pdf];
        return { pdfPath, exportFolder };
    }

    async exportPdfTable(_editor: Editor, view: MarkdownView): Promise<void> {
        const result = this.checkSettings(view);
        if (!result) return;

        new FlavorSuggestModal(this.app, async (flavor) => {
            const { pdfPath, exportFolder } = result;
            try {
                for (let i = 0; i < pdfPath.length; i++) {
                    const pdf = pdfPath[i];
                    const outputFile = `${exportFolder}/pdf${i + 1}.csv`;
                    const command = `camelot --format csv -o "${outputFile}" -p all ${flavor} "${pdf}"`;
                    await this.terminalService.executeCommand(command);
                }
                new Notice('PDF table export completed.');
            } catch (error) {
                console.error('PDF table export failed:', error);
                new Notice('PDF table export failed: ' + error.message);
            }
        }).open();
    }

    async onload() {
        this.plugin.addCommand({
            id: 'crystal-pdf-table-export',
            name: 'Export PDF Tables',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.exportPdfTable(editor, view);
            }
        });
    }
}
