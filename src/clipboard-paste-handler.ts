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
		// Only handle drag over in markdown views
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
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
		// Only handle drop in markdown views
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) {
			return;
		}
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
		// Only handle paste in markdown views
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) {
			return;
		}
		const editor = markdownView.editor;

		// Check if clipboard contains data
		const clipboardData = event.clipboardData;
		if (!clipboardData) {
			return;
		}

		// First priority: Check for plain text content
		// This prevents rich text (like from Word) from being treated as an image
		const textData = clipboardData.getData('text/plain');
		if (textData && textData.trim()) {
			// If there's text content, let the default paste behavior handle it
			return;
		}

		// Second priority: Check for HTML content that should be treated as text
		const htmlData = clipboardData.getData('text/html');
		if (htmlData && htmlData.trim()) {
			// Extract text content from HTML and paste as plain text
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = htmlData;
			const textContent = tempDiv.textContent || tempDiv.innerText || '';
			
			if (textContent.trim()) {
				event.preventDefault();
				event.stopPropagation();
				editor.replaceSelection(textContent);
				return;
			}
		}

		// Third priority: Check for actual image files
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
			let processed: {blob: Blob, originalType: string, isConverted: boolean};
			
			if (this.settings.autoWebpPaste) {
				// Process image using shared processor (without notice since we'll show our own)
				processed = await this.imageProcessor.processImage(imageFile, false);
			} else {
				// Don't process image, just use original
				processed = {
					blob: imageFile,
					originalType: imageFile.type,
					isConverted: false
				};
			}

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
			if (this.settings.autoWebpPaste) {
				if (processed.isConverted) {
					console.log(`画像をWebPに変換した (品質: ${Math.round(this.settings.webpQuality * 100)}%)`);
				} else if (processed.originalType === 'image/gif') {
					console.log('GIFファイルのためアニメーション保持のため変換をスキップ');
				}
				console.log(`画像がWebP形式でヴォルトに保存された: ${filename}`);
			} else {
				console.log(`画像がヴォルトに保存された: ${filename}`);
			}

		} catch (error) {
			console.error('Error processing image paste:', error);
			throw error;
		}
	}

	/**
	 * Prompt user to select multiple images from file system and paste them
	 */
	async promptMultipleImagePaste(editor: Editor): Promise<void> {
		return new Promise((resolve) => {
			// Create file input element
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.multiple = true; // Enable multiple file selection

			// Handle file selection
			input.addEventListener('change', async (event) => {
				const target = event.target as HTMLInputElement;
				const files = target.files;

				if (files && files.length > 0) {
					try {
						// Get attachments folder or use default
						const attachmentFolder = (this.app.vault as any).config?.attachmentFolderPath || 'attachments';

						// Ensure attachment folder exists
						const folderExists = await this.app.vault.adapter.exists(attachmentFolder);
						if (!folderExists) {
							await this.app.vault.createFolder(attachmentFolder);
						}

						// Convert FileList to Array
						const fileArray = Array.from(files);

						// Process all images in parallel
						const results = await Promise.all(
							fileArray.map(async (imageFile, index) => {
								let processed: {blob: Blob, originalType: string, isConverted: boolean};

								if (this.settings.autoWebpPaste) {
									// Process image using shared processor (without notice since we'll show our own)
									processed = await this.imageProcessor.processImage(imageFile, false);
								} else {
									// Don't process image, just use original
									processed = {
										blob: imageFile,
										originalType: imageFile.type,
										isConverted: false
									};
								}

								// Generate filename for the vault with index to avoid collisions
								const baseFilename = this.imageProcessor.generateTimestampFilename('pasted-image', processed.blob, processed.originalType);
								const filename = fileArray.length > 1
									? baseFilename.replace(/(\.[^.]+)$/, `_${index + 1}$1`)
									: baseFilename;
								const attachmentPath = `${attachmentFolder}/${filename}`;

								// Convert blob to array buffer
								const arrayBuffer = await processed.blob.arrayBuffer();

								// Save file to vault
								await this.app.vault.createBinary(attachmentPath, arrayBuffer);

								return {
									filename,
									processed
								};
							})
						);

						// Insert all markdown image links at cursor position (one per line)
						const markdownImages = results.map(result => `![[${result.filename}]]`).join('\n');
						editor.replaceSelection(markdownImages);

						// Show appropriate message
						if (fileArray.length === 1) {
							const result = results[0];
							if (this.settings.autoWebpPaste) {
								if (result.processed.isConverted) {
									console.log(`画像をWebPに変換した (品質: ${Math.round(this.settings.webpQuality * 100)}%)`);
								} else if (result.processed.originalType === 'image/gif') {
									console.log('GIFファイルのためアニメーション保持のため変換をスキップ');
								}
								console.log(`画像がWebP形式でヴォルトに保存された: ${result.filename}`);
							} else {
								console.log(`画像がヴォルトに保存された: ${result.filename}`);
							}
						} else {
							// Multiple images
							const convertedCount = results.filter(r => r.processed.isConverted).length;
							if (this.settings.autoWebpPaste && convertedCount > 0) {
								console.log(`${fileArray.length}枚の画像を処理した (${convertedCount}枚をWebPに変換、品質: ${Math.round(this.settings.webpQuality * 100)}%)`);
							} else {
								console.log(`${fileArray.length}枚の画像がヴォルトに保存された`);
							}
						}

						resolve();
					} catch (error) {
						console.error('Failed to process selected images:', error);
						console.log(`画像の処理に失敗した: ${error.message}`);
						resolve();
					}
				} else {
					resolve();
				}
			});

			// Trigger file selection dialog
			input.click();
		});
	}

	/**
	 * Register commands (similar to marp.ts pattern)
	 */
	onload() {
		// Wait for workspace to be ready before registering commands
		this.app.workspace.onLayoutReady(() => {
			(this.app as any).commands.addCommand({
				id: 'crystal-paste-multiple-images-from-filesystem',
				name: 'Paste Multiple Images from File System',
				editorCallback: (editor: Editor) => {
					this.promptMultipleImagePaste(editor);
				}
			});
		});
	}
} 