import { App, Modal, MarkdownView } from 'obsidian';

/** Shared markup both `promptForText`'s and `promptForConfirmation`'s modals
 * use — a title styled with `crystal-modal-title`, and a button row styled
 * with `crystal-modal-button-row` — factored out so the two otherwise quite
 * different modals (free text input w/ IME handling vs. two static buttons)
 * don't each re-derive the same two lines of markup. */
function createModalTitle(contentEl: HTMLElement, title: string): void {
	contentEl.createEl('h3', { text: title, cls: 'crystal-modal-title' });
}

function createModalButtonRow(contentEl: HTMLElement): HTMLElement {
	return contentEl.createDiv({ cls: 'crystal-modal-button-row' });
}

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

export function parseFrontmatter(fileContent: string): { frontmatter: string, content: string } {
    // 最初の文字が'---'で始まらない場合は早期リターン
    if (!fileContent.startsWith('---\n')) {
        return {
            frontmatter: '',
            content: fileContent
        };
    }

    // 2つ目の'---'を探す
    const secondDelimiterIndex = fileContent.indexOf('\n---\n', 4);
    if (secondDelimiterIndex === -1) {
        return {
            frontmatter: '',
            content: fileContent
        };
    }

    return {
        frontmatter: fileContent.slice(0, secondDelimiterIndex + 5), // ---\nまで含める
        content: fileContent.slice(secondDelimiterIndex + 5)         // 残りの部分
    };
}
