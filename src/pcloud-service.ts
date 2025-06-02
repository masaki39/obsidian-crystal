import { App, Notice, Editor } from 'obsidian';

export class PCloudService {
	private app: App;
	private username: string;
	private password: string;
	private publicFolderId: string;
	private webpQuality: number;
	private authToken: string | null = null;

	constructor(app: App, username: string, password: string, publicFolderId: string, webpQuality: number = 0.8) {
		this.app = app;
		this.username = username;
		this.password = password;
		this.publicFolderId = publicFolderId;
		this.webpQuality = webpQuality;
	}

	updateCredentials(username: string, password: string, publicFolderId: string, webpQuality: number = 0.8) {
		this.username = username;
		this.password = password;
		this.publicFolderId = publicFolderId;
		this.webpQuality = webpQuality;
		this.authToken = null; // Reset auth token when credentials change
	}

	private async authenticate(): Promise<string> {
		if (this.authToken) {
			return this.authToken;
		}

		if (!this.username || !this.password) {
			throw new Error('pCloud username and password are required');
		}

		try {
			const response = await fetch('https://api.pcloud.com/userinfo', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					username: this.username,
					password: this.password,
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
					username: this.username,
					password: this.password,
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

	private async convertToWebP(imageBlob: Blob): Promise<Blob> {
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
			img.src = URL.createObjectURL(imageBlob);
		});
	}

	async uploadClipboardImage(editor?: Editor): Promise<string> {
		try {
			// Check if Public Folder ID is configured
			if (!this.publicFolderId) {
				throw new Error('pCloud Public Folder ID is not configured. Please set it in plugin settings.');
			}

			// Get image from clipboard
			const clipboardItems = await navigator.clipboard.read();
			let imageBlob: Blob | null = null;

			for (const item of clipboardItems) {
				for (const type of item.types) {
					// Check for specific image MIME types
					if (type === 'image/png' || type === 'image/jpeg' || type === 'image/jpg' || 
						type === 'image/gif' || type === 'image/webp' || type === 'image/svg+xml') {
						imageBlob = await item.getType(type);
						break;
					}
				}
				if (imageBlob) break;
			}

			if (!imageBlob) {
				throw new Error('No image found in clipboard');
			}

			// Convert to WebP if it's not already WebP or GIF
			if (imageBlob.type !== 'image/webp' && imageBlob.type !== 'image/gif') {
				try {
					imageBlob = await this.convertToWebP(imageBlob);
					new Notice(`Image converted to WebP (quality: ${Math.round(this.webpQuality * 100)}%)`);
				} catch (conversionError) {
					console.warn('WebP conversion failed, using original format:', conversionError);
					new Notice('WebP conversion failed, uploading original format');
				}
			} else if (imageBlob.type === 'image/gif') {
				new Notice('GIF file detected - uploading without conversion to preserve animation');
			}

			// Generate filename with timestamp
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const extension = imageBlob.type === 'image/webp' ? 'webp' : (imageBlob.type.split('/')[1] || 'png');
			const filename = `clipboard-image-${timestamp}.${extension}`;

			// Get Public Folder ID
			const pcloudFolderId = await this.getPublicFolderId();

			// Upload file
			const formData = new FormData();
			formData.append('username', this.username);
			formData.append('password', this.password);
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
			const publicUrl = `https://filedn.com/${this.publicFolderId}/${filename}`;
			
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

		} catch (error) {
			console.error('Upload error:', error);
			new Notice(`Upload failed: ${error.message}`);
			throw error;
		}
	}
} 