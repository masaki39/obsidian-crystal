import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { settingGroup, textSetting } from '../components';

export function renderQuartzSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const group = settingGroup(containerEl);

	textSetting(group, plugin, 'Quartz repository path', 'Absolute path to your local Quartz repository.', 'quartzPath', 'e.g. /Users/me/quartz');
	textSetting(group, plugin, 'Site name', 'Name of the Quartz site.', 'quartzSiteName', 'e.g. my-garden');
	textSetting(group, plugin, 'GitHub user name', 'GitHub user that hosts the site.', 'githubUserName', 'e.g. octocat');
}
