import type { SuggestModal } from 'obsidian';

/** The parts of a suggest modal's (non-public) chooser used here. */
interface Chooser {
	selectedItem?: number;
	values?: unknown[] | null;
	moveUp?(event: KeyboardEvent): void;
	moveDown?(event: KeyboardEvent): void;
	setSelectedItem?(index: number, event?: KeyboardEvent): void;
}

function move(modal: SuggestModal<unknown>, delta: 1 | -1, event: KeyboardEvent) {
	const chooser = (modal as unknown as { chooser?: Chooser }).chooser;
	if (!chooser) return;
	if (delta > 0 && chooser.moveDown) return chooser.moveDown(event);
	if (delta < 0 && chooser.moveUp) return chooser.moveUp(event);
	// Fallback for a chooser without moveUp/moveDown: wrap around like the arrow keys.
	const count = chooser.values?.length ?? 0;
	if (!chooser.setSelectedItem || count === 0) return;
	const index = ((chooser.selectedItem ?? 0) + delta + count) % count;
	chooser.setSelectedItem(index, event);
}

/** Ctrl+J / Ctrl+K move the selection down / up, like ↓ / ↑ (Vim style). */
export function addVimNavigation<T>(modal: SuggestModal<T>) {
	const target = modal as unknown as SuggestModal<unknown>;
	modal.scope.register(['Ctrl'], 'j', event => {
		move(target, 1, event);
		return false;
	});
	modal.scope.register(['Ctrl'], 'k', event => {
		move(target, -1, event);
		return false;
	});
}
