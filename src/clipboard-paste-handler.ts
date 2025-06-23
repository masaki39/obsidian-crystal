import { App, Editor, MarkdownView } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { ImageProcessor } from './image-processor';

export class ImagePasteAndDropHandler {
	private app: App;
	private settings: CrystalPluginSettings;
	private imageProcessor: ImageProcessor;
	private boundPasteHandler: (event: ClipboardEvent) => Promise<void>;
	private boundDragOverHandler: (event: DragEvent) => void;
	private boundDropHandler: (event: DragEvent) => Promise<void>;
	private isEnabled: boolean = false;

	constructor(app: App, settings: CrystalPluginSettings) {
		this.app = app;
		this.settings = settings;
		this.imageProcessor = new ImageProcessor(settings);
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
			// Process image using shared processor (without notice since we'll show our own)
			const processed = await this.imageProcessor.processImage(imageFile, false);

			// Generate filename for the vault
			const filename = this.imageProcessor.generateTimestampFilename('pasted-image', processed.blob, processed.originalType);

			// Get attachments folder or use default
			const attachmentFolder = (this.app.vault as any).config?.attachmentFolderPath || 'attachments';
			const attachmentPath = `${attachmentFolder}/${filename}`;

			// Ensure attachment folder exists
			const folderExists = await this.app.vault.adapter.exists(attachmentFolder);
			if (!folderExists) {
				await this.app.vault.createFolder(attachmentFolder);
			}

			// Convert blob to array buffer
			const arrayBuffer = await processed.blob.arrayBuffer();

			// Save file to vault
			await this.app.vault.createBinary(attachmentPath, arrayBuffer);

			// Insert markdown image link at cursor position
			const markdownImage = `![[${filename}]]`;
			editor.replaceSelection(markdownImage);

			// Show appropriate message
			if (processed.isConverted) {
				console.log(`画像をWebPに変換した (品質: ${Math.round(this.settings.webpQuality * 100)}%)`);
			} else if (processed.originalType === 'image/gif') {
				console.log('GIFファイルのためアニメーション保持のため変換をスキップ');
			}
			
			console.log(`画像がWebP形式でヴォルトに保存された: ${filename}`);

		} catch (error) {
			console.error('Error processing image paste:', error);
			throw error;
		}
	}
} 