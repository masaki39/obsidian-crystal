import type { Editor, MarkdownView, Plugin } from 'obsidian';
import type { GyazoService } from './gyazo-service';
import type { GyazoImageMigrator } from './gyazo-image-migrator';
import type { GyazoLocalImageMigrator } from './gyazo-local-image-migrator';

export class GyazoCommands {
	constructor(
		private plugin: Plugin,
		private gyazoService: GyazoService,
		private gyazoImageMigrator: GyazoImageMigrator,
		private gyazoLocalImageMigrator: GyazoLocalImageMigrator
	) {}

	onload() {
		// Gyazo Upload Command
		this.plugin.addCommand({
			id: 'crystal-upload-clipboard-image',
			name: 'Gyazo: Upload clipboard image',
			icon: 'upload-cloud',
			editorCallback: async (editor: Editor) => {
				try {
					await this.gyazoService.uploadClipboardImage(editor);
				} catch (error) {
					console.error('Failed to upload clipboard image:', error);
				}
			}
		});

		// Gyazo File Upload Command
		this.plugin.addCommand({
			id: 'crystal-upload-file-image',
			name: 'Gyazo: Upload image file',
			icon: 'upload-cloud',
			editorCallback: async (editor: Editor) => {
				try {
					await this.gyazoService.promptFileUpload(editor);
				} catch (error) {
					console.error('Failed to upload image file:', error);
				}
			}
		});

		// Replace external image URLs in the active note with Gyazo-hosted copies
		this.plugin.addCommand({
			id: 'crystal-replace-image-urls-with-gyazo',
			name: 'Gyazo: Replace image URLs in active note',
			icon: 'image-plus',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					await this.gyazoImageMigrator.replaceExternalImagesInActiveNote(editor, view);
				} catch (error) {
					console.error('Failed to replace image URLs with Gyazo:', error);
				}
			}
		});

		// Replace local (vault) image embeds in the active note with Gyazo-hosted copies
		this.plugin.addCommand({
			id: 'crystal-replace-local-images-with-gyazo',
			name: 'Gyazo: Replace local images in active note',
			icon: 'image-plus',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				try {
					await this.gyazoLocalImageMigrator.replaceLocalImagesInActiveNote(editor, view);
				} catch (error) {
					console.error('Failed to replace local images with Gyazo:', error);
				}
			}
		});
	}
}
