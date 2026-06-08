import { AtpAgent, RichText } from '@atproto/api';
import { App, Modal, Notice, requestUrl, Plugin } from 'obsidian';
import { CrystalPluginSettings } from './settings';
import { DailyNotesManager } from './daily-notes';
import { GyazoService } from './gyazo-service';

interface UrlMetadata {
	title: string;
	description: string;
	image: string;
}

interface PostResult {
	text: string;
	gyazoUrls: string[];
	imageFiles: File[];
}

const MAX_IMAGES = 4;

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image'));
		};
		img.src = url;
	});
}

class PostModal extends Modal {
	private title: string;
	private buttonText: string;
	private gyazoService: GyazoService | null;
	private selectedFiles: File[] = [];
	private result: PostResult | null = null;
	private resolve: (result: PostResult | null) => void;

	constructor(
		app: App,
		title: string,
		buttonText: string,
		gyazoService: GyazoService | null,
		resolve: (result: PostResult | null) => void
	) {
		super(app);
		this.title = title;
		this.buttonText = buttonText;
		this.gyazoService = gyazoService;
		this.resolve = resolve;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h3', { text: this.title });

		const textarea = contentEl.createEl('textarea');
		textarea.style.width = '100%';
		textarea.style.height = '120px';
		textarea.style.resize = 'vertical';
		textarea.style.fontFamily = 'inherit';
		textarea.style.marginBottom = '8px';
		textarea.placeholder = '投稿内容を入力してください';

		const imageRow = contentEl.createDiv();
		imageRow.style.display = 'flex';
		imageRow.style.alignItems = 'flex-start';
		imageRow.style.gap = '8px';
		imageRow.style.marginBottom = '16px';

		const uploadButton = imageRow.createEl('button', { text: `画像を選択 (最大${MAX_IMAGES}枚)` });
		uploadButton.style.flexShrink = '0';

		const fileListEl = imageRow.createEl('ul');
		fileListEl.style.margin = '0';
		fileListEl.style.padding = '0';
		fileListEl.style.listStyle = 'none';
		fileListEl.style.fontSize = '0.82em';
		fileListEl.style.color = 'var(--text-muted)';

		const refreshFileList = () => {
			fileListEl.empty();
			if (this.selectedFiles.length === 0) {
				const li = fileListEl.createEl('li', { text: '未選択' });
				li.style.color = 'var(--text-muted)';
			} else {
				for (const file of this.selectedFiles) {
					const li = fileListEl.createEl('li', { text: file.name });
					li.style.color = 'var(--text-normal)';
				}
			}
		};
		refreshFileList();

		uploadButton.addEventListener('click', () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/*';
			input.multiple = true;
			input.addEventListener('change', () => {
				const files = Array.from(input.files || []).slice(0, MAX_IMAGES);
				this.selectedFiles = files;
				refreshFileList();
			});
			input.click();
		});

		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '8px';
		buttonContainer.style.justifyContent = 'flex-end';

		const cancelButton = buttonContainer.createEl('button', { text: 'キャンセル' });
		const submitButton = buttonContainer.createEl('button', { text: this.buttonText });
		submitButton.addClass('mod-cta');

		const submit = async () => {
			const text = textarea.value.trim();
			if (!text) {
				this.result = null;
				this.close();
				return;
			}

			const gyazoUrls: string[] = [];
			if (this.selectedFiles.length > 0 && this.gyazoService) {
				submitButton.disabled = true;
				submitButton.textContent = 'アップロード中...';
				for (const file of this.selectedFiles) {
					try {
						const url = await this.gyazoService.uploadForUrl(file);
						gyazoUrls.push(url);
					} catch (e) {
						console.error('Gyazo upload failed:', e);
					}
				}
			}

			this.result = { text, gyazoUrls, imageFiles: this.selectedFiles };
			this.close();
		};

		cancelButton.addEventListener('click', () => {
			this.result = null;
			this.close();
		});
		submitButton.addEventListener('click', submit);

		let isComposing = false;
		textarea.addEventListener('compositionstart', () => { isComposing = true; });
		textarea.addEventListener('compositionend', () => { isComposing = false; });
		textarea.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isComposing) {
				e.preventDefault();
				submit();
			} else if (e.key === 'Escape') {
				this.result = null;
				this.close();
			}
		});

		requestAnimationFrame(() => requestAnimationFrame(() => textarea.focus()));
	}

	onClose() {
		this.resolve(this.result);
	}
}

export class BlueskyService {
	private agent: AtpAgent | null = null;
	private app: App;
    private plugin: Plugin;
	private settings: CrystalPluginSettings;
	private dailyNotesManager: DailyNotesManager;
	private gyazoService: GyazoService | null;
	private identifier: string;
	private password: string;

	constructor(app: App, plugin: Plugin, settings: CrystalPluginSettings, dailyNotesManager: DailyNotesManager, gyazoService: GyazoService | null = null) {
		this.app = app;
        this.plugin = plugin;
		this.settings = settings;
		this.dailyNotesManager = dailyNotesManager;
		this.gyazoService = gyazoService;
		this.identifier = settings.blueskyIdentifier || '';
		this.password = settings.blueskyPassword || '';

		if (this.identifier && this.password) {
			this.initializeAgent();
		}
	}

	private async initializeAgent(): Promise<void> {
		try {
			this.agent = new AtpAgent({
				service: 'https://bsky.social',
			});

			await this.agent.login({
				identifier: this.identifier,
				password: this.password,
			});
		} catch (error) {
			console.error('Bluesky login failed:', error);
			this.agent = null;
			throw new Error('Bluesky認証に失敗しました');
		}
	}

	async updateCredentials(identifier: string, password: string): Promise<void> {
		this.identifier = identifier;
		this.password = password;
		this.settings.blueskyIdentifier = identifier;
		this.settings.blueskyPassword = password;

		if (identifier && password) {
			await this.initializeAgent();
		} else {
			this.agent = null;
		}
	}

	async updateSettings(settings: CrystalPluginSettings): Promise<void> {
		this.settings = settings;
		await this.updateCredentials(settings.blueskyIdentifier, settings.blueskyPassword);
	}

	isAvailable(): boolean {
		return this.identifier !== '' && this.password !== '';
	}

	private extractMetadataFromHtml(html: string): UrlMetadata | null {
		try {
			let title = '';
			const ogTitleMatch = html.match(/<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
			if (ogTitleMatch) {
				title = ogTitleMatch[1];
			} else {
				const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
				if (titleMatch) {
					title = titleMatch[1];
				}
			}

			let description = '';
			const ogDescMatch = html.match(/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
			if (ogDescMatch) {
				description = ogDescMatch[1];
			} else {
				const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
				if (descMatch) {
					description = descMatch[1];
				}
			}

			let image = '';
			const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
			if (ogImageMatch) {
				image = ogImageMatch[1];
			}

			title = this.decodeHtmlEntities(title);
			description = this.decodeHtmlEntities(description);

			if (!title && !description) {
				return null;
			}

			return { title, description, image };
		} catch (error) {
			console.error('Error extracting metadata from HTML:', error);
			return null;
		}
	}

	private decodeHtmlEntities(text: string): string {
		const entities: { [key: string]: string } = {
			'&amp;': '&',
			'&lt;': '<',
			'&gt;': '>',
			'&quot;': '"',
			'&#39;': "'",
			'&apos;': "'",
		};

		return text.replace(/&[#\w]+;/g, (entity) => {
			return entities[entity] || entity;
		});
	}

	private async getUrlMetadata(url: string): Promise<UrlMetadata | null> {
		try {
			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				}
			});

			if (response.status !== 200) {
				return null;
			}

			return this.extractMetadataFromHtml(response.text);
		} catch (error) {
			console.error('Error fetching URL metadata:', error);
			return null;
		}
	}

	private async createEmbedCard(url: string): Promise<any | null> {
		if (!this.agent) return null;

		try {
			const metadata = await this.getUrlMetadata(url);

			let title, description;
			if (!metadata) {
				try {
					const urlObj = new URL(url);
					title = urlObj.hostname;
					description = '';
				} catch (urlError) {
					return null;
				}
			} else {
				title = metadata.title || url;
				description = metadata.description || '';
			}

			let thumb;
			if (metadata?.image) {
				try {
					const imageResponse = await requestUrl({
						url: metadata.image,
						method: 'GET',
					});

					if (imageResponse.status === 200) {
						const uint8Array = new Uint8Array(imageResponse.arrayBuffer);
						let encoding = 'image/jpeg';
						if (metadata.image.toLowerCase().includes('.png')) {
							encoding = 'image/png';
						} else if (metadata.image.toLowerCase().includes('.webp')) {
							encoding = 'image/webp';
						}
						const { data } = await this.agent.uploadBlob(uint8Array, { encoding });
						thumb = data.blob;
					}
				} catch (imageError) {
					console.warn('Failed to upload image for embed:', imageError);
				}
			}

			return {
				$type: 'app.bsky.embed.external',
				external: {
					uri: url,
					title: title,
					description: description,
					thumb: thumb,
				},
			};
		} catch (error) {
			console.error('Error creating embed card:', error);
			return null;
		}
	}

	private extractUrls(text: string): string[] {
		const urlRegex = /https?:\/\/[^\s]+/g;
		return text.match(urlRegex) || [];
	}

	// imageFiles: up to 4 images; gyazoUrls: corresponding Gyazo URLs for daily note
	async post(text: string, gyazoUrls: string[] = [], imageFiles: File[] = []): Promise<void> {
		if (!this.isAvailable()) {
			throw new Error('Bluesky認証情報が設定されていません');
		}

		if (!this.agent) {
			await this.initializeAgent();
		}

		try {
			const rt = new RichText({ text });
			await rt.detectFacets(this.agent!);

			let embed;
			if (imageFiles.length > 0) {
				const images = [];
				for (const file of imageFiles.slice(0, MAX_IMAGES)) {
					const arrayBuffer = await file.arrayBuffer();
					const uint8Array = new Uint8Array(arrayBuffer);
					const { data } = await this.agent!.uploadBlob(uint8Array, { encoding: file.type });
					let aspectRatio: { width: number; height: number } | undefined;
					try {
						aspectRatio = await getImageDimensions(file);
					} catch {
						// aspectRatio省略でも投稿可能
					}
					images.push({ image: data.blob, alt: '', ...(aspectRatio && { aspectRatio }) });
				}
				embed = {
					$type: 'app.bsky.embed.images',
					images,
				};
			} else {
				const urls = this.extractUrls(text);
				if (urls.length > 0) {
					embed = await this.createEmbedCard(urls[0]);
				}
			}

			const postRecord = {
				$type: 'app.bsky.feed.post',
				text: rt.text,
				facets: rt.facets,
				createdAt: new Date().toISOString(),
				langs: ['ja'],
				...(embed && { embed }),
			};

			await this.agent!.com.atproto.repo.createRecord({
				repo: this.agent!.session?.did || '',
				collection: 'app.bsky.feed.post',
				record: postRecord,
			});

			await this.appendPostToDailyNote(text, gyazoUrls);

		} catch (error) {
			console.error('Error posting to Bluesky:', error);
			throw new Error(`Bluesky投稿に失敗しました: ${error.message}`);
		}
	}

	private async appendPostToDailyNote(text: string, gyazoUrls: string[]): Promise<void> {
		if (!this.settings.blueskyAppendToDailyNote) {
			return;
		}
		if (!this.dailyNotesManager) {
			return;
		}
		try {
			const imagePart = gyazoUrls.map(url => `![](${url})`).join('\n');
			const fullText = imagePart ? `${text}\n${imagePart}` : text;
			await this.dailyNotesManager.appendToTimeline(fullText, new Date(), 'blue');
		} catch (error) {
			console.error('Failed to append Bluesky post to daily note:', error);
		}
	}

	async promptAndAppendToDailyNote(): Promise<void> {
		try {
			const result = await new Promise<PostResult | null>((resolve) => {
				new PostModal(this.app, 'デイリーノートに追加', '追加', this.gyazoService, resolve).open();
			});

			if (!result || !result.text.trim()) {
				new Notice('内容が空のため、追加をキャンセルしました。');
				return;
			}

			const imagePart = result.gyazoUrls.map(url => `![](${url})`).join('\n');
			const fullText = imagePart ? `${result.text}\n${imagePart}` : result.text;
			await this.dailyNotesManager.appendToTimeline(fullText);
			new Notice('デイリーノートのタイムラインに追加しました。');
		} catch (error) {
			console.error('Error in promptAndAppendToDailyNote:', error);
			new Notice(`追加エラー: ${error.message}`);
		}
	}

	async promptAndPost(): Promise<void> {
		if (!this.isAvailable()) {
			new Notice('Bluesky認証情報が設定されていません。設定からユーザー名とアプリパスワードを入力してください。');
			return;
		}

		try {
			const result = await new Promise<PostResult | null>((resolve) => {
				new PostModal(this.app, 'Blueskyに投稿', '投稿', this.gyazoService, resolve).open();
			});

			if (!result || !result.text.trim()) {
				new Notice('投稿内容が空のため、投稿をキャンセルしました。');
				return;
			}

			new Notice('Blueskyに投稿中...');
			await this.post(result.text, result.gyazoUrls, result.imageFiles);
			new Notice('Blueskyに投稿が完了しました！');

		} catch (error) {
			console.error('Error in promptAndPost:', error);
			new Notice(`投稿エラー: ${error.message}`);
		}
	}

    async onload() {
        this.plugin.addCommand({
            id: 'crystal-post-to-bluesky',
            name: 'Post to Bluesky',
            callback: () => {
                this.promptAndPost();
            }
        });

        this.plugin.addCommand({
            id: 'crystal-post-to-daily-note',
            name: 'Post to Daily Note Timeline',
            callback: () => {
                this.promptAndAppendToDailyNote();
            }
        });
    }

}
