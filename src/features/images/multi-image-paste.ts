import type { App, Editor } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import type { ImageProcessor } from '../../shared/image-processor';
import { resolveAttachmentFolder } from './attachment-folder';

/**
 * Prompt user to select multiple images from file system and paste them
 */
export async function promptMultipleImagePaste(app: App, settings: CrystalPluginSettings, imageProcessor: ImageProcessor, editor: Editor): Promise<void> {
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
					// Resolve the configured attachment folder ("/", ".", "./sub" forms)
					const attachmentFolder = await resolveAttachmentFolder(app);

					// Ensure attachment folder exists
					if (attachmentFolder && !(await app.vault.adapter.exists(attachmentFolder))) {
						await app.vault.createFolder(attachmentFolder);
					}

					// Convert FileList to Array
					const fileArray = Array.from(files);

					// Process all images in parallel
					const results = await Promise.all(
						fileArray.map(async (imageFile, index) => {
							let processed: { blob: Blob, originalType: string, isConverted: boolean };

							if (settings.autoWebpPaste) {
								// Process image using shared processor (without notice since we'll show our own)
								processed = await imageProcessor.processImage(imageFile, false);
							} else {
								// Don't process image, just use original
								processed = {
									blob: imageFile,
									originalType: imageFile.type,
									isConverted: false
								};
							}

							// Generate filename for the vault with index to avoid collisions
							const baseFilename = imageProcessor.generateTimestampFilename('pasted-image', processed.blob, processed.originalType);
							const filename = fileArray.length > 1
								? baseFilename.replace(/(\.[^.]+)$/, `_${index + 1}$1`)
								: baseFilename;
							const attachmentPath = attachmentFolder ? `${attachmentFolder}/${filename}` : filename;

							// Convert blob to array buffer
							const arrayBuffer = await processed.blob.arrayBuffer();

							// Save file to vault
							await app.vault.createBinary(attachmentPath, arrayBuffer);

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
						if (settings.autoWebpPaste) {
							if (result.processed.isConverted) {
								console.log(`画像をWebPに変換した (品質: ${Math.round(settings.webpQuality * 100)}%)`);
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
						if (settings.autoWebpPaste && convertedCount > 0) {
							console.log(`${fileArray.length}枚の画像を処理した (${convertedCount}枚をWebPに変換、品質: ${Math.round(settings.webpQuality * 100)}%)`);
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
