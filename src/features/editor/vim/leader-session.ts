import { type LeaderNode, vimKeyFromEvent } from './leader-keymap';

export interface LeaderSessionOptions {
	root: LeaderNode;
	/** The editor to show the hints in; null shows them over the window. */
	hostEl: HTMLElement | null;
	/** Show the hint panel; null hides it entirely. */
	hintDelayMs: number | null;
	/** Name of the group reached by `keys` (after Space). */
	groupLabel(keys: string[], node: LeaderNode): string;
	/** Name of a command, as shown in the hint panel. */
	commandLabel(commandId: string): string;
	runCommand(commandId: string): void;
	onEnd(): void;
}

/** Hint panel order: letters a–z (lower before upper), then everything else. */
function compareKeys(a: string, b: string): number {
	const rank = (key: string) => /^[a-z]$/i.test(key) ? 0 : 1;
	return rank(a) - rank(b)
		|| a.toLowerCase().localeCompare(b.toLowerCase())
		|| (a === a.toLowerCase() ? -1 : 1);
}

/**
 * One press of the leader: reads the following keys itself (ahead of the
 * editor and Obsidian's hotkeys) and walks the leader key tree, showing the
 * keys that can come next, like which-key. A command key runs the command;
 * Esc, an unmapped key, a click or leaving the window cancels; Backspace
 * goes back one key.
 */
export class LeaderSession {
	private path: string[] = [];
	private node: LeaderNode;
	private hintEl: HTMLElement | null = null;
	private hintTimer: number | null = null;
	private ended = false;

	constructor(private win: Window, private options: LeaderSessionOptions) {
		this.node = options.root;
	}

	start() {
		this.win.addEventListener('keydown', this.onKeyDown, true);
		this.win.addEventListener('mousedown', this.cancel, true);
		this.win.addEventListener('blur', this.cancel);
		const { hintDelayMs } = this.options;
		if (hintDelayMs === null) return;
		if (hintDelayMs <= 0) this.render();
		else this.hintTimer = this.win.setTimeout(() => this.render(), hintDelayMs);
	}

	end() {
		if (this.ended) return;
		this.ended = true;
		this.win.removeEventListener('keydown', this.onKeyDown, true);
		this.win.removeEventListener('mousedown', this.cancel, true);
		this.win.removeEventListener('blur', this.cancel);
		if (this.hintTimer !== null) this.win.clearTimeout(this.hintTimer);
		this.hintEl?.remove();
		this.hintEl = null;
		this.options.onEnd();
	}

	private cancel = () => this.end();

	private onKeyDown = (event: KeyboardEvent) => {
		if (event.isComposing) return;
		const key = vimKeyFromEvent(event);
		if (key === null) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		if (event.repeat) return;

		if (event.key === 'Escape' || key === '<C-[>') {
			this.end();
			return;
		}
		if (event.key === 'Backspace' && this.path.length > 0) {
			this.path.pop();
			this.node = this.path.reduce<LeaderNode>((node, k) => node.children.get(k) ?? node, this.options.root);
			this.rerender();
			return;
		}

		const next = this.node.children.get(key);
		if (!next) {
			this.end();
			return;
		}
		if (next.commandId) {
			const commandId = next.commandId;
			this.end();
			this.options.runCommand(commandId);
			return;
		}
		this.path.push(key);
		this.node = next;
		this.rerender();
	};

	private rerender() {
		if (this.hintEl) this.render();
	}

	private render() {
		this.hintTimer = null;
		if (this.ended) return;
		this.hintEl?.remove();
		const host = this.options.hostEl?.isConnected ? this.options.hostEl : this.win.document.body;
		const panel = this.hintEl = host.createDiv({ cls: 'crystal-leader-hints' });
		panel.toggleClass('is-in-editor', host !== this.win.document.body);

		const header = panel.createDiv({ cls: 'crystal-leader-hints-header' });
		header.createEl('kbd', { text: ['Space', ...this.path].join(' ') });
		if (this.path.length > 0) {
			header.createSpan({ cls: 'crystal-leader-hints-group', text: this.options.groupLabel(this.path, this.node) });
		}

		const grid = panel.createDiv({ cls: 'crystal-leader-hints-grid' });
		const keys = [...this.node.children.keys()].sort(compareKeys);
		for (const key of keys) {
			const child = this.node.children.get(key)!;
			const item = grid.createDiv({ cls: 'crystal-leader-hints-item' });
			item.createEl('kbd', { text: key === '<Space>' ? 'Space' : key });
			if (child.commandId) {
				item.createSpan({ text: this.options.commandLabel(child.commandId) });
			} else {
				item.addClass('is-group');
				item.createSpan({ text: `+${this.options.groupLabel([...this.path, key], child)}` });
			}
		}

		panel.createDiv({
			cls: 'crystal-leader-hints-footer',
			text: this.path.length > 0 ? 'Esc cancel · Backspace back' : 'Esc cancel',
		});
	}
}
