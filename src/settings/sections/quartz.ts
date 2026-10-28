import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { sectionHeading, textSetting } from '../components';

export function renderQuartzSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'Quartz', 'globe');

	textSetting(containerEl, plugin, 'Publish Folder Path', 'Path to Publish Folder (relative path from Obsidian Vault root)', 'publishFolderPath', 'Enter Publish Folder Path');
	textSetting(containerEl, plugin, 'Path to Local Repository of Quartz', 'Path to Quartz (absolute path)', 'quartzPath', 'Enter Quartz Folder Path');
	textSetting(containerEl, plugin, 'Quartz Site Name', 'Name of the Quartz site', 'quartzSiteName', 'Enter Quartz Site Name');
	textSetting(containerEl, plugin, 'Github User Name', 'Github user name', 'githubUserName', 'Enter Github User Name');
}
