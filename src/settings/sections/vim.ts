import { type App, type Command, Notice, TextComponent } from 'obsidian';
import { findLeaderConflicts } from '../../features/editor/vim/leader-conflicts';
import { VIM_NOP } from '../../features/editor/vim/leader-keymap';
import { CommandSuggestModal, commandName } from '../../shared/ui/command-suggest-modal';
import type { CrystalPluginHost } from '../../types';
import { addSetting, settingGroup, toggleSetting } from '../components';
import { DEFAULT_SETTINGS } from '../defaults';
import type { VimLeaderMapping } from '../types';
import { LeaderConflictsModal } from './vim-conflicts-modal';

/** Shown first in the command picker; choosing it disables the key (`<Nop>`). */
const NOP_COMMAND: Command = { id: VIM_NOP, name: 'Do nothing (disable this key)' };

/** Vim extras for Obsidian's built-in Vim mode (see `VimExtensionService`). */
export function renderVimSettings(containerEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	const vim = settingGroup(containerEl, 'Vim');
	addSetting(vim, setting => setting
		.setDesc(createFragment(fragment => {
			fragment.append('Extras for Obsidian\'s built-in Vim mode, which you turn on in ');
			fragment.createEl('strong', { text: 'Settings → Editor → Vim key bindings' });
			fragment.append('. Turn off Vimrc Support or similar plugins that set the same keys.');
		})));
	toggleSetting(vim, plugin, 'Move by display line', 'j and k move by display line (gj and gk) in normal and visual mode, so wrapped lines are not skipped.', 'vimDisplayLineMotion');
	toggleSetting(vim, plugin, 'Y yanks to end of line', 'Y copies from the cursor to the end of the line (y$), like D and C, instead of the whole line (yy).', 'vimYankToEndOfLine');
	toggleSetting(vim, plugin, 'Highlight yanked text', 'Briefly highlight the text you yank, so you can see what was copied.', 'vimYankHighlight');
	toggleSetting(vim, plugin, 'Yank to system clipboard', 'Copy yanked text to the system clipboard, like set clipboard=unnamed. Deletes and named registers stay inside Vim.', 'vimYankToClipboard');

	const rootEl = containerEl.createDiv();
	renderLeader(rootEl, app, plugin);
}

/** Name to show for a mapping's command. */
function describeCommand(app: App, commandId: string): { text: string; missing: boolean } {
	if (!commandId) return { text: 'Select command', missing: false };
	if (commandId === VIM_NOP) return { text: 'Do nothing', missing: false };
	const name = commandName(app, commandId);
	return { text: name ?? commandId, missing: !name };
}

