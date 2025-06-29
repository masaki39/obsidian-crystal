import { App, Modal } from 'obsidian';

export function promptForText(app: App, title = 'テキストを入力してください', placeholder = '', buttonText = '追加', defaultValue = '', multiline = false): Promise<string | null> {
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
				contentEl.createEl('h3', { text: title });
				
				let input: HTMLInputElement | HTMLTextAreaElement;
				
				if (multiline) {
					input = contentEl.createEl('textarea', {
						placeholder
					}) as HTMLTextAreaElement;
					input.style.width = '100%';
					input.style.height = '120px';
					input.style.resize = 'vertical';
					input.style.fontFamily = 'inherit';
				} else {
					input = contentEl.createEl('input', {
						type: 'text',
						placeholder
					}) as HTMLInputElement;
					input.style.width = '100%';
				}
				
				input.value = defaultValue;
				input.style.marginBottom = '16px';
				
				const buttonContainer = contentEl.createDiv();
				buttonContainer.style.display = 'flex';
				buttonContainer.style.gap = '8px';
				buttonContainer.style.justifyContent = 'flex-end';
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
				
				input.focus();
			}

			onClose() {
				this.resolve(this.result);
			}
		}
		const modal = new GenericInputModal(app, resolve);
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