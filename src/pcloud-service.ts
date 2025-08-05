import { App, Notice, Editor } from 'obsidian';
import { ImageProcessor } from './image-processor';
import { CrystalPluginSettings } from './settings';

export class PCloudService {
	private app: App;
	private settings: CrystalPluginSettings;
	private authToken: string | null = null;
	private imageProcessor: ImageProcessor;

	constructor(app: App, settings: CrystalPluginSettings) {
		this.app = app;
		this.settings = settings;
		this.imageProcessor = new ImageProcessor(settings);
	}

	private async authenticate(): Promise<string> {
		if (this.authToken) {
			return this.authToken;
		}

		if (!this.settings.pcloudUsername || !this.settings.pcloudPassword) {
			throw new Error('pCloud username and password are required');
		}

		try {
			const response = await fetch('https://api.pcloud.com/userinfo', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					username: this.settings.pcloudUsername,
					password: this.settings.pcloudPassword,
				}),
			});

			const data = await response.json();

			if (data.result !== 0) {
				throw new Error(`Authentication failed: ${data.error || 'Unknown error'}`);
			}

			this.authToken = data.auth ? String(data.auth) : 'authenticated';
			return this.authToken;
		} catch (error) {
			console.error('pCloud authentication error:', error);
			throw new Error(`Failed to authenticate with pCloud: ${error.message}`);
		}
	}

	private async getPublicFolderId(): Promise<number> {
		const authToken = await this.authenticate();

		try {
			const response = await fetch('https://api.pcloud.com/listfolder', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					username: this.settings.pcloudUsername,
					password: this.settings.pcloudPassword,
					folderid: '0', // Root folder
				}),
			});

			const data = await response.json();

			if (data.result !== 0) {
				throw new Error(`Failed to list folders: ${data.error || 'Unknown error'}`);
			}

			// Find Public Folder (with space)
			const publicFolder = data.metadata.contents.find((item: any) => 
				item.isfolder && item.name === 'Public Folder'
			);

			if (!publicFolder) {
				throw new Error('Public Folder not found');
			}

			return publicFolder.folderid;
		} catch (error) {
			console.error('Error getting Public Folder ID:', error);
			throw new Error(`Failed to get Public Folder: ${error.message}`);
		}
	}

	private async uploadProcessedImage(imageBlob: Blob, originalType: string, editor?: Editor): Promise<string> {
		// Generate filename with timestamp
		const filename = this.imageProcessor.generateTimestampFilename('image', imageBlob, originalType);

		// Get Public Folder ID
		const pcloudFolderId = await this.getPublicFolderId();

		// Upload file
		const formData = new FormData();
		formData.append('username', this.settings.pcloudUsername);
		formData.append('password', this.settings.pcloudPassword);
		formData.append('folderid', pcloudFolderId.toString());
		formData.append('filename', filename);
		formData.append('file', imageBlob, filename);

		const response = await fetch('https://api.pcloud.com/uploadfile', {
			method: 'POST',
			body: formData,
		});

		const data = await response.json();

		if (data.result !== 0) {
			throw new Error(`Upload failed: ${data.error || 'Unknown error'}`);
		}

		// Construct public URL using the configured Public Folder ID
		const publicUrl = `https://filedn.com/${this.settings.pcloudPublicFolderId}/${filename}`;
		
		// Insert markdown image syntax at cursor position
		if (editor) {
			const markdownImage = `![](${publicUrl})`;
			editor.replaceSelection(markdownImage);
			new Notice(`Image uploaded and inserted at cursor position.`);
		} else {
			// Fallback: copy URL to clipboard if no editor is available
			await navigator.clipboard.writeText(publicUrl);
			new Notice(`Image uploaded successfully! URL copied to clipboard (no active editor found).`);
		}
		
		return publicUrl;
	}

	async uploadFile(file: File, editor?: Editor): Promise<string> {
		try {
			// Check if Public Folder ID is configured
			if (!this.settings.pcloudPublicFolderId) {
				throw new Error('pCloud Public Folder ID is not configured. Please set it in plugin settings.');
			}

			// Check if it's an image file
			if (!file.type.startsWith('image/')) {
				throw new Error('Only image files are supported');
			}

			let imageBlob: Blob;
			let originalType: string;

			if (this.settings.autoWebpPaste) {
				// Process image using shared processor
				const processed = await this.imageProcessor.processImage(file);
				imageBlob = processed.blob;
				originalType = processed.originalType;
			} else {
				// Skip image processing, upload original file
				imageBlob = file;
				originalType = file.type;
			}

			// Upload image
			return await this.uploadProcessedImage(imageBlob, originalType, editor);

		} catch (error) {
			console.error('Upload error:', error);
			new Notice(`Upload failed: ${error.message}`);
			throw error;
		}
	}

	async uploadClipboardImage(editor?: Editor): Promise<string> {
		try {
			// Check if Public Folder ID is configured
			if (!this.settings.pcloudPublicFolderId) {
				throw new Error('pCloud Public Folder ID is not configured. Please set it in plugin settings.');
			}

			// Get image from clipboard
			const clipboardItems = await navigator.clipboard.read();
			let imageBlob: Blob | null = null;
			let originalType: string = '';

			for (const item of clipboardItems) {
				for (const type of item.types) {
					// Check for specific image MIME types
					if (type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg' || 
						type === 'image/gif' || type === 'image/webp' || type === 'image/svg+xml') {
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
				// Process image using shared processor
				const processed = await this.imageProcessor.processImage(imageBlob);
				finalBlob = processed.blob;
				finalType = processed.originalType;
			} else {
				// Skip image processing, upload original image
				finalBlob = imageBlob;
				finalType = originalType;
			}

			// Upload image
			return await this.uploadProcessedImage(finalBlob, finalType, editor);

		} catch (error) {
			console.error('Upload error:', error);
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
				const target = event.target as HTMLInputElement;
				const file = target.files?.[0];
				
				if (file) {
					try {
						const url = await this.uploadFile(file, editor);
						resolve(url);
					} catch (error) {
						console.error('File upload failed:', error);
						resolve(null);
					}
				} else {
					resolve(null);
				}
			});

			// Trigger file selection dialog
			input.click();
		});
	}
} 