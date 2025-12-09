import { AtpAgent, RichText } from '@atproto/api';
import { App, Notice, requestUrl, Plugin } from 'obsidian';
import { promptForText } from './utils';
import { CrystalPluginSettings } from './settings';
import { DailyNotesManager } from './daily-notes';

interface UrlMetadata {
	title: string;
	description: string;
	image: string;
}

export class BlueskyService {
	private agent: AtpAgent | null = null;
	private app: App;
    private plugin: Plugin;
	private settings: CrystalPluginSettings;
	private dailyNotesManager: DailyNotesManager;
	private identifier: string;
	private password: string;

	constructor(app: App, plugin: Plugin, settings: CrystalPluginSettings, dailyNotesManager: DailyNotesManager) {
		this.app = app;
        this.plugin = plugin;
		this.settings = settings;
		this.dailyNotesManager = dailyNotesManager;
		this.identifier = settings.blueskyIdentifier || '';
		this.password = settings.blueskyPassword || '';
		
		if (this.identifier && this.password) {
			this.initializeAgent();
		}
	}

	/**
	 * エージェントを初期化してログインする
	 */
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

	/**
	 * 認証情報を更新してサービスを再初期化する
	 */
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

	/**
	 * サービスが利用可能かチェックする
	 */
	isAvailable(): boolean {
		return this.agent !== null && this.identifier !== '' && this.password !== '';
	}

