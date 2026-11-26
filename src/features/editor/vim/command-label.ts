/** Crystal's own command ids start with this. */
export const CRYSTAL_COMMAND_PREFIX = 'obsidian-crystal:';

/** `Daily: Open today's note` → [`Daily`, `Open today's note`]; no prefix → null. */
function splitPrefix(name: string): [string, string] | null {
	const match = /^([^:]+):\s+(.+)$/.exec(name);
	return match ? [match[1], match[2]] : null;
}

/** Drops up to `depth` leading `Prefix: ` parts of a command name. */
function dropPrefixes(name: string, depth: number): string {
	let rest = name;
	for (let i = 0; i < depth; i++) {
		const parts = splitPrefix(rest);
		if (!parts) break;
		rest = parts[1];
	}
	return rest;
}

/**
 * A command name shortened for the narrow hint panel: the plugin's name is
 * dropped (`Crystal: AI: Translate` → `AI: Translate`), and for Crystal's own
 * commands the feature name as well (→ `Translate`).
 */
export function shortCommandLabel(commandId: string, name: string): string {
	return dropPrefixes(name, commandId.startsWith(CRYSTAL_COMMAND_PREFIX) ? 2 : 1);
}

/**
 * The category a command belongs to, for naming a group of commands: the
 * feature for Crystal's commands (`Crystal: Daily: Open` → `Daily`), the
 * plugin for others (`Templater: Insert` → `Templater`). Null without one.
 */
export function commandCategory(commandId: string, name: string): string | null {
	const rest = commandId.startsWith(CRYSTAL_COMMAND_PREFIX) ? dropPrefixes(name, 1) : name;
	return splitPrefix(rest)?.[0] ?? null;
}
