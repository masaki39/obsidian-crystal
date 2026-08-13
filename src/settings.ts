import { App, IconName, Notice, Plugin, PluginSettingTab, Setting, requestUrl, setIcon } from 'obsidian';
import { AtpAgent } from '@atproto/api';
import { calculateLevel } from './gamification';

export interface FileOrganizationRule {
	displayName: string;
	tag: string;
	folder: string;
	prefix: string;
	includeDate: boolean;
}

export interface CrystalPluginSettings {
	exportFolderPath: string;
	aiProvider: 'gemini' | 'openai';
	GeminiAPIKey: string;
	GeminiModel: string;
	OpenAIAPIKey: string;
	OpenAIModel: string;
	blueskyIdentifier: string;
	blueskyPassword: string;
	blueskyAppendToDailyNote: boolean;
	dailyNoteTimelineHeading: string;
	dailyNoteAutoSort: boolean;
	dailyNoteAutoLink: boolean;
	dailyNoteNewestFirst: boolean;
	webpQuality: number;
	imageResizeScale: number;
	imageMaxSize: number;
	autoWebpPaste: boolean;
	gyazoAccessToken: string;
	marpSlideFolderPath: string;
	marpThemePath: string;
	marpAttachmentFolderPath: string;
	publishFolderPath: string;
	quartzPath: string;
	quartzSiteName: string;
	githubUserName: string;
	fileOrganizationRules: FileOrganizationRule[];
	gamificationEnabled: boolean;
	gamificationTotalXP: number;
	gamificationStreak: number;
	gamificationLastActiveDate: string;
	gamificationFreezeTokensAvailable: number;
	gamificationFreezeTokensRefillMonth: string;
	gamificationUnlockedBadges: string[];
	gamificationTotalTasksCompleted: number;
	gamificationStartDate: string;
	gamificationDailyXPLog: Record<string, number>;
	gamificationFreezeTokenLog: string[];
	gamificationBestStreak: number;
	gamificationBestDayTasks: number;
	gamificationBestWeekXP: number;
	gamificationDailyTaskLog: Record<string, number>;
	gamificationFreezeMilestonesGranted: number[];
	/** Local day-of-week (0=Sunday..6=Saturday) that never counts as a missed
	 * day for streak purposes, or -1 if no rest day is configured. */
	gamificationRestDayOfWeek: number;
}

export const DEFAULT_SETTINGS: CrystalPluginSettings = {
	exportFolderPath: '',
	aiProvider: 'openai',
	GeminiAPIKey: '',
	GeminiModel: 'gemini-flash-latest',
	OpenAIAPIKey: '',
	OpenAIModel: 'gpt-4o-mini',
	blueskyIdentifier: '',
	blueskyPassword: '',
	blueskyAppendToDailyNote: false,
	dailyNoteTimelineHeading: '# Time Line',
	dailyNoteAutoSort: true,
	dailyNoteAutoLink: true,
	dailyNoteNewestFirst: false,
	webpQuality: 0.85,
	imageResizeScale: 0.8,
	imageMaxSize: 700,
	autoWebpPaste: true,
	gyazoAccessToken: '',
	marpSlideFolderPath: '',
	marpThemePath: '',
	marpAttachmentFolderPath: '',
	publishFolderPath: 'Publish',
	quartzPath: '',
	quartzSiteName: '',
	githubUserName: '',
	fileOrganizationRules: [],
	gamificationEnabled: false,
	gamificationTotalXP: 0,
	gamificationStreak: 0,
	gamificationLastActiveDate: '',
	gamificationFreezeTokensAvailable: 2,
	gamificationFreezeTokensRefillMonth: '',
	gamificationUnlockedBadges: [],
	gamificationTotalTasksCompleted: 0,
	gamificationStartDate: '',
	gamificationDailyXPLog: {},
	gamificationFreezeTokenLog: [],
	gamificationBestStreak: 0,
	gamificationBestDayTasks: 0,
	gamificationBestWeekXP: 0,
	gamificationDailyTaskLog: {},
	gamificationFreezeMilestonesGranted: [],
	gamificationRestDayOfWeek: -1,
}

