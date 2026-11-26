import { type App, type Command, FuzzySuggestModal } from 'obsidian';
import { VIM_NOP } from './leader-keymap';

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

/** Shown first in the picker; choosing it disables the key (`<Nop>`). */
const NOP_COMMAND: Command = { id: VIM_NOP, name: 'Do nothing (disable this key)' };

/** Pick any Obsidian command, like the command palette, or "do nothing". */
export class CommandSuggestModal extends FuzzySuggestModal<Command> {
	constructor(app: App, private onChoose: (command: Command) => void) {
		super(app);
		this.setPlaceholder('Select a command…');
	}

	getItems(): Command[] {
		const commands = Object.values(commandRegistry(this.app)?.commands ?? {});
		return [NOP_COMMAND, ...commands.sort((a, b) => a.name.localeCompare(b.name))];
	}

	getItemText(command: Command): string {
		return command.name;
	}

	onChooseItem(command: Command) {
		this.onChoose(command);
	}
}
