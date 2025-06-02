import { Notice } from 'obsidian';

export interface ProcessedImage {
	blob: Blob;
	originalType: string;
	isConverted: boolean;
}

export class ImageProcessor {
	private webpQuality: number;

	constructor(webpQuality: number = 0.8) {
		this.webpQuality = webpQuality;
	}

	updateQuality(quality: number) {
		this.webpQuality = quality;
	}

	/**
	 * Process image: convert to WebP if applicable, preserve GIF animation
	 */
	async processImage(imageFile: File | Blob, showNotice: boolean = true): Promise<ProcessedImage> {
		const originalType = imageFile.type;
		let processedBlob: Blob = imageFile;
		let isConverted = false;

		// Convert to WebP if it's not already WebP or GIF
		if (originalType !== 'image/webp' && originalType !== 'image/gif') {
			try {
				processedBlob = await this.convertToWebP(imageFile);
				isConverted = true;
				if (showNotice) {
					new Notice(`Image converted to WebP (quality: ${Math.round(this.webpQuality * 100)}%)`);
				}
			} catch (conversionError) {
				console.warn('WebP conversion failed, using original format:', conversionError);
				if (showNotice) {
					new Notice('WebP conversion failed, uploading original format');
				}
				processedBlob = imageFile;
			}
		} else if (originalType === 'image/gif') {
			if (showNotice) {
				new Notice('GIF file detected - uploading without conversion to preserve animation');
			}
		}

		return {
			blob: processedBlob,
			originalType,
			isConverted
		};
	}

	/**
	 * Convert image to WebP format
	 */
	private async convertToWebP(imageFile: File | Blob): Promise<Blob> {
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
				}, 'image/webp', this.webpQuality);
			};

			img.onerror = () => {
				reject(new Error('Failed to load image for conversion'));
			};

			// Create object URL for the image
			img.src = URL.createObjectURL(imageFile);
		});
	}

	/**
	 * Generate timestamp-based filename
	 */
	generateTimestampFilename(prefix: string, blob: Blob, originalType: string): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const extension = blob.type === 'image/webp' ? 'webp' : (originalType.split('/')[1] || 'png');
		return `${prefix}-${timestamp}.${extension}`;
	}

	/**
	 * Generate filename for local vault usage
	 */
	generateVaultFilename(blob: Blob, originalType: string): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
		const extension = blob.type === 'image/webp' ? 'webp' : (originalType.split('/')[1] || 'png');
		return `pasted-image-${timestamp}.${extension}`;
	}
} 