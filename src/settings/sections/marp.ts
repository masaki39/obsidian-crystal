import type { App } from 'obsidian';
import type { CrystalPluginHost } from '../../types';
import { addSetting, settingGroup, textSetting, toggleSetting } from '../components';

export function renderMarpSection(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const general = settingGroup(containerEl);
	textSetting(general, plugin, 'Slide folder', 'Folder where slide files are organized (relative to the vault root).', 'marpSlideFolderPath', 'e.g. Slides');
	textSetting(general, plugin, 'Theme directory', 'Absolute or relative path to a directory passed to Marp CLI --theme-set (optional).', 'marpThemePath', 'e.g. Slides/themes');
	textSetting(general, plugin, 'Attachment folder', 'Folder where Marp images are stored (relative to the vault root).', 'marpAttachmentFolderPath', 'e.g. Slides/attachments');

	const preview = settingGroup(containerEl, 'Editor and preview');
	toggleSetting(preview, plugin, 'Show slide toolbar', 'Float Marp buttons in the editor while a file in the slide folder is open.', 'marpShowSlideToolbar');
	toggleSetting(preview, plugin, 'Move preview slide to cursor', 'Follow the editor cursor in the Marp server preview (requires the Web viewer core plugin).', 'marpSyncCursorToServer');
	toggleSetting(preview, plugin, 'Move cursor to preview slide', 'Follow the Marp server preview slide with the editor cursor (requires the Web viewer core plugin).', 'marpSyncSlideToCursor');

	const newSlide = settingGroup(containerEl, 'New slide from note');
	textSetting(newSlide, plugin, 'File name prefix', 'Text placed at the start of the new slide file name.', 'marpNewSlidePrefix', 'e.g. Slide-');
	textSetting(newSlide, plugin, 'Date format', 'moment.js format for the date in the file name. Leave empty to omit the date.', 'marpNewSlideDateFormat', 'YYYY-MM-DD');
	textSetting(newSlide, plugin, 'Separator', 'Text between the date and the title.', 'marpNewSlideSeparator', ' ');
	addSetting(newSlide, setting => setting
		.setName('Title source')
		.setDesc('Parent note title used in the file name, title slide and header. Alias falls back to the file name when none is set.')
		.addDropdown(dropdown => dropdown
			.addOption('basename', 'File name')
			.addOption('alias', 'First alias')
			.setValue(plugin.settings.marpNewSlideTitleSource)
			.onChange(async (value) => {
				plugin.settings.marpNewSlideTitleSource = value as 'basename' | 'alias';
				await plugin.saveSettings();
			})));
	textSetting(newSlide, plugin, 'Theme', 'Default theme property. Leave empty to omit it.', 'marpNewSlideTheme', 'e.g. default');
	toggleSetting(newSlide, plugin, 'Paginate', 'Add paginate: true to the new slide.', 'marpNewSlidePaginate');
	textSetting(newSlide, plugin, 'Header', 'Default header property. Use {{title}} for the parent title, {{date}} for the date format above, or {{date:YYYY/MM/DD}} for a custom format. Leave empty to omit it.', 'marpNewSlideHeader', 'e.g. {{title}} | {{date}}');
	textSetting(newSlide, plugin, 'Parent note property', 'Property on the current note that receives the slide link. Leave empty to skip.', 'marpNewSlideParentProperty', 'slide');
	textSetting(newSlide, plugin, 'Slide property', 'Property on the new slide that receives the parent link. Leave empty to skip.', 'marpNewSlideChildProperty', 'parents');
}
