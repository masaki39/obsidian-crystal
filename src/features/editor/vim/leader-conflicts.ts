import type { VimLeaderMapping } from '../../../settings';
import { DEFAULT_LEADER_MAPPINGS, isPrefixConflict, normalizeLeaderKeys, parseKeys, VIM_NOP } from './leader-keymap';

export type LeaderConflict =
	/** Keys or command not set yet: the row is ignored. */
	| { kind: 'incomplete'; index: number }
	/** Clashes with an earlier own mapping, which it replaces. */
	| { kind: 'custom'; index: number; keys: string; otherIndex: number; otherKeys: string }
	/** Replaces a default mapping (expected, but worth knowing). */
	| { kind: 'default'; index: number; keys: string; otherKeys: string; otherCommandId: string };

interface Active {
	/** Row of the user's mapping, or null for a default. */
	index: number | null;
	keys: string;
	commandId: string;
	tokens: string[];
}

/**
 * What the settings page reports for the user's own leader mappings, walked
 * exactly as `resolveLeaderMappings` applies them: each row removes every
 * mapping still in effect (own or default) it clashes with, and a `<Nop>` row
 * removes without adding itself.
 */
export function findLeaderConflicts(useDefaults: boolean, custom: VimLeaderMapping[]): LeaderConflict[] {
	const conflicts: LeaderConflict[] = [];
	let active: Active[] = (useDefaults ? DEFAULT_LEADER_MAPPINGS : [])
		.map(m => ({ index: null, keys: m.keys, commandId: m.commandId, tokens: parseKeys(m.keys) }));
	custom.forEach((mapping, index) => {
		const keys = normalizeLeaderKeys(mapping.keys);
		const commandId = mapping.commandId.trim();
		if (!keys || !commandId) {
			conflicts.push({ kind: 'incomplete', index });
			return;
		}
		const tokens = parseKeys(keys);
		const isNop = commandId === VIM_NOP;
		active = active.filter(other => {
			if (!isPrefixConflict(other.tokens, tokens)) return true;
			if (other.index !== null) {
				conflicts.push({ kind: 'custom', index, keys, otherIndex: other.index, otherKeys: other.keys });
			} else if (!isNop) {
				// `<Nop>` over a default is the documented way to turn it off, not a clash.
				conflicts.push({ kind: 'default', index, keys, otherKeys: other.keys, otherCommandId: other.commandId });
			}
			return false;
		});
		if (!isNop) active.push({ index, keys, commandId, tokens });
	});
	return conflicts;
}
