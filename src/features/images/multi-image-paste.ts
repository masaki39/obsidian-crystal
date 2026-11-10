import type { App, Editor } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import type { ImageProcessor } from '../../shared/image-processor';
import { pickImageFiles } from '../../shared/ui/pick-image-files';
import { resolveAttachmentFolder } from './attachment-folder';

/**
 * Prompt user to select multiple images from file system and paste them
 */
export async function promptMultipleImagePaste(app: App, settings: CrystalPluginSettings, imageProcessor: ImageProcessor, editor: Editor): Promise<void> {
	return new Promise((resolve) => {
		// Let the user pick images (multiple selection allowed)
		pickImageFiles(true, async (files) => {
			if (files.length > 0) {
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
								console.log(`Converted image to WebP (quality: ${Math.round(settings.webpQuality * 100)}%)`);
							} else if (result.processed.originalType === 'image/gif') {
								console.log('Skipped conversion for GIF to keep animation');
							}
							console.log(`Saved WebP image to vault: ${result.filename}`);
						} else {
							console.log(`Saved image to vault: ${result.filename}`);
						}
					} else {
						// Multiple images
						const convertedCount = results.filter(r => r.processed.isConverted).length;
						if (settings.autoWebpPaste && convertedCount > 0) {
							console.log(`Processed ${fileArray.length} image(s) (${convertedCount} converted to WebP, quality: ${Math.round(settings.webpQuality * 100)}%)`);
						} else {
							console.log(`Saved ${fileArray.length} image(s) to vault`);
						}
					}

					resolve();
				} catch (error) {
					console.error('Failed to process selected images:', error);
					console.log(`Failed to process image: ${error.message}`);
					resolve();
				}
			} else {
				resolve();
			}
		});
	});
}
