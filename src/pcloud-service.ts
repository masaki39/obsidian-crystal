import { App, Notice, Editor } from 'obsidian';

export class PCloudService {
	private app: App;
	private username: string;
	private password: string;
	private publicFolderId: string;
	private authToken: string | null = null;

	constructor(app: App, username: string, password: string, publicFolderId: string) {
		this.app = app;
		this.username = username;
		this.password = password;
		this.publicFolderId = publicFolderId;
	}

	updateCredentials(username: string, password: string, publicFolderId: string) {
		this.username = username;
		this.password = password;
		this.publicFolderId = publicFolderId;
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

			// Generate filename with timestamp
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const extension = imageBlob.type.split('/')[1] || 'png';
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