import { App, Modal, Notice } from 'obsidian';
import type { GyazoService } from '../gyazo/service';

export interface PostResult {
	text: string;
	gyazoUrls: string[];
	imageFiles: File[];
}

export const MAX_IMAGES = 4;

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image'));
		};
		img.src = url;
	});
}

class ImagePreviewModal extends Modal {
	private src: string;
	constructor(app: App, src: string) {
		super(app);
		this.src = src;
	}
	onOpen() {
		const { contentEl } = this;
		this.modalEl.addClass('crystal-image-preview-modal');
		this.modalEl.style.width = 'auto';
		this.modalEl.style.maxWidth = '90vw';
		const img = contentEl.createEl('img');
		img.src = this.src;
	}
	onClose() {
		this.contentEl.empty();
	}
}

export class PostModal extends Modal {
	private title: string;
	private buttonText: string;
	private gyazoService: GyazoService | null;
	private selectedFiles: File[] = [];
	private objectUrls: string[] = [];
	private result: PostResult | null = null;
	private resolve: (result: PostResult | null) => void;

	constructor(
		app: App,
		title: string,
		buttonText: string,
		gyazoService: GyazoService | null,
		resolve: (result: PostResult | null) => void
	) {
		super(app);
		this.title = title;
		this.buttonText = buttonText;
		this.gyazoService = gyazoService;
		this.resolve = resolve;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: this.title, cls: 'crystal-modal-title' });

		const textarea = contentEl.createEl('textarea', { cls: 'crystal-modal-input' });
		textarea.placeholder = '投稿内容を入力してください';

		const imageSection = contentEl.createDiv();
		imageSection.style.marginBottom = '16px';

		const imageRow = imageSection.createDiv({ cls: 'crystal-image-row' });

		const uploadButton = imageRow.createEl('button', { text: `ファイルを選択` });
		uploadButton.style.flexShrink = '0';

		const clipboardButton = imageRow.createEl('button', { text: 'クリップボードから貼り付け' });
		clipboardButton.style.flexShrink = '0';

		const previewEl = imageSection.createDiv({ cls: 'crystal-image-preview-row' });

		const refreshPreview = () => {
			for (const url of this.objectUrls) {
				URL.revokeObjectURL(url);
			}
			this.objectUrls = [];
			previewEl.empty();

			if (this.selectedFiles.length === 0) {
				previewEl.createEl('span', {
					text: `未選択 (最大${MAX_IMAGES}枚)`,
					cls: 'crystal-image-preview-empty',
				});
				return;
			}

			for (let i = 0; i < this.selectedFiles.length; i++) {
				const file = this.selectedFiles[i];
				const url = URL.createObjectURL(file);
				this.objectUrls.push(url);

				const wrapper = previewEl.createDiv({ cls: 'crystal-image-thumb' });

				const img = wrapper.createEl('img');
				img.src = url;

				img.addEventListener('click', (e) => {
					e.stopPropagation();
					new ImagePreviewModal(this.app, url).open();
				});

				const removeBtn = wrapper.createEl('button', { text: '×', cls: 'crystal-image-thumb-remove' });

				const capturedIndex = i;
				removeBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.selectedFiles = this.selectedFiles.filter((_, idx) => idx !== capturedIndex);
					refreshPreview();
				});
			}
		};
		refreshPreview();

		uploadButton.addEventListener('click', () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.multiple = true;
			input.addEventListener('change', () => {
				const incoming = Array.from(input.files || []);
				const remaining = MAX_IMAGES - this.selectedFiles.length;
				this.selectedFiles = [...this.selectedFiles, ...incoming.slice(0, remaining)];
				refreshPreview();
			});
			input.click();
		});

		clipboardButton.addEventListener('click', async () => {
			if (this.selectedFiles.length >= MAX_IMAGES) {
				new Notice(`⚠️ 画像は最大${MAX_IMAGES}枚まで選択できます`);
				return;
			}
			try {
				const items = await navigator.clipboard.read();
				const imageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
				for (const item of items) {
					for (const type of item.types) {
						if (imageTypes.includes(type)) {
							const blob = await item.getType(type);
							const ext = type.split('/')[1];
							const file = new File([blob], `clipboard.${ext}`, { type });
							this.selectedFiles = [...this.selectedFiles, file].slice(0, MAX_IMAGES);
							refreshPreview();
							return;
						}
					}
				}
				new Notice('⚠️ クリップボードに画像が見つかりません');
			} catch (e) {
				new Notice('❌ クリップボードの読み取りに失敗しました');
				console.error('Clipboard read failed:', e);
			}
		});

		const buttonContainer = contentEl.createDiv({ cls: 'crystal-modal-button-row' });

		const cancelButton = buttonContainer.createEl('button', { text: 'キャンセル' });
		const submitButton = buttonContainer.createEl('button', { text: this.buttonText });
		submitButton.addClass('mod-cta');

		const submit = async () => {
			const text = textarea.value.trim();
			if (!text) {
				this.result = null;
				this.close();
				return;
			}

			const gyazoUrls: string[] = [];
			if (this.selectedFiles.length > 0 && this.gyazoService) {
				submitButton.disabled = true;
				submitButton.textContent = 'アップロード中...';
				for (const file of this.selectedFiles) {
					try {
						const url = await this.gyazoService.uploadForUrl(file);
						gyazoUrls.push(url);
					} catch (e) {
						console.error('Gyazo upload failed:', e);
					}
				}
			}

			this.result = { text, gyazoUrls, imageFiles: this.selectedFiles };
			this.close();
		};

		cancelButton.addEventListener('click', () => {
			this.result = null;
			this.close();
		});
		submitButton.addEventListener('click', submit);

		let isComposing = false;
		textarea.addEventListener('compositionstart', () => { isComposing = true; });
		textarea.addEventListener('compositionend', () => { isComposing = false; });
		textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isComposing) {
				e.preventDefault();
				submit();
			} else if (e.key === 'Escape') {
				this.result = null;
				this.close();
			}
		});

		requestAnimationFrame(() => requestAnimationFrame(() => textarea.focus()));
	}

	onClose() {
		for (const url of this.objectUrls) {
			URL.revokeObjectURL(url);
		}
		this.objectUrls = [];
		this.resolve(this.result);
	}
}
