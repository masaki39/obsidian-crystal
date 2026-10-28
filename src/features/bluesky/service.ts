import { AtpAgent, RichText } from '@atproto/api';
import { App, Notice, Plugin } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import type { DailyNotesManager } from '../daily-notes/manager';
import type { GyazoService } from '../gyazo/service';
import { formatXrpcError, isAuthError } from './errors';
import { registerBlueskyCommands } from './commands';
import { createEmbedCard, extractUrls } from './link-card';
import { getImageDimensions, MAX_IMAGES, PostModal, type PostResult } from './post-modal';

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
		// Log in lazily on the first post; avoids a network call on startup.
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
			throw new Error(`Bluesky認証に失敗しました: ${formatXrpcError(error)}`);
		}
	}

	async updateCredentials(identifier: string, password: string): Promise<void> {
		const changed = identifier !== this.identifier || password !== this.password;
		this.identifier = identifier;
		this.password = password;
		this.settings.blueskyIdentifier = identifier;
		this.settings.blueskyPassword = password;

		// Credentials unchanged: keep any existing session as-is. This prevents a
		// network login from firing on every saveSettings() (e.g. each keystroke
		// or slider step in the settings tab).
		if (!changed) {
			return;
		}

		// Invalidate the cached session; post() re-authenticates lazily on demand.
		this.agent = null;
	}

	async updateSettings(settings: CrystalPluginSettings): Promise<void> {
		this.settings = settings;
		await this.updateCredentials(settings.blueskyIdentifier, settings.blueskyPassword);
	}

	isAvailable(): boolean {
		return this.identifier !== '' && this.password !== '';
	}

	// imageFiles: up to 4 images; gyazoUrls: corresponding Gyazo URLs for daily note
	/** `dailyNoteText` replaces the text (and images) added to the daily note, when given. */
	async post(text: string, gyazoUrls: string[] = [], imageFiles: File[] = [], dailyNoteText?: string): Promise<void> {
		if (!this.isAvailable()) {
			throw new Error('Bluesky認証情報が設定されていません');
		}

		if (!this.agent) {
			await this.initializeAgent();
		}

		try {
			await this.createPost(text, imageFiles);
		} catch (error) {
			if (!isAuthError(error)) {
				console.error('Error posting to Bluesky:', error);
				throw new Error(`Bluesky投稿に失敗しました: ${formatXrpcError(error)}`);
			}
			// The cached session was rejected (expired or revoked token). Drop it and
			// re-authenticate once, so one stale session doesn't fail every post until
			// Obsidian is restarted.
			console.warn('Bluesky session rejected; re-authenticating and retrying once:', error);
			this.agent = null;
			await this.initializeAgent();
			try {
				await this.createPost(text, imageFiles);
			} catch (retryError) {
				console.error('Error posting to Bluesky after re-authentication:', retryError);
				throw new Error(`Bluesky投稿に失敗しました: ${formatXrpcError(retryError)}`);
			}
		}

		await this.appendPostToDailyNote(dailyNoteText ?? text, dailyNoteText === undefined ? gyazoUrls : []);
	}

	private async createPost(text: string, imageFiles: File[]): Promise<void> {
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
			const urls = extractUrls(text);
			if (urls.length > 0) {
				embed = await createEmbedCard(this.agent, urls[0]);
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
				new Notice('⚠️ 内容が空のため、追加をキャンセルしました。');
				return;
			}

			const imagePart = result.gyazoUrls.map(url => `![](${url})`).join('\n');
			const fullText = imagePart ? `${result.text}\n${imagePart}` : result.text;
			await this.dailyNotesManager.appendToTimeline(fullText);
			new Notice('✅ デイリーノートのタイムラインに追加しました。');
		} catch (error) {
			console.error('Error in promptAndAppendToDailyNote:', error);
			new Notice(`❌ 追加エラー: ${error.message}`);
		}
	}

	async promptAndPost(): Promise<void> {
		if (!this.isAvailable()) {
			new Notice('⚠️ Bluesky認証情報が設定されていません。設定からユーザー名とアプリパスワードを入力してください。');
			return;
		}

		try {
			const result = await new Promise<PostResult | null>((resolve) => {
				new PostModal(this.app, 'Blueskyに投稿', '投稿', this.gyazoService, resolve).open();
			});

			if (!result || !result.text.trim()) {
				new Notice('⚠️ 投稿内容が空のため、投稿をキャンセルしました。');
				return;
			}

			new Notice('⏳ Blueskyに投稿中...');
			await this.post(result.text, result.gyazoUrls, result.imageFiles);
			new Notice('✅ Blueskyに投稿が完了しました！');

		} catch (error) {
			console.error('Error in promptAndPost:', error);
			new Notice(`❌ 投稿エラー: ${error.message}`);
		}
	}

	async onload() {
		registerBlueskyCommands(this.plugin, this);
	}

}
