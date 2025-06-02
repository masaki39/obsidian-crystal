import { App, Editor, MarkdownView, Plugin } from 'obsidian';
import { CrystalPluginSettings } from './settings';

export class ImagePasteAndDropHandler {
	private app: App;
	private settings: CrystalPluginSettings;
	private boundPasteHandler: (event: ClipboardEvent) => Promise<void>;
	private boundDragOverHandler: (event: DragEvent) => void;
	private boundDropHandler: (event: DragEvent) => Promise<void>;
	private isEnabled: boolean = false;

	constructor(app: App, settings: CrystalPluginSettings) {
		this.app = app;
		this.settings = settings;
		this.boundPasteHandler = this.handlePaste.bind(this);
		this.boundDragOverHandler = this.handleDragOver.bind(this);
		this.boundDropHandler = this.handleDrop.bind(this);
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
	}

	enable() {
		if (this.isEnabled) {
			return; // Already enabled
		}
		// Add paste event listener to the document
		document.addEventListener('paste', this.boundPasteHandler, true);
		// Add drag and drop event listeners
		document.addEventListener('dragover', this.boundDragOverHandler, true);
		document.addEventListener('drop', this.boundDropHandler, true);
		this.isEnabled = true;
	}

	disable() {
		if (!this.isEnabled) {
			return; // Already disabled
		}
		// Remove paste event listener
		document.removeEventListener('paste', this.boundPasteHandler, true);
		// Remove drag and drop event listeners
		document.removeEventListener('dragover', this.boundDragOverHandler, true);
		document.removeEventListener('drop', this.boundDropHandler, true);
		this.isEnabled = false;
	}

	private handleDragOver(event: DragEvent): void {
		// Check if auto WebP paste is enabled
		if (!this.settings.autoWebpPaste) {
			return;
		}

		// Only handle drag over in markdown views
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf || !activeLeaf.view || !(activeLeaf.view instanceof MarkdownView)) {
			return;
		}

		// Check if drag contains image files
		const dataTransfer = event.dataTransfer;
		if (!dataTransfer) {
			return;
		}

		const hasImageFiles = Array.from(dataTransfer.items).some(item => 
			item.kind === 'file' && item.type.startsWith('image/')
		);

		if (hasImageFiles) {
			// Prevent default to allow drop
			event.preventDefault();
			event.stopPropagation();
		}
	}

	private async handleDrop(event: DragEvent): Promise<void> {
		// Check if auto WebP paste is enabled
		if (!this.settings.autoWebpPaste) {
			return;
		}

		// Only handle drop in markdown views
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf || !activeLeaf.view || !(activeLeaf.view instanceof MarkdownView)) {
			return;
		}

		const markdownView = activeLeaf.view as MarkdownView;
		const editor = markdownView.editor;

		// Check if drop contains image data
		const dataTransfer = event.dataTransfer;
		if (!dataTransfer) {
			return;
		}

		let imageFile: File | null = null;
		for (let i = 0; i < dataTransfer.files.length; i++) {
			const file = dataTransfer.files[i];
			if (file.type.startsWith('image/')) {
				imageFile = file;
				break;
			}
		}

		if (!imageFile) {
			return; // No image found, let default drop behavior handle it
		}

		// Prevent default drop behavior for images
		event.preventDefault();
		event.stopPropagation();

		try {
			await this.processImagePaste(imageFile, editor);
		} catch (error) {
			console.error('Failed to process image drop:', error);
			console.log(`画像の処理に失敗した: ${error.message}`);
		}
	}

	private async handlePaste(event: ClipboardEvent): Promise<void> {
		// Check if auto WebP paste is enabled
		if (!this.settings.autoWebpPaste) {
			return;
		}

		// Only handle paste in markdown views
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf || !activeLeaf.view || !(activeLeaf.view instanceof MarkdownView)) {
			return;
		}

		const markdownView = activeLeaf.view as MarkdownView;
		const editor = markdownView.editor;

		// Check if clipboard contains image data
		const clipboardData = event.clipboardData;
		if (!clipboardData) {
			return;
		}

		let imageFile: File | null = null;
		for (let i = 0; i < clipboardData.files.length; i++) {
			const file = clipboardData.files[i];
			if (file.type.startsWith('image/')) {
				imageFile = file;
				break;
			}
		}

		// Also check for image items in clipboard data
		if (!imageFile) {
			for (let i = 0; i < clipboardData.items.length; i++) {
				const item = clipboardData.items[i];
				if (item.type.startsWith('image/')) {
					const file = item.getAsFile();
					if (file) {
						imageFile = file;
						break;
					}
				}
			}
		}

		if (!imageFile) {
			return; // No image found, let default paste behavior handle it
		}

		// Prevent default paste behavior for images
		event.preventDefault();
		event.stopPropagation();

		try {
			await this.processImagePaste(imageFile, editor);
		} catch (error) {
			console.error('Failed to process image paste:', error);
			console.log(`画像の処理に失敗した: ${error.message}`);
		}
	}

	private async processImagePaste(imageFile: File, editor: Editor): Promise<void> {
		try {
			// Convert to WebP if it's not already WebP or GIF
			let processedBlob: Blob = imageFile;
			
			if (imageFile.type !== 'image/webp' && imageFile.type !== 'image/gif') {
				try {
					processedBlob = await this.convertToWebP(imageFile);
					console.log(`画像をWebPに変換した (品質: ${Math.round(this.settings.webpQuality * 100)}%)`);
				} catch (conversionError) {
					console.warn('WebP conversion failed, using original format:', conversionError);
					console.log('WebP変換に失敗、元の形式でペーストする');
				}
			} else if (imageFile.type === 'image/gif') {
				console.log('GIFファイルのためアニメーション保持のため変換をスキップ');
			}

			// Generate filename for the vault
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
			const extension = processedBlob.type === 'image/webp' ? 'webp' : (imageFile.type.split('/')[1] || 'png');
			const filename = `pasted-image-${timestamp}.${extension}`;

			// Get attachments folder or use default
			const attachmentFolder = (this.app.vault as any).config?.attachmentFolderPath || 'attachments';
			const attachmentPath = `${attachmentFolder}/${filename}`;

			// Ensure attachment folder exists
			const folderExists = await this.app.vault.adapter.exists(attachmentFolder);
			if (!folderExists) {
				await this.app.vault.createFolder(attachmentFolder);
			}

			// Convert blob to array buffer
			const arrayBuffer = await processedBlob.arrayBuffer();

			// Save file to vault
			await this.app.vault.createBinary(attachmentPath, arrayBuffer);

			// Insert markdown image link at cursor position
			const markdownImage = `![[${filename}]]`;
			editor.replaceSelection(markdownImage);

			console.log(`画像がWebP形式でヴォルトに保存された: ${filename}`);

		} catch (error) {
			console.error('Error processing image paste:', error);
			throw error;
		}
	}

	private async convertToWebP(imageFile: File): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				// Create canvas
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				
				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
				}

				// Set canvas size to image size
				canvas.width = img.width;
				canvas.height = img.height;

				// Draw image to canvas
				ctx.drawImage(img, 0, 0);

				// Convert to WebP blob
				canvas.toBlob((webpBlob) => {
					if (webpBlob) {
						resolve(webpBlob);
					} else {
						reject(new Error('Failed to convert image to WebP'));
					}
				}, 'image/webp', this.settings.webpQuality);
			};

			img.onerror = () => {
				reject(new Error('Failed to load image for conversion'));
			};

			// Create object URL for the image
			img.src = URL.createObjectURL(imageFile);
		});
	}
} 