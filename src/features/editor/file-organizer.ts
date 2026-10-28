import { App, Editor, MarkdownView, Notice, SuggestModal, setIcon } from 'obsidian';
import type { CrystalPluginSettings, FileOrganizationRule } from '../../settings';

class RuleSuggestModal extends SuggestModal<FileOrganizationRule> {
	constructor(app: App, private rules: FileOrganizationRule[], private onChoose: (rule: FileOrganizationRule) => void) {
		super(app);
		this.scope.register(["Ctrl"], "j", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this as any).chooser.moveDown(1);
			return false;
		});
		this.scope.register(["Ctrl"], "k", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(this as any).chooser.moveUp(1);
			return false;
		});
	}

	getSuggestions(query: string): FileOrganizationRule[] {
		return this.rules.filter(rule =>
			this.getDisplayText(rule).toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(rule: FileOrganizationRule, el: HTMLElement) {
		const titleEl = el.createDiv({ cls: 'crystal-rule-suggestion-title' });
		setIcon(titleEl.createSpan({ cls: 'crystal-rule-suggestion-icon' }), 'folder-tree');
		titleEl.createSpan({ text: this.getDisplayText(rule) });

		const detail = [rule.folder, rule.tag].filter(Boolean).join(' · ');
		if (detail) {
			el.createDiv({ cls: 'crystal-rule-suggestion-desc', text: detail });
		}
	}

	onChooseSuggestion(rule: FileOrganizationRule) {
		this.onChoose(rule);
	}

	private getDisplayText(rule: FileOrganizationRule): string {
		const index = this.rules.indexOf(rule) + 1;
		return rule.displayName || rule.tag || `Rule ${index}`;
	}
}

/**
 * Tag-based file organization command (Templater equivalent)
 */
export async function organizeFileWithTags(app: App, settings: CrystalPluginSettings, editor: Editor, view: MarkdownView) {
	if (!view.file) {
		new Notice('⚠️ ファイルが開かれていません');
		return;
	}

	// 設定からルールを取得
	const rules = settings.fileOrganizationRules;

	if (rules.length === 0) {
		new Notice('⚠️ ファイル整理ルールが設定されていません');
		return;
	}

	// ルール選択モーダルを表示
	const ruleModal = new RuleSuggestModal(app, rules, async (selectedRule: FileOrganizationRule) => {
		if (!selectedRule) {
			return;
		}

		try {
			// フロントマターのタグを処理
			await app.fileManager.processFrontMatter(view.file!, (fm) => {
				if (!fm.tags) {
					fm.tags = [];
				} else if (!Array.isArray(fm.tags)) {
					fm.tags = [fm.tags];
				}

				// 既存のルールのタグを削除
				const allRuleTags = settings.fileOrganizationRules.map(rule => rule.tag).filter(tag => tag.trim());
				fm.tags = fm.tags.filter((tag: string) => !allRuleTags.includes(tag));

				// 新しいタグを追加（設定されている場合のみ）
				if (selectedRule.tag.trim()) {
					fm.tags.push(selectedRule.tag);
				}
			});

			// ファイル名処理
			await processFileNameWithRule(app, settings, view.file!, selectedRule);

			new Notice('✅ ファイルが正常に分類されました');
		} catch (error) {
			new Notice('❌ ファイル整理中にエラーが発生しました: ' + error.message);
			console.error('File organization error:', error);
		}

		requestAnimationFrame(() => {
			editor.setCursor(editor.getValue().length);
		});

	});

	ruleModal.open();
}

async function processFileNameWithRule(app: App, settings: CrystalPluginSettings, file: any, rule: FileOrganizationRule) {
	// 既存の装飾を削除してベースファイル名を取得
	let basename = cleanFileName(settings, file.basename);

	// 新しいファイル名を構築
	let newname = buildFileName(app, basename, rule, file);

	// ファイルの移動とリネーム
	await moveAndRenameFile(app, file, newname, rule.folder);
}

function cleanFileName(settings: CrystalPluginSettings, filename: string): string {
	// 既存のプレフィックスを削除
	const prefixes = settings.fileOrganizationRules.map(r => r.prefix).filter(Boolean);
	for (const prefix of prefixes) {
		if (filename.startsWith(prefix)) {
			filename = filename.slice(prefix.length).trim();
			break;
		}
	}

	// 既存の日付を削除
	return filename.replace(/^\d{4}-\d{2}-\d{2}[_ ]?/, '').trim();
}

function buildFileName(app: App, basename: string, rule: FileOrganizationRule, file: any): string {
	let filename = basename;

	if (rule.includeDate) {
		const date = getFileDate(app, file);
		filename = `${date}_${filename}`;
	}

	if (rule.prefix) {
		filename = `${rule.prefix}${filename}`;
	}

	return filename;
}

function getFileDate(app: App, file: any): string {
	// フロントマターから日付を取得、なければファイル作成日を使用
	const fileCache = app.metadataCache.getFileCache(file);
	if (fileCache?.frontmatter?.date) {
		return fileCache.frontmatter.date;
	}

	const date = new Date(file.stat.ctime);
	return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

async function moveAndRenameFile(app: App, file: any, newname: string, folder: string) {
	const targetPath = folder ? `${folder}/${newname}.md` : `${newname}.md`;

	if (file.path !== targetPath) {
		try {
			await app.fileManager.renameFile(file, targetPath);
		} catch (error) {
			console.error('File operation error:', error);
			new Notice('❌ ファイル操作に失敗しました: ' + error.message);
		}
	}
}
