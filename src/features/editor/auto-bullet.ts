import type { Editor, Plugin } from 'obsidian';
import { EditorState, type Extension, Prec, type Text, type TransactionSpec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { CrystalPluginSettings } from '../../settings';
import { type AutoBulletSettings, BULLET, autoBulletRange, bulletCursorTarget, type Lines } from './auto-bullet-logic';

function docLines(doc: Text): Lines {
	return {
		count: doc.lines,
		get: (index) => doc.line(index + 1).text,
		// Sequential iteration instead of a tree lookup per line. iterLines
		// yields one empty line for an empty range, hence the guard.
		between: (from, to) => (from >= to ? [] : { [Symbol.iterator]: () => doc.iterLines(from + 1, to + 1)[Symbol.iterator]() }),
	};
}

/** The change that turns whitespace typed at `pos` into a bullet, or null. */
function bulletSpec(state: EditorState, pos: number, char: string, settings: AutoBulletSettings): TransactionSpec | null {
	const line = state.doc.lineAt(pos);
	const range = autoBulletRange(docLines(state.doc), line.number - 1, pos - line.from, char, settings);
	if (!range) return null;
	return {
		changes: { from: line.from + range.from, to: line.from + range.to, insert: BULLET },
		selection: { anchor: line.from + range.from + BULLET.length },
		scrollIntoView: true,
	};
}

/**
 * Replaces a typed half-/full-width space with the bullet in the same
 * transaction, so a single undo restores the line. Only plain typing with a
 * single cursor counts: IME composition, paste, delete and undo/redo are left
 * alone.
 */
export function autoBulletInputFilter(getSettings: () => AutoBulletSettings): Extension {
	return EditorState.transactionFilter.of((tr) => {
		if (!tr.docChanged || !tr.isUserEvent('input.type') || tr.isUserEvent('input.type.compose')) return tr;
		const selection = tr.startState.selection;
		if (selection.ranges.length !== 1 || !selection.main.empty) return tr;

		let changeCount = 0;
		let from = -1;
		let to = -1;
		let inserted = '';
		tr.changes.iterChanges((fromA, toA, _fromB, _toB, text) => {
			changeCount++;
			from = fromA;
			to = toA;
			inserted = text.toString();
		});
		if (changeCount !== 1 || from !== to || from !== selection.main.head) return tr;
		if (inserted !== ' ' && inserted !== '　') return tr;

		// The replacement is resolved from tr.startState without re-running
		// changeFilter, and drops tr's other effects/annotations. That is fine for
		// plain typing at a line start, but a range protected by a changeFilter
		// could in theory be rewritten here.
		const spec = bulletSpec(tr.startState, from, inserted, getSettings());
		return spec ? { ...spec, userEvent: 'input.type' } : tr;
	});
}

/** Minimal view surface the Tab command needs (an `EditorView` fits). */
export interface AutoBulletTarget {
	state: EditorState;
	dispatch(...specs: TransactionSpec[]): void;
}

/**
 * Tab at the start of a line inserts the bullet. Returns false otherwise so
 * the default Tab behavior (e.g. indenting a list item) still runs.
 */
export function autoBulletTabCommand(getSettings: () => AutoBulletSettings): (target: AutoBulletTarget) => boolean {
	return (target) => {
		const selection = target.state.selection;
		if (selection.ranges.length !== 1 || !selection.main.empty) return false;
		const spec = bulletSpec(target.state, selection.main.head, '\t', getSettings());
		if (!spec) return false;
		target.dispatch({ ...spec, userEvent: 'input' });
		return true;
	};
}

export function autoBulletExtension(getSettings: () => AutoBulletSettings): Extension {
	return [
		autoBulletInputFilter(getSettings),
		Prec.high(keymap.of([{ key: 'Tab', run: autoBulletTabCommand(getSettings) }])),
	];
}

/** Move the cursor right after the list marker (or to the line start). */
export function moveCursorAfterBullet(editor: Editor) {
	const cursor = editor.getCursor();
	const target = bulletCursorTarget(editor.getLine(cursor.line));
	if (cursor.ch !== target) {
		editor.setCursor({ line: cursor.line, ch: target });
	}
}

export class AutoBulletService {
	constructor(private plugin: Plugin, private settings: CrystalPluginSettings) {}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	onload() {
		// Always registered; the handlers read the current settings on each keystroke.
		this.plugin.registerEditorExtension(autoBulletExtension(() => this.settings));

		this.plugin.addCommand({
			id: 'crystal-move-cursor-after-bullet',
			name: 'Editor: Move cursor after list marker',
			icon: 'list',
			editorCallback: (editor: Editor) => moveCursorAfterBullet(editor),
		});
	}
}