	/**
	 * HTMLからOpen Graphメタデータを抽出する
	 */
	private extractMetadataFromHtml(html: string): UrlMetadata | null {
		try {
			// タイトルを抽出
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

			// 説明を抽出
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

			// 画像を抽出
			let image = '';
			const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']*)["\'][^>]*>/i);
			if (ogImageMatch) {
				image = ogImageMatch[1];
			}

			// HTMLエンティティをデコード
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

	/**
	 * HTMLエンティティをデコードする
	 */
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

	/**
	 * URLのメタデータを取得する
	 */
	private async getUrlMetadata(url: string): Promise<UrlMetadata | null> {
		try {
			console.log(`URLのメタデータを取得中: ${url}`);
			
			// 直接URLにアクセスしてHTMLを取得
			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
				}
			});
			
			if (response.status !== 200) {
				console.warn(`Failed to fetch URL: ${response.status}`);
				return null;
			}
			
			const html = response.text;
			console.log(`HTML取得完了、文字数: ${html.length}`);
			
			// HTMLからメタデータを抽出
			const metadata = this.extractMetadataFromHtml(html);
			
			if (!metadata) {
				console.warn('No valid metadata found in HTML');
				return null;
			}
			
			console.log('メタデータ抽出成功:', metadata);
			return metadata;
		} catch (error) {
			console.error('Error fetching URL metadata:', error);
			return null;
		}
	}

	/**
	 * URLからembedカードを作成する
	 */
	private async createEmbedCard(url: string): Promise<any | null> {
		if (!this.agent) return null;

		try {
			const metadata = await this.getUrlMetadata(url);
			
			// メタデータが取得できなかった場合は基本的なembedカードを作成
			let title, description;
			if (!metadata) {
				console.log('メタデータ取得失敗、基本embedカードを作成');
				// URLからドメインを抽出してタイトルにする
				try {
					const urlObj = new URL(url);
					title = urlObj.hostname;
					description = ''; // 説明なし
				} catch (urlError) {
					console.warn('Invalid URL format:', urlError);
					return null;
				}
			} else {
				title = metadata.title || url;
				description = metadata.description || '';
			}

			// 画像がある場合はBlueskyにアップロード
			let thumb;
			if (metadata?.image) {
				try {
					const imageResponse = await requestUrl({
						url: metadata.image,
						method: 'GET',
					});
					
					if (imageResponse.status === 200) {
						const arrayBuffer = imageResponse.arrayBuffer;
						const uint8Array = new Uint8Array(arrayBuffer);
						
						// コンテンツタイプを推測（拡張子から）
						let encoding = 'image/jpeg';
						if (metadata.image.toLowerCase().includes('.png')) {
							encoding = 'image/png';
						} else if (metadata.image.toLowerCase().includes('.webp')) {
							encoding = 'image/webp';
						}
						
						const { data } = await this.agent.uploadBlob(uint8Array, { 
							encoding: encoding
						});
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

	/**
	 * テキストからURLを検出する
	 */
	private extractUrls(text: string): string[] {
		const urlRegex = /https?:\/\/[^\s]+/g;
		const urls = text.match(urlRegex) || [];
		console.log(`Text: "${text}"`);
		console.log(`Detected URLs:`, urls);
		return urls;
	}

	/**
	 * Blueskyに投稿する
	 */
	async post(text: string): Promise<void> {
		if (!this.isAvailable()) {
			throw new Error('Bluesky認証情報が設定されていません');
		}

		if (!this.agent) {
			await this.initializeAgent();
		}

		try {
			// RichTextを使ってリンクを自動検出
			const rt = new RichText({ text });
			await rt.detectFacets(this.agent!);

			// URLを検出してembedカードを作成
			const urls = this.extractUrls(text);
			let embed;
			if (urls.length > 0) {
				console.log(`最初のURLでembedカードを作成中: ${urls[0]}`);
				// 最初のURLでembedカードを作成
				embed = await this.createEmbedCard(urls[0]);
				if (embed) {
					console.log('embedカード作成成功');
				} else {
					console.warn('embedカード作成失敗');
				}
			} else {
				console.log('テキストにURLが見つかりませんでした');
			}

			// 投稿実行
			const postRecord = {
				$type: 'app.bsky.feed.post',
				text: rt.text,
				facets: rt.facets,
				createdAt: new Date().toISOString(),
				langs: ['ja'], // 日本語設定
				...(embed && { embed }),
			};

			await this.agent!.com.atproto.repo.createRecord({
				repo: this.agent!.session?.did || '',
				collection: 'app.bsky.feed.post',
				record: postRecord,
			});

			await this.appendPostToDailyNote(text);

		} catch (error) {
			console.error('Error posting to Bluesky:', error);
			throw new Error(`Bluesky投稿に失敗しました: ${error.message}`);
		}
	}

	private async appendPostToDailyNote(text: string): Promise<void> {
		if (!this.settings.blueskyAppendToDailyNote) {
			return;
		}
		if (!this.dailyNotesManager) {
			return;
		}
		try {
			await this.dailyNotesManager.appendToTimeline(text, new Date(), 'blue');
		} catch (error) {
			console.error('Failed to append Bluesky post to daily note:', error);
		}
	}

	/**
	 * Blueskyへ投稿せず、デイリーノートのタイムラインにだけ書き込む
	 */
	async promptAndAppendToDailyNote(): Promise<void> {
		try {
			const text = await promptForText(
				this.app,
				'デイリーノートに追加',
				'投稿内容を入力してください',
				'追加',
				'',
				true
			);

			if (!text || !text.trim()) {
				new Notice('内容が空のため、追加をキャンセルしました。');
				return;
			}

			await this.dailyNotesManager.appendToTimeline(text);
			new Notice('デイリーノートのタイムラインに追加しました。');
		} catch (error) {
			console.error('Error in promptAndAppendToDailyNote:', error);
			new Notice(`追加エラー: ${error.message}`);
		}
	}

	/**
	 * テキスト入力ダイアログを表示してBlueskyに投稿する
	 */
	async promptAndPost(): Promise<void> {
		if (!this.isAvailable()) {
			new Notice('Bluesky認証情報が設定されていません。設定からユーザー名とアプリパスワードを入力してください。');
			return;
		}

		try {
			const text = await promptForText(
				this.app,
				'Blueskyに投稿',
				'投稿内容を入力してください（URLも自動でembedされます）',
				'投稿',
				'',
                true
			);

			if (!text || !text.trim()) {
				new Notice('投稿内容が空のため、投稿をキャンセルしました。');
				return;
			}

			new Notice('Blueskyに投稿中...');
			await this.post(text);
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
