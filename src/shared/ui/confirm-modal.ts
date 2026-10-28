import { App, Modal } from 'obsidian';
import { createModalButtonRow, createModalTitle } from './modal-markup';

/**
 * Ask the user to confirm a destructive, irreversible action (e.g. resetting
 * gamification progress) before proceeding. Resolves `true` only if the
 * user explicitly clicks the confirm button; closing the modal any other
 * way (Escape, clicking outside, the cancel button) resolves `false`.
 */
export function promptForConfirmation(app: App, title: string, message: string, confirmText = '実行'): Promise<boolean> {
	return new Promise((resolve) => {
		class ConfirmModal extends Modal {
			private confirmed = false;
			private resolve: (value: boolean) => void;

			constructor(app: App, resolve: (value: boolean) => void) {
				super(app);
				this.resolve = resolve;
			}

			onOpen() {
				const { contentEl } = this;
				createModalTitle(contentEl, title);
				contentEl.createEl('p', { text: message });

				const buttonContainer = createModalButtonRow(contentEl);
				const cancelButton = buttonContainer.createEl('button', { text: 'キャンセル' });
				const confirmButton = buttonContainer.createEl('button', { text: confirmText });
				confirmButton.addClass('mod-warning');

				cancelButton.addEventListener('click', () => this.close());
				confirmButton.addEventListener('click', () => {
					this.confirmed = true;
					this.close();
				});
			}

			onClose() {
				this.resolve(this.confirmed);
			}
		}
		const modal = new ConfirmModal(app, resolve);
		modal.open();
	});
}
