import { App, Modal, MarkdownView } from 'obsidian';
import { createModalButtonRow, createModalTitle } from './modal-markup';

export function promptForText(app: App, title = 'テキストを入力してください', placeholder = '', buttonText = '追加', defaultValue = '', multiline = false): Promise<string | null> {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	const savedCursor = activeView?.editor.getCursor();

	return new Promise((resolve) => {
		class GenericInputModal extends Modal {
			private result: string | null = null;
			private resolve: (value: string | null) => void;

			constructor(app: App, resolve: (value: string | null) => void) {
				super(app);
				this.resolve = resolve;
			}

			onOpen() {
				const { contentEl } = this;
				createModalTitle(contentEl, title);

				let input: HTMLInputElement | HTMLTextAreaElement;

				if (multiline) {
					input = contentEl.createEl('textarea', {
						placeholder,
						cls: 'crystal-modal-input',
					}) as HTMLTextAreaElement;
					input.placeholder = placeholder || '';
				} else {
					input = contentEl.createEl('input', {
						type: 'text',
						placeholder,
						cls: 'crystal-modal-input',
					}) as HTMLInputElement;
					input.placeholder = placeholder || '';
				}

				input.value = defaultValue ?? '';

				const buttonContainer = createModalButtonRow(contentEl);
				const cancelButton = buttonContainer.createEl('button', { text: 'キャンセル' });
				const addButton = buttonContainer.createEl('button', { text: buttonText });
				addButton.addClass('mod-cta');
				
				let isComposing = false;
				
				const submit = () => {
					this.result = input.value.trim();
					this.close();
				};
				
				cancelButton.addEventListener('click', () => {
					this.result = null;
					this.close();
				});
				
				addButton.addEventListener('click', submit);
				
				input.addEventListener('compositionstart', () => {
					isComposing = true;
				});
				
				input.addEventListener('compositionend', () => {
					isComposing = false;
				});
				
				input.addEventListener('keydown', (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						if (multiline) {
							// multilineの場合はCtrl+Enter（macではCmd+Enter）で送信
							if ((e.ctrlKey || e.metaKey) && !isComposing) {
								e.preventDefault();
								submit();
							}
							// 通常のEnterは改行として処理
						} else {
							// 単行の場合は従来通りEnterで送信
							if (!isComposing) {
								e.preventDefault();
								submit();
							}
						}
					} else if (e.key === 'Escape') {
						this.result = null;
						this.close();
					}
				});

				// Double requestAnimationFrame ensures the modal is fully rendered
				// and visible before focusing, even when triggered from another window
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						input.focus();
					});
				});
			}

			onClose() {
				this.resolve(this.result);
				requestAnimationFrame(() => {
					if (activeView) {
						activeView.editor.focus();
						if (savedCursor) {
							activeView.editor.setCursor(savedCursor);
						}
					}
				});
			}
		}
		const modal = new GenericInputModal(app, resolve);
		modal.open();
	});
}
