import type { Editor, Plugin } from 'obsidian';
import { EditorState, type Extension, Prec, type Text, type Transaction, type TransactionSpec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
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
 * The single character typed at the (single, empty) cursor by `tr`, or null
 * when `tr` is anything else (several changes, a replaced selection, an insert
 * away from the cursor, several cursors).
 */
function typedChar(tr: Transaction): { pos: number; char: string } | null {
	const selection = tr.startState.selection;
	if (selection.ranges.length !== 1 || !selection.main.empty) return null;

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
	if (changeCount !== 1 || from !== to || from !== selection.main.head) return null;
	return { pos: from, char: inserted };
}

/**
 * Replaces a typed half-/full-width space with the bullet in the same
 * transaction, so a single undo restores the line. Only plain typing with a
 * single cursor counts: IME composition, paste, delete and undo/redo are left
 * alone (see `autoBulletComposeFallback` for a full-width space committed by
 * an IME).
 */
export function autoBulletInputFilter(getSettings: () => AutoBulletSettings): Extension {
	return EditorState.transactionFilter.of((tr) => {
		if (!tr.docChanged || !tr.isUserEvent('input.type') || tr.isUserEvent('input.type.compose')) return tr;
		const typed = typedChar(tr);
		if (!typed || (typed.char !== ' ' && typed.char !== '\u3000')) return tr;

		// The replacement is resolved from tr.startState without re-running
		// changeFilter, and drops tr's other effects/annotations. That is fine for
		// plain typing at a line start, but a range protected by a changeFilter
		// could in theory be rewritten here.
		const spec = bulletSpec(tr.startState, typed.pos, typed.char, getSettings());
		return spec ? { ...spec, userEvent: 'input.type' } : tr;
	});
}

/**
 * For a full-width space that an IME committed through composition
 * (`input.type.compose`, which the input filter skips): the follow-up change,
 * relative to `tr.state`, that turns it into a bullet. Null while the view is
 * still composing, or when `tr` is not exactly that one character at the cursor.
 */
export function composedSpaceBulletSpec(tr: Transaction, composing: boolean, settings: AutoBulletSettings): TransactionSpec | null {
	if (composing || !tr.docChanged || !tr.isUserEvent('input.type.compose')) return null;
	const typed = typedChar(tr);
	if (!typed || typed.char !== '\u3000') return null;
	const spec = bulletSpec(tr.startState, typed.pos, typed.char, settings);
	if (!spec) return null;
	// bulletSpec is relative to the state before the space; extend its range
	// over the space that is now in the document.
	const change = spec.changes as { from: number; to: number; insert: string };
	return { ...spec, changes: { ...change, to: change.to + typed.char.length }, userEvent: 'input.type' };
}

/**
 * Applies `composedSpaceBulletSpec` after the composition has ended. It runs
 * as a separate transaction, so this path takes two undo steps (bullet back to
 * the space, then the space) instead of one. Nothing is touched while the IME
 * is composing.
 */
export function autoBulletComposeFallback(getSettings: () => AutoBulletSettings): Extension {
	return EditorView.updateListener.of((update) => {
		if (update.transactions.length !== 1) return;
		const spec = composedSpaceBulletSpec(update.transactions[0], update.view.composing, getSettings());
		if (!spec) return;
		const { view, state } = update;
		// Views can't be updated from inside an update listener.
		queueMicrotask(() => {
			if (view.state !== state || view.composing) return;
			view.dispatch(spec);
		});
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
		autoBulletComposeFallback(getSettings),
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
