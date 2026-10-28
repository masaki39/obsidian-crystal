import { App, Plugin, TFile } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';
import { resolveDraftPath } from './draft';
import { getDailyNoteFilePath } from './paths';
import { transformBeforeTimeline } from './timeline';
const moment = require('moment');

/**
 * Link notes created today from today's daily note (and unlink them on
 * delete). The setting is read once at load, as before.
 */
export function registerDailyNoteAutoLink(app: App, plugin: Plugin, getSettings: () => CrystalPluginSettings) {
	if (getSettings().dailyNoteAutoLink) {
		app.workspace.onLayoutReady(() => { //ロード完了後に実行
			plugin.registerEvent(app.vault.on('create', file => {
				if (!(file instanceof TFile) || file.extension !== 'md') {
					return;
				}
				const todayNotePath = getDailyNoteFilePath(new Date());
				// Skip when the created file is today's note itself (avoids a self-link).
				if (todayNotePath && file.path === todayNotePath) {
					return;
				}
				// The draft note is scratch space, not a note worth linking.
				if (file.path === resolveDraftPath(getSettings().dailyNoteDraftPath)) {
					return;
				}
				const todayNote = todayNotePath ? app.vault.getAbstractFileByPath(todayNotePath) : null;
				if (!todayNote) {
					return;
				}
				const timeStamp = moment(new Date()).format('HH:mm');
				const fileLink = `[[${file.name.replace(/\.md$/, '')}]]`;
				const line = `- ${timeStamp} ${fileLink}`;
				app.vault.process(todayNote as TFile, (content) => {
				const heading = getSettings().dailyNoteTimelineHeading || '# Time Line';
				return transformBeforeTimeline(content, heading, (before) => {
					const beforeTrimmed = before.trimEnd();
					return getSettings().dailyNoteNewestFirst
						? (beforeTrimmed.length > 0 ? `${line}\n${beforeTrimmed}` : line)
						: (beforeTrimmed.length > 0 ? `${beforeTrimmed}\n${line}` : line);
				});
			});
			}));

			plugin.registerEvent(app.vault.on('delete', file => {
				if (!(file instanceof TFile) || file.extension !== 'md') {
					return;
				}
				const todayNotePath = getDailyNoteFilePath(new Date());
				const todayNote = todayNotePath ? app.vault.getAbstractFileByPath(todayNotePath) : null;
				if (!todayNote) {
					return;
				}
				const fileLink = `[[${file.name.replace(/\.md$/, '')}]]`;
				// 正規表現の特殊文字をエスケープ
				const escapedFileLink = fileLink.replace(/[[\](){}.*+?^$|\\]/g, '\\$&');
				app.vault.process(todayNote as TFile, (content) => {
					const heading = getSettings().dailyNoteTimelineHeading || '# Time Line';
					// 行全体をマッチして削除（改行も含む）
					const regex = new RegExp(`^- \\d{2}:\\d{2} ${escapedFileLink}$`, 'gm');
					return transformBeforeTimeline(content, heading, (before) => before.replace(regex, '').replace(/\n\n+/g, '\n').trimEnd());
				});
			}));
		});
	}
}
