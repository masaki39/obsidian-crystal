import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { sectionHeading, textSetting, toggleSetting } from '../components';

export function renderMarpSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	sectionHeading(containerEl, 'Marp', 'presentation');

	textSetting(containerEl, plugin, 'Marp Slide Folder Path (relative path)', 'Folder where slide files are organized', 'marpSlideFolderPath', 'e.g. Slides');
	textSetting(containerEl, plugin, 'Marp Theme Directory', 'Absolute or relative path to a directory passed to Marp CLI --theme-set (optional)', 'marpThemePath', 'e.g. Slides/themes');
	textSetting(containerEl, plugin, 'Marp Attachment Folder Path', 'Folder where Marp images are stored (relative path)', 'marpAttachmentFolderPath', 'e.g. Slides/attachments');
	toggleSetting(containerEl, plugin, 'Show slide toolbar', 'Float Marp buttons in the editor while a file in the slide folder is open', 'marpShowSlideToolbar');
	toggleSetting(containerEl, plugin, 'Move preview slide to cursor', 'Follow the editor cursor in the Marp server preview (requires the Web viewer core plugin)', 'marpSyncCursorToServer');
	toggleSetting(containerEl, plugin, 'Move cursor to preview slide', 'Follow the Marp server preview slide with the editor cursor (requires the Web viewer core plugin)', 'marpSyncSlideToCursor');
}
