import { normalizePath } from 'obsidian';
import type { CrystalPluginSettings } from '../../settings';

/**
 * 設定済みのテーマディレクトリからMarp CLIの --theme-set オプションを生成
 */
export function getThemeSetOption(settings: CrystalPluginSettings): string {
	const normalizedThemePath = normalizeSettingPath(settings.marpThemePath);
	if (!normalizedThemePath) {
		return '';
	}

	return ` --theme-set "${normalizedThemePath}"`;
}

/**
 * 設定に保存されたパス（相対/絶対）を正規化して返す
 */
export function normalizeSettingPath(settingPath?: string): string | null {
	const trimmed = settingPath?.trim();
	return trimmed ? normalizePath(trimmed) : null;
}
