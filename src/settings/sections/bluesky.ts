import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addVerifyButton, secretSetting, settingGroup, textSetting, toggleSetting } from '../components';
import { verifyBlueskyCredentials } from '../verifiers';

export function renderBlueskySection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const account = settingGroup(containerEl);

	secretSetting(account, plugin, 'Handle or email', 'Your Bluesky handle (e.g. user.bsky.social) or email address.', 'user.bsky.social', 'blueskyIdentifier');

	addVerifyButton(
		secretSetting(account, plugin, 'App password', 'A Bluesky app password (create one in Bluesky under Settings → Privacy and security → App passwords).', 'xxxx-xxxx-xxxx-xxxx', 'blueskyPassword'),
		() => verifyBlueskyCredentials(plugin.settings.blueskyIdentifier, plugin.settings.blueskyPassword)
	);

	const dailyNote = settingGroup(containerEl, 'Daily note');
	toggleSetting(dailyNote, plugin, 'Append posts to daily note timeline', 'Add each post to today\'s daily note timeline section.', 'blueskyAppendToDailyNote');
	textSetting(dailyNote, plugin, 'Timeline heading', 'Heading text that marks the timeline section (exact match).', 'dailyNoteTimelineHeading', '# Time Line');
}
