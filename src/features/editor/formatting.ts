import { App, Editor, MarkdownView, Notice } from 'obsidian';
import { parseFrontmatter } from '../../shared/markdown/frontmatter';

/**
 * Wrap selection with subscript tag or unwrap if already wrapped
 */
export function wrapWithSubscript(editor: Editor, view: MarkdownView) {
	wrapSelection('sub', editor);
}

/**
 * Wrap selection with superscript tag or unwrap if already wrapped
 */
export function wrapWithSuperscript(editor: Editor, view: MarkdownView) {
	wrapSelection('sup', editor);
}

/**
 * Wrap selected text with HTML tag or unwrap if already wrapped
 */
function wrapSelection(tag: string, editor: Editor) {
	const selection = editor.getSelection();
	const regex = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 'g');

	// Case 1: Selection contains complete tags - remove them
	if (regex.test(selection)) {
		const unwrappedSelection = selection.replace(regex, '$1');
		editor.replaceSelection(unwrappedSelection);
		return;
	}

	// Case 2: Check if cursor/selection is inside a tag on current line
	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);
	const tagRegex = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 'g');
	let match;

	while ((match = tagRegex.exec(line)) !== null) {
		const tagStart = match.index;
		const tagEnd = match.index + match[0].length;

		// Check if cursor is inside this tag
		if (cursor.ch >= tagStart && cursor.ch <= tagEnd) {
			const from = { line: cursor.line, ch: tagStart };
			const to = { line: cursor.line, ch: tagEnd };
			editor.replaceRange(match[1], from, to);
			return;
		}
	}

	// Case 3: Add tag to selection
	const wrappedSelection = `<${tag}>${selection}</${tag}>`;
	editor.replaceSelection(wrappedSelection);
}

/**
 * Increase blockquote level
 */
export function increaseBlockquote(editor: Editor, view: MarkdownView) {
	const selection = editor.listSelections()[0];
	const fromLine = Math.min(selection.anchor.line, selection.head.line);
	const toLine = Math.max(selection.anchor.line, selection.head.line);

	const changes = [];
	for (let lineNum = fromLine; lineNum <= toLine; lineNum++) {
		const line = editor.getLine(lineNum);
		const newLine = `> ${line}`;
		changes.push({
			from: { line: lineNum, ch: 0 },
			to: { line: lineNum, ch: line.length },
			text: newLine
		});
	}

	editor.transaction({ changes });
}

/**
 * Convert active file content into a bullet list
 */
export async function convertActiveFileToBulletList(app: App, editor: Editor, view: MarkdownView) {
	if (!view.file) {
		new Notice('⚠️ ファイルが開かれていません');
		return;
	}

	const rawContent = await app.vault.read(view.file);
	const { frontmatter, content } = parseFrontmatter(rawContent);

	const bulletLines = content
		.split(/\r?\n/)
		.map((line: string) => {
			const trimmed = line.trim();
			if (trimmed.length === 0) {
				return null;
			}

			const indentMatch = line.match(/^\s*/);
			const indent = indentMatch ? indentMatch[0] : '';
			const withoutHeading = trimmed.replace(/^#+\s*/, '').trim();

			if (withoutHeading.startsWith('-')) {
				const item = withoutHeading.replace(/^\-\s*/, '').trim();
				return `${indent}- ${item}`;
			}

			return `${indent}- ${withoutHeading}`;
		})
		.filter((line: string | null): line is string => line !== null);

	editor.setValue(`${frontmatter}${bulletLines.join('\n')}`);
	new Notice('✅ コンテンツをバレットリストに変換しました');
}