export class CrystalSettingTab extends PluginSettingTab {
	plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> };

	constructor(app: App, plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> }) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private sectionHeading(containerEl: HTMLElement, name: string, icon: IconName, sub = false) {
		const setting = new Setting(containerEl).setName(name).setHeading();
		setting.settingEl.addClass('crystal-section-heading');
		if (sub) setting.settingEl.addClass('crystal-section-heading-sub');
		const iconEl = createSpan({ cls: 'crystal-section-icon' });
		setIcon(iconEl, icon);
		setting.nameEl.prepend(iconEl);
		return setting;
	}

	private textSetting(containerEl: HTMLElement, name: string, desc: string, key: string, value: string) {
		return new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText(text => text
				.setPlaceholder(value)
				.setValue((this.plugin.settings as any)[key])
				.onChange(async (value) => {
					(this.plugin.settings as any)[key] = value;
					await this.plugin.saveSettings();
				}));
	}

	private toggleSetting(containerEl: HTMLElement, name: string, desc: string, key: string) {
		return new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle(toggle => toggle
				.setValue((this.plugin.settings as any)[key])
				.onChange(async (value) => {
					(this.plugin.settings as any)[key] = value;
					await this.plugin.saveSettings();
				}));
	}

	private secretSetting(containerEl: HTMLElement, name: string, desc: string | DocumentFragment, placeholder: string, field: keyof CrystalPluginSettings) {
		// Persist through saveSettings() so the secret is written to SecretStorage
		// and the affected services are refreshed immediately (no reload required).
		return new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addText(text => {
				text.setPlaceholder(placeholder)
					.setValue(this.plugin.settings[field] as string)
					.onChange(async (value) => {
						(this.plugin.settings as any)[field] = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
				return text;
			});
	}

	private addVerifyButton(setting: Setting, verify: () => Promise<void>) {
		setting.addButton(button => button
			.setButtonText('Verify')
			.onClick(async () => {
				button.setDisabled(true);
				button.setButtonText('Verifying…');
				try {
					await verify();
					new Notice('✅ Valid: the credential works.');
				} catch (error) {
					new Notice(`❌ Invalid: ${error.message}`);
				} finally {
					button.setDisabled(false);
					button.setButtonText('Verify');
				}
			}));
	}

	private async verifyGyazoToken(token: string): Promise<void> {
		if (!token) throw new Error('Access token is empty');
		const response = await requestUrl({
			url: `https://api.gyazo.com/api/images?access_token=${encodeURIComponent(token)}&per_page=1`,
			method: 'GET',
			throw: false,
		});
		if (response.status === 401) throw new Error('Invalid access token');
		if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
	}

	private async verifyOpenAIKey(key: string): Promise<void> {
		if (!key) throw new Error('API key is empty');
		const response = await requestUrl({
			url: 'https://api.openai.com/v1/models',
			method: 'GET',
			headers: { 'Authorization': `Bearer ${key}` },
			throw: false,
		});
		if (response.status === 401) throw new Error('Invalid API key');
		if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
	}

	private async verifyGeminiKey(key: string): Promise<void> {
		if (!key) throw new Error('API key is empty');
		const response = await requestUrl({
			url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
			method: 'GET',
			throw: false,
		});
		if (response.status === 400 || response.status === 401 || response.status === 403) throw new Error('Invalid API key');
		if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
	}

	private async verifyBlueskyCredentials(identifier: string, password: string): Promise<void> {
		if (!identifier || !password) throw new Error('Handle/email and app password are required');
		const agent = new AtpAgent({ service: 'https://bsky.social' });
		await agent.login({ identifier, password });
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// General settings
		this.sectionHeading(containerEl, 'General settings', 'settings-2');

		this.textSetting(containerEl, 'Export Folder Path', 'Folder where this plugin exports files (used by PDF and Marp features)', 'exportFolderPath', 'Enter Export Folder Path');

		// AI settings
		this.sectionHeading(containerEl, 'AI editor commands', 'bot');

		new Setting(containerEl)
			.setName('AI Provider')
			.setDesc('Select which AI provider to use for editor commands')
			.addDropdown(dropdown => dropdown
				.addOption('openai', 'OpenAI')
				.addOption('gemini', 'Gemini')
				.setValue(this.plugin.settings.aiProvider)
				.onChange(async (value) => {
					this.plugin.settings.aiProvider = value as 'gemini' | 'openai';
					await this.plugin.saveSettings();
				}));

		this.addVerifyButton(
			this.secretSetting(containerEl, 'OpenAI API Key', 'Enter your OpenAI API Key', 'Enter your OpenAI API Key', 'OpenAIAPIKey'),
			() => this.verifyOpenAIKey(this.plugin.settings.OpenAIAPIKey)
		);

		new Setting(containerEl)
			.setName('OpenAI Model')
			.setDesc('Select the OpenAI model to use')
			.addDropdown(dropdown => dropdown
				.addOption('gpt-5', 'gpt-5')
				.addOption('gpt-5-mini', 'gpt-5-mini')
				.addOption('gpt-5-nano', 'gpt-5-nano')
				.addOption('gpt-4.1', 'gpt-4.1')
				.addOption('gpt-4.1-mini', 'gpt-4.1-mini')
				.addOption('gpt-4o', 'gpt-4o')
				.addOption('gpt-4o-mini', 'gpt-4o-mini')
				.setValue(this.plugin.settings.OpenAIModel)
				.onChange(async (value) => {
					this.plugin.settings.OpenAIModel = value;
					await this.plugin.saveSettings();
				}));

		this.addVerifyButton(
			this.secretSetting(containerEl, 'Gemini API Key', 'Enter your Gemini API Key', 'Enter your Gemini API Key', 'GeminiAPIKey'),
			() => this.verifyGeminiKey(this.plugin.settings.GeminiAPIKey)
		);

		new Setting(containerEl)
			.setName('Gemini Model')
			.setDesc('Select the Gemini model to use')
			.addDropdown(dropdown => dropdown
				.addOption('gemini-flash-latest', 'gemini-flash-latest')
				.addOption('gemini-flash-lite-latest', 'gemini-flash-lite-latest')
				.addOption('gemini-2.5-flash', 'gemini-2.5-flash')
				.addOption('gemini-2.5-flash-lite', 'gemini-2.5-flash-lite')
				.addOption('gemini-2.0-flash', 'gemini-2.0-flash')
				.addOption('gemini-2.0-flash-lite', 'gemini-2.0-flash-lite')
				.addOption('gemma-4-31b-it', 'gemma-4-31b-it')
				.addOption('gemma-4-26b-a4b-it', 'gemma-4-26b-a4b-it')
				.setValue(this.plugin.settings.GeminiModel)
				.onChange(async (value) => {
					this.plugin.settings.GeminiModel = value;
					await this.plugin.saveSettings();
				}));

		// Bluesky settings
		this.sectionHeading(containerEl, 'Bluesky', 'cloud');

		this.secretSetting(containerEl, 'Bluesky Handle/Email', 'Your Bluesky handle (e.g., user.bsky.social) or email address', 'Enter your Bluesky handle or email', 'blueskyIdentifier');

		this.addVerifyButton(
			this.secretSetting(containerEl, 'Bluesky App Password', 'Your Bluesky app password (create one in Bluesky Settings > App Passwords)', 'Enter your Bluesky app password', 'blueskyPassword'),
			() => this.verifyBlueskyCredentials(this.plugin.settings.blueskyIdentifier, this.plugin.settings.blueskyPassword)
		);

		this.toggleSetting(containerEl, 'Append Bluesky posts to Daily Note timeline', 'Add each post to today\'s daily note timeline section', 'blueskyAppendToDailyNote');
		this.textSetting(containerEl, 'Daily Note timeline heading', 'Heading text that marks the timeline section (exact match)', 'dailyNoteTimelineHeading', '# Time Line');

		// Daily notes settings
		this.sectionHeading(containerEl, 'Daily notes', 'calendar-days');

		this.toggleSetting(containerEl, 'Auto Sort Tasks', 'Sort tasks in daily notes automatically', 'dailyNoteAutoSort');
		this.toggleSetting(containerEl, 'Auto Link Notes', 'Add link to today\'s daily note when create any note', 'dailyNoteAutoLink');
		this.toggleSetting(containerEl, 'Newest First (Daily Notes)', 'Place new daily note entries at the top (tasks, links, timeline)', 'dailyNoteNewestFirst');

		// Gamification settings
		this.sectionHeading(containerEl, 'Gamification', 'gamepad-2');

		this.toggleSetting(containerEl, 'Enable Gamification', 'Earn XP (with occasional bonus rewards), levels, streaks and badges for completing tasks in daily notes. Open the Gamification view (ribbon icon, or the command palette) to see full details', 'gamificationEnabled');

		new Setting(containerEl)
			.setName('Rest day')
			.setDesc('A weekly day off: missing tasks on this day never breaks your streak and never costs a freeze token. Applies going forward only.')
			.addDropdown(dropdown => dropdown
				.addOption('-1', 'None')
				.addOption('0', 'Sunday')
				.addOption('1', 'Monday')
				.addOption('2', 'Tuesday')
				.addOption('3', 'Wednesday')
				.addOption('4', 'Thursday')
				.addOption('5', 'Friday')
				.addOption('6', 'Saturday')
				.setValue(String(this.plugin.settings.gamificationRestDayOfWeek))
				.onChange(async (value) => {
					this.plugin.settings.gamificationRestDayOfWeek = parseInt(value, 10);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Reset progress')
			.setDesc(`Lv.${calculateLevel(this.plugin.settings.gamificationTotalXP).level} · ${this.plugin.settings.gamificationTotalXP} XP · ${this.plugin.settings.gamificationStreak}d streak · ${this.plugin.settings.gamificationFreezeTokensAvailable} freeze · ${this.plugin.settings.gamificationUnlockedBadges.length} badges`)
			.addButton(button => button
				.setButtonText('Reset')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.gamificationTotalXP = 0;
					this.plugin.settings.gamificationStreak = 0;
					this.plugin.settings.gamificationLastActiveDate = '';
					this.plugin.settings.gamificationFreezeTokensAvailable = 2;
					this.plugin.settings.gamificationFreezeTokensRefillMonth = '';
					this.plugin.settings.gamificationUnlockedBadges = [];
					this.plugin.settings.gamificationTotalTasksCompleted = 0;
					this.plugin.settings.gamificationStartDate = '';
					this.plugin.settings.gamificationDailyXPLog = {};
					this.plugin.settings.gamificationFreezeTokenLog = [];
					this.plugin.settings.gamificationBestStreak = 0;
					this.plugin.settings.gamificationBestDayTasks = 0;
					this.plugin.settings.gamificationBestWeekXP = 0;
					this.plugin.settings.gamificationDailyTaskLog = {};
					this.plugin.settings.gamificationFreezeMilestonesGranted = [];
					await this.plugin.saveSettings();
					this.display();
				}));

		// Image settings
		this.sectionHeading(containerEl, 'Image processor', 'image');

		new Setting(containerEl)
			.setName('Auto Convert Images to WebP on Paste')
			.setDesc('Automatically convert pasted images to WebP format and save to vault')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoWebpPaste)
				.onChange(async (value) => {
					this.plugin.settings.autoWebpPaste = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('WebP Compression Quality')
			.setDesc('Quality for WebP compression (0.1 = lowest quality/smallest file, 1.0 = highest quality/largest file)')
			.addSlider(slider => slider
				.setLimits(0.1, 1.0, 0.05)
				.setValue(this.plugin.settings.webpQuality)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.webpQuality = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Image Default Resize Scale')
			.setDesc('Default scale for resizing images (0.1 = 10%, 1.0 = 100%)')
			.addSlider(slider => slider
				.setLimits(0.1, 1.0, 0.05)
				.setValue(this.plugin.settings.imageResizeScale)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.imageResizeScale = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Image Max Size')
			.setDesc('Maximum size for images (in pixels)')
			.addText(text => text
				.setPlaceholder('1024')
				.setValue(this.plugin.settings.imageMaxSize.toString())
				.onChange(async (value) => {
					this.plugin.settings.imageMaxSize = parseInt(value) || 1024;
					await this.plugin.saveSettings();
				}));

		// Gyazo settings
		this.sectionHeading(containerEl, 'Gyazo uploader', 'upload-cloud', true);

		const gyazoDesc = document.createDocumentFragment();
		gyazoDesc.append('Access token from ');
		gyazoDesc.createEl('a', { text: 'gyazo.com/oauth/applications', href: 'https://gyazo.com/oauth/applications' });
		gyazoDesc.append(' (create an app → copy the access token)');
		this.addVerifyButton(
			this.secretSetting(containerEl, 'Gyazo access token', gyazoDesc, 'Enter Gyazo access token', 'gyazoAccessToken'),
			() => this.verifyGyazoToken(this.plugin.settings.gyazoAccessToken)
		);

		// Marp settings
		this.sectionHeading(containerEl, 'Marp', 'presentation');

		this.textSetting(containerEl, 'Marp Slide Folder Path (relative path)', 'Folder where slide files are organized', 'marpSlideFolderPath', 'e.g. Slides');
		this.textSetting(containerEl, 'Marp Theme Directory', 'Absolute or relative path to a directory passed to Marp CLI --theme-set (optional)', 'marpThemePath', 'e.g. Slides/themes');
		this.textSetting(containerEl, 'Marp Attachment Folder Path', 'Folder where Marp images are stored (relative path)', 'marpAttachmentFolderPath', 'e.g. Slides/attachments');

		// Quartz settings
		this.sectionHeading(containerEl, 'Quartz', 'globe');

		this.textSetting(containerEl, 'Publish Folder Path', 'Path to Publish Folder (relative path from Obsidian Vault root)', 'publishFolderPath', 'Enter Publish Folder Path');
		this.textSetting(containerEl, 'Path to Local Repository of Quartz', 'Path to Quartz (absolute path)', 'quartzPath', 'Enter Quartz Folder Path');
		this.textSetting(containerEl, 'Quartz Site Name', 'Name of the Quartz site', 'quartzSiteName', 'Enter Quartz Site Name');
		this.textSetting(containerEl, 'Github User Name', 'Github user name', 'githubUserName', 'Enter Github User Name');

		// File Organization Rules settings
		this.sectionHeading(containerEl, 'File organization rules', 'folder-tree')
			.setDesc('Configure rules for file organization. You can set display name, tag, folder, prefix, and date inclusion.');

		const rulesContainer = containerEl.createDiv({ cls: 'file-organization-rules' });
		this.displayFileOrganizationRules(rulesContainer);

		new Setting(containerEl)
			.setName('Add New Rule')
			.setDesc('Add an empty rule')
			.addButton(button => button
				.setButtonText('Add')
				.onClick(async () => {
					this.plugin.settings.fileOrganizationRules.push({
						displayName: '',
						tag: '',
						folder: '',
						prefix: '',
						includeDate: false
					});
					await this.plugin.saveSettings();
					this.displayFileOrganizationRules(rulesContainer);
				}));
	}

	private displayFileOrganizationRules(container: HTMLElement) {
		container.empty();

		this.plugin.settings.fileOrganizationRules.forEach((rule, index) => {
			const ruleContainer = container.createDiv({ cls: 'file-organization-rule-row' });

			new Setting(ruleContainer)
				.setName(`Rule ${index + 1}`)
				.addText(text => {
					text.setPlaceholder('Display name')
						.setValue(rule.displayName)
						.onChange(async (value) => {
							rule.displayName = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.style.width = '140px';
					return text;
				})
				.addText(text => {
					text.setPlaceholder('Tag')
						.setValue(rule.tag)
						.onChange(async (value) => {
							rule.tag = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.style.width = '100px';
					return text;
				})
				.addText(text => {
					text.setPlaceholder('Folder')
						.setValue(rule.folder)
						.onChange(async (value) => {
							rule.folder = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.style.width = '80px';
					return text;
				})
				.addText(text => {
					text.setPlaceholder('Prefix')
						.setValue(rule.prefix)
						.onChange(async (value) => {
							rule.prefix = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.style.width = '60px';
					return text;
				})
				.addToggle(toggle => toggle
					.setTooltip('Include date in filename')
					.setValue(rule.includeDate)
					.onChange(async (value) => {
						rule.includeDate = value;
						await this.plugin.saveSettings();
					}))
				.addButton(button => button
					.setButtonText('↑')
					.setTooltip('Move up')
					.onClick(async () => {
						if (index > 0) {
							const temp = this.plugin.settings.fileOrganizationRules[index];
							this.plugin.settings.fileOrganizationRules[index] = this.plugin.settings.fileOrganizationRules[index - 1];
							this.plugin.settings.fileOrganizationRules[index - 1] = temp;
							await this.plugin.saveSettings();
							this.displayFileOrganizationRules(container);
						}
					}))
				.addButton(button => button
					.setButtonText('↓')
					.setTooltip('Move down')
					.onClick(async () => {
						if (index < this.plugin.settings.fileOrganizationRules.length - 1) {
							const temp = this.plugin.settings.fileOrganizationRules[index];
							this.plugin.settings.fileOrganizationRules[index] = this.plugin.settings.fileOrganizationRules[index + 1];
							this.plugin.settings.fileOrganizationRules[index + 1] = temp;
							await this.plugin.saveSettings();
							this.displayFileOrganizationRules(container);
						}
					}))
				.addButton(button => button
					.setButtonText('-')
					.setClass('mod-destructive')
					.setTooltip('Delete rule')
					.onClick(async () => {
						this.plugin.settings.fileOrganizationRules.splice(index, 1);
						await this.plugin.saveSettings();
						this.displayFileOrganizationRules(container);
					}));
		});
	}
} 
