// Auto bullet (Cosense style): whitespace typed at the start of a line turns
// into a "- " list marker. Pure text logic, independent of Obsidian and
// CodeMirror so it can be unit tested.

import type { CrystalPluginSettings } from '../../settings';

export const BULLET = '- ';

export type AutoBulletSettings = Pick<
	CrystalPluginSettings,
	'autoBulletEnabled' | 'autoBulletHalfWidthSpace' | 'autoBulletFullWidthSpace' | 'autoBulletTab'
>;

/** Read-only, 0-based view of a document's lines. */
export interface Lines {
	readonly count: number;
	get(index: number): string;
}

export function linesOf(lines: readonly string[]): Lines {
	return { count: lines.length, get: (index) => lines[index] };
}

/** Whether typing `char` may turn into a bullet with the current settings. */
export function isTriggerEnabled(char: string, settings: AutoBulletSettings): boolean {
	if (!settings.autoBulletEnabled) return false;
	switch (char) {
		case ' ': return settings.autoBulletHalfWidthSpace;
		case '　': return settings.autoBulletFullWidthSpace;
		case '\t': return settings.autoBulletTab;
		default: return false;
	}
}

const HEADING = /^\s*#{1,6}(?:\s|$)/;
const QUOTE_OR_CALLOUT = /^\s*>/;
// "- ", "* ", "+ ", "1. ", "1) " (checkboxes start with one of these too)
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])(?:\s|$)/;
const TABLE_ROW = /^\s*\|/;
const HORIZONTAL_RULE = /^\s*(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/;

/** Lines that already have their own Markdown meaning at the start. */
export function isExcludedLine(line: string): boolean {
	return HEADING.test(line)
		|| QUOTE_OR_CALLOUT.test(line)
		|| LIST_ITEM.test(line)
		|| TABLE_ROW.test(line)
		|| HORIZONTAL_RULE.test(line);
}

/** Index of the line closing the frontmatter, or -1 when there is none. */
function frontmatterEnd(lines: Lines): number {
	if (lines.count === 0 || lines.get(0).trimEnd() !== '---') return -1;
	for (let i = 1; i < lines.count; i++) {
		const line = lines.get(i).trimEnd();
		if (line === '---' || line === '...') return i;
	}
	return -1;
}

interface Fence {
	char: string;
	length: number;
}

const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;

function openingFence(line: string): Fence | null {
	const match = FENCE.exec(line);
	if (!match) return null;
	// A backtick fence's info string can't contain backticks (CommonMark).
	if (match[1][0] === '`' && match[2].includes('`')) return null;
	return { char: match[1][0], length: match[1].length };
}

function closesFence(line: string, fence: Fence): boolean {
	const match = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
	return !!match && match[1][0] === fence.char && match[1].length >= fence.length;
}

function startsMath(line: string): boolean {
	return line.trimStart().startsWith('$$');
}

/** `$$ ... $$` (anything may follow the closing `$$`) opens and closes on one line. */
function isOneLineMath(line: string): boolean {
	const trimmed = line.trim();
	return trimmed.startsWith('$$') && trimmed.indexOf('$$', 2) !== -1;
}

/**
 * Whether line `lineNo` belongs to frontmatter, a fenced code block or a
 * `$$` math block (fence and `$$` lines included).
 */
export function isInExcludedBlock(lines: Lines, lineNo: number): boolean {
	const fmEnd = frontmatterEnd(lines);
	if (lineNo <= fmEnd) return true;

	let fence: Fence | null = null;
	let inMath = false;
	for (let i = fmEnd + 1; i < lineNo; i++) {
		const line = lines.get(i);
		if (fence) {
			if (closesFence(line, fence)) fence = null;
		} else if (inMath) {
			if (line.includes('$$')) inMath = false;
		} else {
			fence = openingFence(line);
			if (!fence && startsMath(line) && !isOneLineMath(line)) inMath = true;
		}
	}

	const current = lines.get(lineNo);
	return fence !== null || inMath || openingFence(current) !== null || startsMath(current);
}

/**
 * Typing `char` at column `ch` of line `lineNo` (in the document before the
 * keystroke): returns the column range to replace with `BULLET`, or null when
 * auto bullet must not fire. The typed character itself is dropped, and the
 * cursor goes right after the bullet.
 */
export function autoBulletRange(
	lines: Lines,
	lineNo: number,
	ch: number,
	char: string,
	settings: AutoBulletSettings
): { from: number; to: number } | null {
	if (!isTriggerEnabled(char, settings)) return null;
	const line = lines.get(lineNo);
	const before = line.slice(0, ch);
	if (before.trim() !== '') return null;
	if (isExcludedLine(before + char + line.slice(ch))) return null;
	if (isInExcludedBlock(lines, lineNo)) return null;
	return { from: 0, to: ch };
}

/**
 * Column for "Move cursor after list marker": after `- ` (or after a
 * checkbox `- [ ] `), after `1. `, otherwise the start of the line.
 */
export function bulletCursorTarget(line: string): number {
	const bullet = /^([ \t　]*)- (\[[^\]]\] )?/.exec(line);
	if (bullet) return bullet[0].length;
	const numbered = /^(\s*)(\d+\.\s)/.exec(line);
	if (numbered) return numbered[0].length;
	return 0;
}
