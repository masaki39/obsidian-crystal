import type { VimLeaderMapping } from '../../../settings';

/** Command id that disables a key (and, as a prefix, every default under it). */
export const VIM_NOP = '<Nop>';

const C = (id: string) => `obsidian-crystal:${id}`;

/**
 * Names for the first key after Space. The groups people reach for most
 * (AI, send, daily, file, Gyazo) sit on the home row.
 */
export const DEFAULT_LEADER_GROUPS: Record<string, string> = {
	a: 'AI',
	s: 'Send (Bluesky)',
	d: 'Daily',
	f: 'File',
	g: 'Gyazo / images',
	e: 'Edit',
	m: 'Marp',
	'mx': 'Export',
	p: 'Property link',
	q: 'Quartz',
	w: 'Window',
};

/**
 * Default Space-leader keymap for Crystal's commands. Vim habits carry over:
 * h/l = previous/next, j/k = down/up, J/K = move, y = yank (copy),
 * p = put, q = quit, a doubled key = the most common action of its group.
 */
export const DEFAULT_LEADER_MAPPINGS: readonly VimLeaderMapping[] = [
	// Daily
	{ keys: 'dd', commandId: C('crystal-open-today') },
	{ keys: 'dh', commandId: C('crystal-open-yesterday') },
	{ keys: 'dl', commandId: C('crystal-open-tomorrow') },
	{ keys: 'da', commandId: C('crystal-add-task-to-daily-note') },
	{ keys: 'dr', commandId: C('crystal-roll-over-tasks') },
	{ keys: 'df', commandId: C('crystal-open-daily-draft') },
	{ keys: 'dp', commandId: C('crystal-post-daily-draft') },
	{ keys: 'ds', commandId: C('crystal-post-daily-draft-to-bluesky') },
	// Send (Bluesky)
	{ keys: 'ss', commandId: C('crystal-post-to-bluesky') },
	{ keys: 'sd', commandId: C('crystal-post-to-daily-note') },
	// AI
	{ keys: 'aa', commandId: C('crystal-gemini-rewrite-append') },
	{ keys: 'ar', commandId: C('crystal-gemini-rewrite-replace') },
	{ keys: 'at', commandId: C('crystal-translate-selected-text') },
	{ keys: 'ak', commandId: C('crystal-translate-above-cursor-text') },
	{ keys: 'aj', commandId: C('crystal-translate-below-cursor-text') },
	{ keys: 'ag', commandId: C('crystal-grammar-check-current-line') },
	{ keys: 'ad', commandId: C('crystal-generate-description') },
	{ keys: 'ac', commandId: C('crystal-generate-git-commit-summary') },
	// File
	{ keys: 'fn', commandId: C('crystal-create-timestamp-file') },
	{ keys: 'fl', commandId: C('crystal-create-linked-timestamp-file') },
	{ keys: 'fy', commandId: C('crystal-copy-file-link') },
	{ keys: 'fY', commandId: C('crystal-copy-file-link-with-alias') },
	{ keys: 'fo', commandId: C('crystal-organize-file-with-tags') },
	{ keys: 'fr', commandId: C('crystal-convert-links-to-relative-paths') },
	{ keys: 'fb', commandId: C('crystal-convert-active-file-to-bullet-list') },
	// Gyazo / images
	{ keys: 'gg', commandId: C('crystal-upload-clipboard-image') },
	{ keys: 'gf', commandId: C('crystal-upload-file-image') },
	{ keys: 'gr', commandId: C('crystal-replace-image-urls-with-gyazo') },
	{ keys: 'gl', commandId: C('crystal-replace-local-images-with-gyazo') },
	// (The id's missing "m" is the released, stable id.)
	{ keys: 'gp', commandId: C('crystal-paste-multiple-images-from-filesyste') },
	// Edit
	{ keys: 'ej', commandId: C('crystal-wrap-subscript') },
	{ keys: 'ek', commandId: C('crystal-wrap-superscript') },
	{ keys: 'e>', commandId: C('crystal-increase-blockquote') },
	{ keys: 'eo', commandId: C('crystal-insert-ogp-link-horizontal') },
	{ keys: 'eO', commandId: C('crystal-insert-ogp-link-vertical') },
	// Marp
	{ keys: 'mj', commandId: C('crystal-marp-next-slide') },
	{ keys: 'mk', commandId: C('crystal-marp-previous-slide') },
	{ keys: 'mJ', commandId: C('crystal-marp-move-slide-down') },
	{ keys: 'mK', commandId: C('crystal-marp-move-slide-up') },
	{ keys: 'mc', commandId: C('crystal-marp-create-slide-from-note') },
	{ keys: 'mp', commandId: C('crystal-preview-marp-slide') },
	{ keys: 'ms', commandId: C('crystal-marp-server') },
	{ keys: 'mq', commandId: C('crystal-stop-marp-server') },
	{ keys: 'mi', commandId: C('crystal-move-images-to-marp-folder') },
	{ keys: 'mI', commandId: C('crystal-move-images-and-convert-links') },
	{ keys: 'mxd', commandId: C('crystal-export-marp-slide-pdf') },
	{ keys: 'mxp', commandId: C('crystal-export-marp-slide') },
	{ keys: 'mxe', commandId: C('crystal-export-marp-slide-editable') },
	{ keys: 'mxh', commandId: C('crystal-export-marp-slide-html') },
	{ keys: 'mxf', commandId: C('crystal-export-marp-slide-html-folder') },
	{ keys: 'mxn', commandId: C('crystal-export-marp-notes') },
	// Property link
	{ keys: 'pp', commandId: C('crystal-property-link-sync-current-note') },
	{ keys: 'pa', commandId: C('crystal-property-link-sync-vault') },
	// Quartz
	{ keys: 'qq', commandId: C('crystal-quartz-sync-and-open-site') },
	{ keys: 'qs', commandId: C('crystal-quartz-sync') },
	{ keys: 'qo', commandId: C('crystal-quartz-open-site') },
	// Window (like <C-w>h / <C-w>l)
	{ keys: 'wh', commandId: C('crystal-focus-left') },
	{ keys: 'wl', commandId: C('crystal-focus-right') },
	{ keys: 'wo', commandId: C('crystal-toggle-window-opacity') },
	{ keys: 'wg', commandId: C('crystal-open-gamification-view') },
	{ keys: 'wm', commandId: C('crystal-hacker-mode-toggle') },
];

