import type { VimApi, VimRegisterController } from './vim-api';

/** The leader key, fixed to Space (`let mapleader = " "`). */
export const VIM_LEADER_KEY = '<Space>';

/** Vim action bound to the leader key. */
export const VIM_LEADER_ACTION = 'crystalLeader';

export interface VimBindingOptions {
	/** `j`/`k` move by display line (`gj`/`gk`) in normal and visual mode. */
	displayLineMotion: boolean;
	/** Unnamed yanks are also written to the system clipboard. */
	yankToClipboard: boolean;
	/** Every yank briefly highlights the yanked text. */
	yankHighlight: boolean;
	/** Normal-mode `Y` yanks to the end of the line (`y$`), like `D` and `C`. */
	yankToEndOfLine: boolean;
	/** Space starts a leader sequence in normal mode (only when there are mappings). */
	leader: boolean;
}

/**
 * Applies the Vim extras to the (global) Vim keymap and takes them back
 * again. Every change records how to undo itself, so `revert()` leaves the
 * keymap exactly as it found it.
 */
export class VimBindings {
	private undo: Array<() => void> = [];

	constructor(
		private vim: VimApi,
		private onLeader: () => void,
		private writeClipboard: (text: string) => void,
		private onYank: () => void = () => {},
	) {}

	apply(options: VimBindingOptions) {
		this.revert();
		if (options.displayLineMotion) this.applyDisplayLineMotion();
		if (options.yankToClipboard || options.yankHighlight) this.applyYankHook(options.yankToClipboard, options.yankHighlight);
		if (options.yankToEndOfLine) this.applyYankToEndOfLine();
		if (options.leader) this.applyLeader();
	}

	revert() {
		const undo = this.undo.reverse();
		this.undo = [];
		for (const step of undo) {
			try {
				step();
			} catch (error) {
				console.error('Crystal: failed to restore a Vim binding', error);
			}
		}
	}

	private unmap(keys: string, context?: string): boolean {
		try {
			return !!this.vim.unmap(keys, context);
		} catch {
			// Newer CodeMirror Vim throws "No such mapping." instead of returning false.
			return false;
		}
	}

	private applyDisplayLineMotion() {
		for (const context of ['normal', 'visual']) {
			for (const [key, forward] of [['j', true], ['k', false]] as const) {
				// A motion (not a key-to-key map) so counts like `5j` work as `5gj`.
				// Operator-pending `dj`/`yk` keep their linewise meaning.
				this.vim.mapCommand(key, 'motion', 'moveByDisplayLines', { forward }, { context });
				this.undo.push(() => this.unmap(key, context));
			}
		}
	}

	/** Wraps the register controller's `pushText`, which every yank goes through. */
	private applyYankHook(toClipboard: boolean, highlight: boolean) {
		const controller: Partial<VimRegisterController> = this.vim.getRegisterController();
		const hadOwn = Object.prototype.hasOwnProperty.call(controller, 'pushText');
		const original = controller.pushText;
		if (!original) return;
		const write = this.writeClipboard;
		const onYank = this.onYank;
		let active = true;

		const wrapped: VimRegisterController['pushText'] = function (this: VimRegisterController, registerName, operator, text, linewise, blockwise) {
			original.call(this, registerName, operator, text, linewise, blockwise);
			if (!active || operator !== 'yank') return;
			if (highlight) onYank();
			// `set clipboard=unnamed`: only yanks to the unnamed register; `"ay`
			// and deletes stay inside Vim. (`"+y` is already handled by Vim.)
			if (toClipboard && (!registerName || registerName === '"')) {
				write(linewise && !text.endsWith('\n') ? `${text}\n` : text);
			}
		};
		controller.pushText = wrapped;

		this.undo.push(() => {
			active = false;
			// If someone wrapped pushText after us, leave theirs in place; ours is now a pass-through.
			if (controller.pushText !== wrapped) return;
			if (hadOwn) controller.pushText = original;
			else delete controller.pushText;
		});
	}

	private applyYankToEndOfLine() {
		// Same shape as Vim's own `D` (delete to end of line); visual `Y` stays linewise.
		this.vim.mapCommand('Y', 'operatorMotion', 'yank', undefined, {
			operator: 'yank', motion: 'moveToEol', motionArgs: { inclusive: true }, context: 'normal',
		});
		this.undo.push(() => this.unmap('Y', 'normal'));
	}

	private applyLeader() {
		this.vim.defineAction(VIM_LEADER_ACTION, () => this.onLeader());
		// A normal-mode mapping put ahead of Space's default `<Space> → l`, so
		// Space starts a leader sequence in normal mode and still moves right
		// in visual and operator-pending mode. The keys after it are read by
		// the leader session, not by Vim.
		this.vim.mapCommand(VIM_LEADER_KEY, 'action', VIM_LEADER_ACTION, {}, { context: 'normal' });
		this.undo.push(() => this.unmap(VIM_LEADER_KEY, 'normal'));
	}
}