function renderLeader(rootEl: HTMLElement, app: App, plugin: CrystalPluginHost) {
	rootEl.empty();
	const redraw = () => renderLeader(rootEl, app, plugin);
	const settings = plugin.settings;

	// Always assign a new array: the default `[]` is shared with DEFAULT_SETTINGS.
	const commit = async (mappings: VimLeaderMapping[]) => {
		settings.vimLeaderMappings = mappings;
		await plugin.saveSettings();
	};
	/** Opens the command picker; `then` gets the chosen command id. */
	const pickCommand = (then: (commandId: string) => Promise<void>) =>
		new CommandSuggestModal(app, async (command) => {
			await then(command.id);
			redraw();
		}, { extraItems: [NOP_COMMAND] }).open();

	const leader = settingGroup(rootEl, 'Leader key');
	addSetting(leader, setting => setting
		.setName('Default keymap')
		.setDesc('Space followed by a key or two runs a Crystal command in normal mode, e.g. Space d d opens today\'s note. Press Space to see the keys. Your own mappings below take precedence.')
		.addToggle(toggle => toggle
			.setValue(settings.vimDefaultLeaderMappings)
			.onChange(async (value) => {
				settings.vimDefaultLeaderMappings = value;
				await plugin.saveSettings();
				redraw();
			})));
	addSetting(leader, setting => setting
		.setName('Show key hints')
		.setDesc('After Space, show the keys that can come next and what they do.')
		.addToggle(toggle => toggle
			.setValue(settings.vimLeaderHints)
			.onChange(async (value) => {
				settings.vimLeaderHints = value;
				await plugin.saveSettings();
				redraw();
			})));
	addSetting(leader, setting => setting
		.setName('Hint delay')
		.setDesc('Milliseconds to wait before the hints appear, so they stay out of the way when you type a mapping quickly. 0 shows them at once.')
		.addText(text => {
			text.setPlaceholder(String(DEFAULT_SETTINGS.vimLeaderHintDelay))
				.setValue(String(settings.vimLeaderHintDelay))
				.onChange(async (value) => {
					const parsed = parseInt(value, 10);
					settings.vimLeaderHintDelay = Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SETTINGS.vimLeaderHintDelay;
					await plugin.saveSettings();
				});
			text.inputEl.type = 'number';
			text.inputEl.addClass('crystal-vim-hint-delay');
		})
		// After the input exists, so it is disabled too.
		.setDisabled(!settings.vimLeaderHints));

	// Custom mappings (override the defaults)
	const custom = settingGroup(rootEl, 'Your mappings');
	settings.vimLeaderMappings.forEach((mapping, index) => {
		const update = (patch: Partial<VimLeaderMapping>) => commit(settings.vimLeaderMappings.map(
			(entry, i) => i === index ? { ...entry, ...patch } : entry
		));
		const command = describeCommand(app, mapping.commandId);

		addSetting(custom, setting => {
			setting.settingEl.addClass('crystal-vim-mapping-row');
			// Keys on the left, like a hotkey; the command and delete on the right.
			setting.nameEl.createEl('kbd', { cls: 'crystal-vim-mapping-leader', text: 'Space' });
			const keysInput = new TextComponent(setting.nameEl)
				.setPlaceholder('dd')
				.setValue(mapping.keys)
				.onChange(value => update({ keys: value }));
			keysInput.inputEl.addClass('crystal-vim-mapping-keys');

			const commandEl = setting.controlEl.createEl('button', {
				cls: 'crystal-vim-mapping-command',
				text: command.text,
				attr: {
					'aria-label': mapping.commandId && mapping.commandId !== VIM_NOP
						? `${mapping.commandId}${command.missing ? ' (not loaded)' : ''}`
						: 'Select a command to run',
				},
			});
			commandEl.toggleClass('is-missing', command.missing);
			commandEl.toggleClass('is-empty', !mapping.commandId);
			commandEl.addEventListener('click', () => pickCommand(commandId => update({ commandId })));

			setting.addExtraButton(button => button
				.setIcon('trash-2')
				.setTooltip('Delete mapping')
				.onClick(async () => {
					await commit(settings.vimLeaderMappings.filter((_, i) => i !== index));
					redraw();
				}));
		});
	});
	addSetting(custom, setting => setting
		.setName('Add mapping')
		.setDesc('Map Space plus keys to any command, including other plugins\'. A mapping replaces default mappings it clashes with: map d to "Do nothing" to turn off the whole Space d group.')
		.addButton(button => button
			.setButtonText('Add')
			.setCta()
			.onClick(async () => {
				await commit([...settings.vimLeaderMappings, { keys: '', commandId: '' }]);
				redraw();
				const inputs = rootEl.querySelectorAll<HTMLInputElement>('.crystal-vim-mapping-keys');
				inputs[inputs.length - 1]?.focus();
			})));
	addSetting(custom, setting => setting
		.setName('Check for conflicts')
		.setDesc('List your mappings that clash with each other or replace default mappings.')
		.addButton(button => button
			.setButtonText('Check')
			.onClick(() => {
				const conflicts = findLeaderConflicts(settings.vimDefaultLeaderMappings, settings.vimLeaderMappings);
				if (conflicts.length === 0) {
					new Notice('No conflicts in your leader mappings.');
					return;
				}
				new LeaderConflictsModal(app, conflicts, id => describeCommand(app, id).text).open();
			})));
}
