import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface FileOrganizationRule {
	displayName: string;
	tag: string;
	folder: string;
	prefix: string;
	includeDate: boolean;
}

export interface CrystalPluginSettings {
	exportFolderPath: string;
	GeminiAPIKey: string;
	GeminiModel: string;
	blueskyIdentifier: string;
	blueskyPassword: string;
	dailyNotesFolder: string;
	dailyNoteDateFormat: string;
	dailyNoteAutoSort: boolean;
	dailyNoteAutoLink: boolean;
	todoFileName: string;
	inboxName: string;
	webpQuality: number;
	imageResizeScale: number;
	imageMaxSize: number;
	autoWebpPaste: boolean;
	pcloudUsername: string;
	pcloudPassword: string;
	pcloudPublicFolderId: string;
	marpSlideFolderPath: string;
	marpThemePath: string;
	marpAttachmentFolderPath: string;
	publishFolderPath: string;
	quartzPath: string;
	quartzSiteName: string;
	githubUserName: string;
	shortcutNames: string;
	fileOrganizationRules: FileOrganizationRule[];
}

export const DEFAULT_SETTINGS: CrystalPluginSettings = {
	exportFolderPath: '',
	GeminiAPIKey: '',
	GeminiModel: 'gemini-flash-latest',
	blueskyIdentifier: '',
	blueskyPassword: '',
	dailyNotesFolder: 'DailyNotes',
	dailyNoteDateFormat: 'YYYY-MM-DD',
	dailyNoteAutoSort: true,
	dailyNoteAutoLink: true,
	todoFileName: 'ToDo',
	inboxName: 'Inbox',
	webpQuality: 0.85,
	imageResizeScale: 0.8,
	imageMaxSize: 700,
	autoWebpPaste: true,
	pcloudUsername: '',
	pcloudPassword: '',
	pcloudPublicFolderId: '',
	marpSlideFolderPath: '',
	marpThemePath: '',
	marpAttachmentFolderPath: '',
	publishFolderPath: 'Publish',
	quartzPath: '',
	quartzSiteName: '',
	githubUserName: '',
	shortcutNames: '',
	fileOrganizationRules: []
}

