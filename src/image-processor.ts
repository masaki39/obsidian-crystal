import { Notice } from 'obsidian';
import { CrystalPluginSettings } from './settings';
const moment = require('moment');

export interface ProcessedImage {
	blob: Blob;
	originalType: string;
	isConverted: boolean;
}

export class ImageProcessor {
	private settings: CrystalPluginSettings;

	constructor(settings: CrystalPluginSettings) {
		this.settings = settings;
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
					new Notice(`Image converted to WebP (quality: ${Math.round(this.settings.webpQuality * 100)}%)`);
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

				const maxSize = this.settings.imageMaxSize;
				const resizeScale = this.settings.imageResizeScale;
				
				// Calculate target dimensions
				let targetWidth = img.width * resizeScale;
				let targetHeight = img.height * resizeScale;
				
				// Check if resized dimensions exceed maxSize
				if (targetWidth > maxSize || targetHeight > maxSize) {
					const scale = maxSize / Math.max(targetWidth, targetHeight);
					targetWidth = targetWidth * scale;
					targetHeight = targetHeight * scale;
				}

				// Set canvas size to target dimensions
				canvas.width = targetWidth;
				canvas.height = targetHeight;

				// Draw image to canvas with scaling
				ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

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

	/**
	 * Generate timestamp-based filename
	 */
	generateTimestampFilename(prefix: string, blob: Blob, originalType: string): string {
		const timestamp = moment().format('YYYYMMDDHHmmss');
		const extension = blob.type === 'image/webp' ? 'webp' : (originalType.split('/')[1] || 'png');
		return `${prefix}_${timestamp}.${extension}`;
	}
} 