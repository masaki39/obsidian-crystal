import type { VimLeaderMapping } from '../../../settings';
import { DEFAULT_LEADER_MAPPINGS, isPrefixConflict, normalizeLeaderKeys, parseKeys, VIM_NOP } from './leader-keymap';

export type LeaderConflict =
	/** Keys or command not set yet: the row is ignored. */
	| { kind: 'incomplete'; index: number }
	/** Clashes with an earlier own mapping, which it replaces. */
	| { kind: 'custom'; index: number; keys: string; otherIndex: number; otherKeys: string }
	/** Replaces a default mapping (expected, but worth knowing). */
	| { kind: 'default'; index: number; keys: string; otherKeys: string; otherCommandId: string };

/**
 * What the settings page reports for the user's own leader mappings, in the
 * same terms `resolveLeaderMappings` applies them: a later mapping replaces
 * every earlier one (own or default) it clashes with.
 */
export function findLeaderConflicts(useDefaults: boolean, custom: VimLeaderMapping[]): LeaderConflict[] {
	const conflicts: LeaderConflict[] = [];
	const defaults = useDefaults ? DEFAULT_LEADER_MAPPINGS.map(m => ({ ...m, tokens: parseKeys(m.keys) })) : [];
	const seen: Array<{ index: number; keys: string; tokens: string[] }> = [];
	custom.forEach((mapping, index) => {
		const keys = normalizeLeaderKeys(mapping.keys);
		if (!keys || !mapping.commandId.trim()) {
			conflicts.push({ kind: 'incomplete', index });
			return;
		}
		const tokens = parseKeys(keys);
		for (const other of seen) {
			if (isPrefixConflict(other.tokens, tokens)) {
				conflicts.push({ kind: 'custom', index, keys, otherIndex: other.index, otherKeys: other.keys });
			}
		}
		// `<Nop>` over a default is the documented way to turn it off, not a clash.
		if (mapping.commandId.trim() !== VIM_NOP) {
			for (const other of defaults) {
				if (isPrefixConflict(other.tokens, tokens)) {
					conflicts.push({ kind: 'default', index, keys, otherKeys: other.keys, otherCommandId: other.commandId });
				}
			}
		}
		seen.push({ index, keys, tokens });
	});
	return conflicts;
}