/** Splits key notation into keys: `dd` → [d, d], `a<Space>b` → [a, <Space>, b]. */
export function parseKeys(keys: string): string[] {
	return keys.match(/<[^<>]+>|./g) ?? [];
}

/** Vim's names for special keys, by lower case, as `vimKeyFromEvent` spells them. */
const KEY_NAMES: Record<string, string> = {
	space: 'Space', cr: 'CR', enter: 'CR', return: 'CR', tab: 'Tab', bs: 'BS', backspace: 'BS',
	del: 'Del', delete: 'Del', esc: 'Esc', escape: 'Esc', left: 'Left', right: 'Right', up: 'Up',
	down: 'Down', home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown',
};

/** `<space>` → `<Space>`, `<c-x>` → `<C-x>`, `<lt>` → `<`, so any casing matches the keys pressed. */
function normalizeKeyToken(token: string): string {
	if (token.length < 3 || !token.startsWith('<') || !token.endsWith('>')) return token;
	const parts = token.slice(1, -1).split('-');
	const base = parts.pop() ?? '';
	const mods = parts.map(mod => mod.toUpperCase());
	if (mods.length === 0 && base.toLowerCase() === 'lt') return '<';
	const name = KEY_NAMES[base.toLowerCase()] ?? base;
	return `<${[...mods, name].join('-')}>`;
}

/**
 * Normalizes the keys typed after the leader: an optional leading `<leader>`
 * is dropped, spaces become `<Space>`, and `<...>` names get Vim's casing.
 * Returns '' when nothing is left.
 */
export function normalizeLeaderKeys(keys: string): string {
	const raw = keys.trim().replace(/^<leader>/i, '').trim().replace(/ /g, '<Space>');
	return parseKeys(raw).map(normalizeKeyToken).join('');
}

/** Human-readable keys, e.g. `dd` → `Space d d`. */
export function formatLeaderKeys(keys: string): string {
	return ['Space', ...parseKeys(normalizeLeaderKeys(keys))].map(key => key === '<Space>' ? 'Space' : key).join(' ');
}

