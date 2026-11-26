import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view';

/** How long the yanked text stays highlighted. */
export const YANK_HIGHLIGHT_MS = 200;

interface YankRange { from: number; to: number }

/** Sets the highlighted ranges; an empty list clears them. */
const setYankHighlight = StateEffect.define<YankRange[]>();

const yankMark = Decoration.mark({ class: 'crystal-yank-highlight' });

/** Editor extension that draws the yank highlight (vim-highlightedyank style). */
export const yankHighlightField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(decorations, tr) {
		decorations = decorations.map(tr.changes);
		for (const effect of tr.effects) {
			if (!effect.is(setYankHighlight)) continue;
			const length = tr.state.doc.length;
			decorations = Decoration.set(effect.value
				.map(({ from, to }) => ({ from: Math.max(0, Math.min(from, length)), to: Math.max(0, Math.min(to, length)) }))
				.filter(range => range.from < range.to)
				.map(range => yankMark.range(range.from, range.to)), true);
		}
		return decorations;
	},
	provide: field => EditorView.decorations.from(field),
});

const clearTimers = new WeakMap<EditorView, number>();

/**
 * Briefly highlights the current selection of `view`. Called while Vim yanks:
 * at that moment the selection is exactly the yanked text (Vim selects the
 * operator's range before running it and moves the cursor back afterwards).
 */
export function flashYank(view: EditorView) {
	const ranges = view.state.selection.ranges
		.filter(range => !range.empty)
		.map(range => ({ from: range.from, to: range.to }));
	if (ranges.length === 0) return;

	const win = view.dom.ownerDocument.defaultView ?? window;
	// Dispatch after Vim's own key handling is done.
	win.setTimeout(() => {
		view.dispatch({ effects: setYankHighlight.of(ranges) });
		const previous = clearTimers.get(view);
		if (previous !== undefined) win.clearTimeout(previous);
		clearTimers.set(view, win.setTimeout(() => {
			clearTimers.delete(view);
			// The editor may have been closed meanwhile.
			if (view.dom.isConnected) view.dispatch({ effects: setYankHighlight.of([]) });
		}, YANK_HIGHLIGHT_MS));
	}, 0);
}
