import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addVerifyButton, secretSetting, sectionHeading, textSetting, toggleSetting } from '../components';
import { verifyBlueskyCredentials } from '../verifiers';

export function renderBlueskySection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'Bluesky', 'cloud');

	secretSetting(containerEl, plugin, 'Bluesky Handle/Email', 'Your Bluesky handle (e.g., user.bsky.social) or email address', 'Enter your Bluesky handle or email', 'blueskyIdentifier');

	addVerifyButton(
		secretSetting(containerEl, plugin, 'Bluesky App Password', 'Your Bluesky app password (create one in Bluesky Settings > App Passwords)', 'Enter your Bluesky app password', 'blueskyPassword'),
		() => verifyBlueskyCredentials(plugin.settings.blueskyIdentifier, plugin.settings.blueskyPassword)
	);

	toggleSetting(containerEl, plugin, 'Append Bluesky posts to Daily Note timeline', 'Add each post to today\'s daily note timeline section', 'blueskyAppendToDailyNote');
	textSetting(containerEl, plugin, 'Daily Note timeline heading', 'Heading text that marks the timeline section (exact match)', 'dailyNoteTimelineHeading', '# Time Line');
}