const isPrefixConflict = (a: string[], b: string[]) => {
	const n = Math.min(a.length, b.length);
	return a.slice(0, n).join('\u0000') === b.slice(0, n).join('\u0000');
};

/**
 * The mappings in effect: the defaults (when enabled) overridden by the
 * user's own. A user mapping replaces every default it clashes with (same
 * keys, or one being a prefix of the other), so `d → <Nop>` turns off the
 * whole Daily group and `d → command` makes Space d run that command.
 * Incomplete rows (no keys or no command) are ignored.
 */
export function resolveLeaderMappings(useDefaults: boolean, custom: VimLeaderMapping[]): VimLeaderMapping[] {
	let result: Array<VimLeaderMapping & { tokens: string[] }> = (useDefaults ? DEFAULT_LEADER_MAPPINGS : [])
		.map(mapping => ({ ...mapping, tokens: parseKeys(mapping.keys) }));
	for (const mapping of custom) {
		const keys = normalizeLeaderKeys(mapping.keys);
		const commandId = mapping.commandId.trim();
		if (!keys || !commandId) continue;
		const tokens = parseKeys(keys);
		result = result.filter(existing => !isPrefixConflict(existing.tokens, tokens));
		if (commandId !== VIM_NOP) result.push({ keys, commandId, tokens });
	}
	return result.map(({ keys, commandId }) => ({ keys, commandId }));
}

/** A node of the leader key tree: a command (leaf) or more keys to come. */
export interface LeaderNode {
	commandId?: string;
	children: Map<string, LeaderNode>;
}

export function buildLeaderTree(mappings: VimLeaderMapping[]): LeaderNode {
	const root: LeaderNode = { children: new Map() };
	for (const { keys, commandId } of mappings) {
		let node = root;
		for (const key of parseKeys(keys)) {
			let child = node.children.get(key);
			if (!child) {
				child = { children: new Map() };
				node.children.set(key, child);
			}
			node = child;
		}
		node.commandId = commandId;
	}
	return root;
}

/** Every command id under a node, for naming groups the user made up. */
export function commandIdsUnder(node: LeaderNode): string[] {
	const ids = node.commandId ? [node.commandId] : [];
	node.children.forEach(child => ids.push(...commandIdsUnder(child)));
	return ids;
}

const SPECIAL_KEYS: Record<string, string> = {
	' ': '<Space>', Enter: '<CR>', Tab: '<Tab>', Backspace: '<BS>', Delete: '<Del>',
	ArrowLeft: '<Left>', ArrowRight: '<Right>', ArrowUp: '<Up>', ArrowDown: '<Down>',
	Home: '<Home>', End: '<End>', PageUp: '<PageUp>', PageDown: '<PageDown>',
};
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph', 'Dead', 'Unidentified']);

type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>;

/**
 * Vim key notation for a keydown (`d`, `D`, `>`, `<CR>`, `<C-x>`), or null
 * for a lone modifier. With a Japanese IME on (`Process`) or a non-ASCII
 * layout, the physical key is used instead, so Space d d still works.
 */
export function vimKeyFromEvent(event: KeyLike): string | null {
	let key = event.key;
	if (MODIFIER_KEYS.has(key)) return null;
	if (key === 'Process' || (key.length === 1 && key.charCodeAt(0) > 127)) {
		const letter = /^Key([A-Z])$/.exec(event.code);
		const digit = /^Digit([0-9])$/.exec(event.code);
		if (letter) key = event.shiftKey ? letter[1] : letter[1].toLowerCase();
		else if (digit) key = digit[1];
		else if (event.code === 'Space') key = ' ';
		else return null;
	}
	const special = SPECIAL_KEYS[key];
	const base = special ? special.slice(1, -1) : key;
	let mods = '';
	if (event.ctrlKey) mods += 'C-';
	if (event.altKey) mods += 'A-';
	if (event.metaKey) mods += 'M-';
	if (mods || special) {
		// Shift is already in the character for printable keys (`D`, `>`).
		if (event.shiftKey && (special || base.length > 1)) mods += 'S-';
		return `<${mods}${base}>`;
	}
	return base.length === 1 ? base : `<${base}>`;
}
