import { App, Modal, Notice } from 'obsidian';
import type { GyazoService } from '../gyazo/service';
import { pickImageFiles } from '../../shared/ui/pick-image-files';

export interface PostResult {
	text: string;
	gyazoUrls: string[];
	imageFiles: File[];
}

export const MAX_IMAGES = 4;

/** Which window the post modal was opened from. */
export type PostTarget = 'bluesky' | 'daily-note';

/**
 * Whether attached images should be uploaded to Gyazo (public) on submit.
 * The Gyazo URLs are only used in the daily note timeline, so upload only when
 * the post actually ends up there: always for the daily note window, and for
 * the Bluesky window only while timeline appending is on.
 */
export function shouldUploadToGyazo(target: PostTarget, hasGyazoService: boolean, appendToDailyNote: boolean): boolean {
	if (!hasGyazoService) {
		return false;
	}
	return target === 'daily-note' || appendToDailyNote;
}

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
	private shouldUploadImages: () => boolean;
	private selectedFiles: File[] = [];
	private objectUrls: string[] = [];
	private result: PostResult | null = null;
	private resolve: (result: PostResult | null) => void;

	constructor(
		app: App,
		title: string,
		buttonText: string,
		gyazoService: GyazoService | null,
		shouldUploadImages: () => boolean,
		resolve: (result: PostResult | null) => void
	) {
		super(app);
		this.title = title;
		this.buttonText = buttonText;
		this.gyazoService = gyazoService;
		this.shouldUploadImages = shouldUploadImages;
		this.resolve = resolve;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: this.title, cls: 'crystal-modal-title' });

		const textarea = contentEl.createEl('textarea', { cls: 'crystal-modal-input' });
		textarea.placeholder = 'What\'s on your mind?';

		const imageSection = contentEl.createDiv();
		imageSection.style.marginBottom = '16px';

		const imageRow = imageSection.createDiv({ cls: 'crystal-image-row' });

		const uploadButton = imageRow.createEl('button', { text: 'Choose files' });
		uploadButton.style.flexShrink = '0';

		const clipboardButton = imageRow.createEl('button', { text: 'Paste from clipboard' });
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
					text: `No images selected (max ${MAX_IMAGES})`,
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
			pickImageFiles(true, (incoming) => {
				const remaining = MAX_IMAGES - this.selectedFiles.length;
				this.selectedFiles = [...this.selectedFiles, ...incoming.slice(0, remaining)];
				refreshPreview();
			});
		});

		clipboardButton.addEventListener('click', async () => {
			if (this.selectedFiles.length >= MAX_IMAGES) {
				new Notice(`⚠️ You can select up to ${MAX_IMAGES} images`);
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
				new Notice('⚠️ No image found in clipboard');
			} catch (e) {
				new Notice('❌ Failed to read clipboard');
				console.error('Clipboard read failed:', e);
			}
		});

		const buttonContainer = contentEl.createDiv({ cls: 'crystal-modal-button-row' });

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
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
			// Checked at submit time so a settings change while the window is open is respected.
			if (this.selectedFiles.length > 0 && this.gyazoService && this.shouldUploadImages()) {
				submitButton.disabled = true;
				submitButton.textContent = 'Uploading…';
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