export class CrystalSettingTab extends PluginSettingTab {
	plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> };

	constructor(app: App, plugin: Plugin & { settings: CrystalPluginSettings; saveSettings(): Promise<void> }) {
		super(app, plugin);
		this.plugin = plugin;
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
	
	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', { text: 'Crystal Plugin Settings' });

		// General settings
		containerEl.createEl('h3', { text: 'General Settings' });

		this.textSetting(containerEl, 'Export Folder Path', 'Folder where this plugin exports files (used by PDF and Marp features)', 'exportFolderPath', 'Enter Export Folder Path');

		// Gemini settings
		containerEl.createEl('h3', { text: 'Gemini Editor Commands' });

		new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Enter your Gemini API Key')
			.addText(text => {
				text.setPlaceholder('Enter your Gemini API Key')
					.setValue(this.plugin.settings.GeminiAPIKey)
					.onChange(async (value) => {
						this.plugin.settings.GeminiAPIKey = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
				return text;
			});

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
				.addOption('gemma-3-27b-it', 'gemma-3-27b-it')
				.addOption('gemma-3-12b-it', 'gemma-3-12b-it')
				.addOption('gemma-3-4b-it', 'gemma-3-4b-it')
				.addOption('gemma-3-1b-it', 'gemma-3-1b-it')
				.addOption('gemma-3n-e4b-it', 'gemma-3n-e4b-it')
				.addOption('gemma-3n-e2b-it', 'gemma-3n-e2b-it')
				.setValue(this.plugin.settings.GeminiModel)
				.onChange(async (value) => {
					this.plugin.settings.GeminiModel = value;
					await this.plugin.saveSettings();
				}));

		// Bluesky settings
		containerEl.createEl('h3', { text: 'Bluesky' });

		new Setting(containerEl)
			.setName('Bluesky Handle/Email')
			.setDesc('Your Bluesky handle (e.g., user.bsky.social) or email address')
			.addText(text => text
				.setPlaceholder('Enter your Bluesky handle or email')
				.setValue(this.plugin.settings.blueskyIdentifier)
				.onChange(async (value) => {
					this.plugin.settings.blueskyIdentifier = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Bluesky App Password')
			.setDesc('Your Bluesky app password (create one in Bluesky Settings > App Passwords)')
			.addText(text => {
				text.setPlaceholder('Enter your Bluesky app password')
					.setValue(this.plugin.settings.blueskyPassword)
					.onChange(async (value) => {
						this.plugin.settings.blueskyPassword = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
				return text;
			});

		// Daily notes settings
		containerEl.createEl('h3', { text: 'Daily Notes' });

		this.textSetting(containerEl, 'Daily Notes Folder', 'Folder where daily notes are stored', 'dailyNotesFolder', 'Enter Folder Path');
		this.textSetting(containerEl, 'Date Format', 'Date format for daily note file names (e.g., YYYY-MM-DD)', 'dailyNoteDateFormat', 'YYYY-MM-DD');
		this.toggleSetting(containerEl, 'Auto Sort Tasks', 'Sort tasks in daily notes automatically', 'dailyNoteAutoSort');
		this.toggleSetting(containerEl, 'Auto Link Notes', 'Add link to today\'s daily note when create any note', 'dailyNoteAutoLink');

		// quick add settings
		containerEl.createEl('h3', { text: 'Quick Add' });

		this.textSetting(containerEl, 'ToDo File Name', 'File name for ToDo list (relative path from Obsidian Vault root)', 'todoFileName', 'Enter ToDo File Name');
		this.textSetting(containerEl, 'Inbox Name', 'Name of the Inbox list', 'inboxName', 'Enter Inbox Name');

		// Image settings
		containerEl.createEl('h3', { text: 'Image Procesor' });

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

		// pCloud settings
		containerEl.createEl('h4', { text: 'pCloud Uploader' });

		this.textSetting(containerEl, 'pCloud Username', 'Your pCloud username (email)', 'pcloudUsername', 'Enter pCloud Username');

		new Setting(containerEl)
			.setName('pCloud Password')
			.setDesc('Your pCloud password')
			.addText(text => {
				text.setPlaceholder('Enter pCloud Password')
					.setValue(this.plugin.settings.pcloudPassword)
					.onChange(async (value) => {
						this.plugin.settings.pcloudPassword = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
				return text;
			});

		new Setting(containerEl)
			.setName('pCloud Public Folder ID')
			.setDesc('Your pCloud Public Folder unique ID (found in Public Folder links)')
			.addText(text => {
				text.setPlaceholder('e.g., lF97wFVWosQpHEoDAbvva0h')
					.setValue(this.plugin.settings.pcloudPublicFolderId)
					.onChange(async (value) => {
						this.plugin.settings.pcloudPublicFolderId = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
				return text;
			});

		// Marp settings
		containerEl.createEl('h3', { text: 'Marp' });

		this.textSetting(containerEl, 'Marp Slide Folder Path (relative path)', 'Folder where slide files are organized', 'marpSlideFolderPath', 'e.g. Slides');
		this.textSetting(containerEl, 'Marp Theme Directory', 'Absolute or relative path to a directory passed to Marp CLI --theme-set (optional)', 'marpThemePath', 'e.g. Slides/themes');
		this.textSetting(containerEl, 'Marp Attachment Folder Path', 'Folder where Marp images are stored (relative path)', 'marpAttachmentFolderPath', 'e.g. Slides/attachments');

		// Quartz settings
		containerEl.createEl('h3', { text: 'Quartz' });

		this.textSetting(containerEl, 'Publish Folder Path', 'Path to Publish Folder (relative path from Obsidian Vault root)', 'publishFolderPath', 'Enter Publish Folder Path');
		this.textSetting(containerEl, 'Quartz Path', 'Path to Quartz (absolute path)', 'quartzPath', 'Enter Quartz Folder Path');
		this.textSetting(containerEl, 'Quartz Site Name', 'Name of the Quartz site', 'quartzSiteName', 'Enter Quartz Site Name');
		this.textSetting(containerEl, 'Github User Name', 'Github user name', 'githubUserName', 'Enter Github User Name');

		// Shortcut settings
		containerEl.createEl('h3', { text: 'Shortcuts' });

		new Setting(containerEl)
			.setName('Shortcut Names')
			.setDesc('Names of the shortcuts (one per line). Restart Obsidian to apply changes.')
			.addTextArea(textarea => textarea
				.setPlaceholder('Enter Shortcut Names (one per line)')
				.setValue(this.plugin.settings.shortcutNames)
				.onChange(async (value) => {
					this.plugin.settings.shortcutNames = value;
					await this.plugin.saveSettings();
				}));

		// File Organization Rules settings
		containerEl.createEl('h3', { text: 'File Organization Rules' });
		containerEl.createEl('p', { text: 'Configure rules for file organization. You can set display name, tag, folder, prefix, and date inclusion.' });

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
