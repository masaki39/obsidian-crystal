import { type App, Modal } from 'obsidian';
import type { LeaderConflict } from '../../features/editor/vim/leader-conflicts';
import { formatLeaderKeys } from '../../features/editor/vim/leader-keymap';
import { createModalTitle } from '../../shared/ui/modal-markup';

/** Lists what "Check for conflicts" found in the user's leader mappings. */
export class LeaderConflictsModal extends Modal {
	constructor(app: App, private conflicts: LeaderConflict[], private describeCommand: (commandId: string) => string) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		createModalTitle(contentEl, 'Leader mapping conflicts');
		const groups: Array<[string, LeaderConflict['kind']]> = [
			['These mappings clash with an earlier one of yours, which they replace:', 'custom'],
			['These mappings replace default mappings:', 'default'],
			['These rows are ignored until both keys and a command are set:', 'incomplete'],
		];
		for (const [heading, kind] of groups) {
			const items = this.conflicts.filter(conflict => conflict.kind === kind);
			if (items.length === 0) continue;
			contentEl.createEl('p', { text: heading });
			const list = contentEl.createEl('ul', { cls: 'crystal-vim-conflicts' });
			for (const conflict of items) list.createEl('li', { text: this.describe(conflict) });
		}
	}

	onClose() {
		this.contentEl.empty();
	}

	private describe(conflict: LeaderConflict): string {
		const row = `Row ${conflict.index + 1}`;
		switch (conflict.kind) {
			case 'incomplete':
				return row;
			case 'custom':
				return `${row}: ${formatLeaderKeys(conflict.keys)} ↔ row ${conflict.otherIndex + 1}: ${formatLeaderKeys(conflict.otherKeys)}`;
			case 'default':
				return `${row}: ${formatLeaderKeys(conflict.keys)} replaces ${formatLeaderKeys(conflict.otherKeys)} (${this.describeCommand(conflict.otherCommandId)})`;
		}
	}
}
