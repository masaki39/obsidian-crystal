/** Shared markup both `promptForText`'s and `promptForConfirmation`'s modals
 * use — a title styled with `crystal-modal-title`, and a button row styled
 * with `crystal-modal-button-row` — factored out so the two otherwise quite
 * different modals (free text input w/ IME handling vs. two static buttons)
 * don't each re-derive the same two lines of markup. */
export function createModalTitle(contentEl: HTMLElement, title: string): void {
	contentEl.createEl('h3', { text: title, cls: 'crystal-modal-title' });
}

export function createModalButtonRow(contentEl: HTMLElement): HTMLElement {
	return contentEl.createDiv({ cls: 'crystal-modal-button-row' });
}
