import { type App, type Command, FuzzySuggestModal } from 'obsidian';
import { addVimNavigation } from './suggest-navigation';

interface CommandRegistry {
	commands: Record<string, Command>;
}

/** Every registered command, from Obsidian's (non-public) command registry. */
function commandRegistry(app: App): CommandRegistry | null {
	return (app as unknown as { commands?: CommandRegistry }).commands ?? null;
}

/** Display name of a command, or null when no loaded plugin provides it. */
export function commandName(app: App, commandId: string): string | null {
	return commandRegistry(app)?.commands[commandId]?.name ?? null;
}

export interface CommandSuggestOptions {
	placeholder?: string;
	/** Pseudo commands listed first, ahead of the real ones. */
	extraItems?: Command[];
}

/**
 * Pick any Obsidian command, like the command palette. Ctrl+J / Ctrl+K move
 * the selection as well as the arrow keys.
 */
export class CommandSuggestModal extends FuzzySuggestModal<Command> {
	constructor(app: App, private onChoose: (command: Command) => void, private options: CommandSuggestOptions = {}) {
		super(app);
		this.setPlaceholder(options.placeholder ?? 'Select a command…');
		addVimNavigation(this);
	}

	getItems(): Command[] {
		const commands = Object.values(commandRegistry(this.app)?.commands ?? {});
		return [...(this.options.extraItems ?? []), ...commands.sort((a, b) => a.name.localeCompare(b.name))];
	}

	getItemText(command: Command): string {
		return command.name;
	}

	onChooseItem(command: Command) {
		this.onChoose(command);
	}
}
