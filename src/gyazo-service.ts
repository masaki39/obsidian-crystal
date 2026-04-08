import { Notice, Editor } from 'obsidian';
import { ImageProcessor } from './image-processor';
import { CrystalPluginSettings } from './settings';

export class GyazoService {
	private settings: CrystalPluginSettings;
	private imageProcessor: ImageProcessor;

	constructor(settings: CrystalPluginSettings) {
		this.settings = settings;
		this.imageProcessor = new ImageProcessor(settings);
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
		this.imageProcessor.updateSettings(settings);
	}

	private async uploadBlob(blob: Blob, originalType: string, editor?: Editor): Promise<string> {
		if (!this.settings.gyazoAccessToken) {
			throw new Error('Gyazo access token is not configured. Please set it in plugin settings.');
		}

		const filename = this.imageProcessor.generateTimestampFilename('image', blob, originalType);

		const formData = new FormData();
		formData.append('access_token', this.settings.gyazoAccessToken);
		formData.append('imagedata', blob, filename);

		const response = await fetch('https://upload.gyazo.com/api/upload', {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Gyazo upload failed: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		const url: string = data.url;

		if (!url) {
			throw new Error('Gyazo upload failed: no URL returned');
		}

		if (editor) {
			editor.replaceSelection(`![](${url})`);
			new Notice('Image uploaded and inserted.');
		} else {
			await navigator.clipboard.writeText(url);
			new Notice('Image uploaded. URL copied to clipboard.');
		}

		return url;
	}

	async uploadFile(file: File, editor?: Editor): Promise<string> {
		if (!file.type.startsWith('image/')) {
			throw new Error('Only image files are supported');
		}

		try {
			let blob: Blob;
			let originalType: string;

			if (this.settings.autoWebpPaste) {
				const processed = await this.imageProcessor.processImage(file);
				blob = processed.blob;
				originalType = processed.originalType;
			} else {
				blob = file;
				originalType = file.type;
			}

			return await this.uploadBlob(blob, originalType, editor);
		} catch (error) {
			new Notice(`Upload failed: ${error.message}`);
			throw error;
		}
	}

	async uploadClipboardImage(editor?: Editor): Promise<string> {
		try {
			const clipboardItems = await navigator.clipboard.read();
			let imageBlob: Blob | null = null;
			let originalType = '';

			for (const item of clipboardItems) {
				for (const type of item.types) {
					if (['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'].includes(type)) {
						imageBlob = await item.getType(type);
						originalType = type;
						break;
					}
				}
				if (imageBlob) break;
			}

			if (!imageBlob) {
				throw new Error('No image found in clipboard');
			}

			let finalBlob: Blob;
			let finalType: string;

			if (this.settings.autoWebpPaste) {
				const processed = await this.imageProcessor.processImage(imageBlob);
				finalBlob = processed.blob;
				finalType = processed.originalType;
			} else {
				finalBlob = imageBlob;
				finalType = originalType;
			}

			return await this.uploadBlob(finalBlob, finalType, editor);
		} catch (error) {
			new Notice(`Upload failed: ${error.message}`);
			throw error;
		}
	}

	async promptFileUpload(editor?: Editor): Promise<string | null> {
		return new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.multiple = false;

			input.addEventListener('change', async (event) => {
				const file = (event.target as HTMLInputElement).files?.[0];
				if (file) {
					try {
						const url = await this.uploadFile(file, editor);
						resolve(url);
					} catch {
						resolve(null);
					}
				} else {
					resolve(null);
				}
			});

			input.click();
		});
	}
}
