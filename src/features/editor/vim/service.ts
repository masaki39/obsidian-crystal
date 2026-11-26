import { type App, Notice, type Plugin } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import type { CrystalPluginSettings } from '../../../settings';
import { VimBindings } from './bindings';
import { commandName } from './command-suggest';
import { buildLeaderTree, commandIdsUnder, DEFAULT_LEADER_GROUPS, type LeaderNode, resolveLeaderMappings } from './leader-keymap';
import { LeaderSession } from './leader-session';
import { getVimApi } from './vim-api';
import { flashYank, yankHighlightField } from './yank-highlight';

/** `Daily: Open today's note` → `Daily`. */
const categoryOf = (name: string) => /^([^:]+):\s/.exec(name)?.[1] ?? null;

/**
 * A small replacement for Vimrc Support: display-line `j`/`k`, yank to the
 * system clipboard, and a Space-leader keymap (Crystal's defaults plus the
 * user's own) with which-key style hints, applied to Obsidian's built-in Vim
 * mode.
 *
 * The Vim keymap is global (one CodeMirror Vim instance for the whole app),
 * so everything also works in pop-out windows.
 */
export class VimExtensionService {
	private bindings: VimBindings | null = null;
	private session: LeaderSession | null = null;
	private tree: LeaderNode = { children: new Map() };
	private ready = false;
	private unloaded = false;

	constructor(private app: App, private plugin: Plugin, private settings: CrystalPluginSettings) {}

	onload() {
		this.plugin.registerEditorExtension(yankHighlightField);
		this.app.workspace.onLayoutReady(() => {
			if (this.unloaded) return;
			this.ready = true;
			this.apply();
		});
	}

	onunload() {
		this.unloaded = true;
		this.session?.end();
		this.bindings?.revert();
		this.bindings = null;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
		if (this.ready && !this.unloaded) this.apply();
	}

	private apply() {
		if (!this.bindings) {
			const vim = getVimApi();
			if (!vim) return;
			this.bindings = new VimBindings(vim, () => this.startLeader(), text => this.writeClipboard(text), () => {
				const view = this.activeEditorView();
				if (view) flashYank(view);
			});
		}
		const mappings = resolveLeaderMappings(this.settings.vimDefaultLeaderMappings, this.settings.vimLeaderMappings);
		this.tree = buildLeaderTree(mappings);
		this.bindings.apply({
			displayLineMotion: this.settings.vimDisplayLineMotion,
			yankToClipboard: this.settings.vimYankToClipboard,
			yankHighlight: this.settings.vimYankHighlight,
			yankToEndOfLine: this.settings.vimYankToEndOfLine,
			leader: mappings.length > 0,
		});
	}

	private startLeader() {
		this.session?.end();
		// The editor Space was pressed in (its window may be a pop-out).
		const editorEl = this.activeEditorView()?.dom ?? null;
		const win = editorEl?.ownerDocument.defaultView ?? (typeof activeWindow !== 'undefined' ? activeWindow : window);
		const session = new LeaderSession(win, {
			root: this.tree,
			hostEl: editorEl,
			hintDelayMs: this.settings.vimLeaderHints ? Math.max(0, this.settings.vimLeaderHintDelay) : null,
			groupLabel: (keys, node) => this.groupLabel(keys, node),
			commandLabel: id => commandName(this.app, id) ?? id,
			runCommand: id => this.runCommand(id),
			onEnd: () => {
				if (this.session === session) this.session = null;
			},
		});
		this.session = session;
		session.start();
	}

	/** CodeMirror view of the editor being typed in (a pop-out's included). */
	private activeEditorView(): EditorView | null {
		return (this.app.workspace.activeEditor?.editor as unknown as { cm?: EditorView } | undefined)?.cm ?? null;
	}

	/** Default group name, else the category the group's commands share, else a count. */
	private groupLabel(keys: string[], node: LeaderNode): string {
		const known = this.settings.vimDefaultLeaderMappings ? DEFAULT_LEADER_GROUPS[keys.join('')] : undefined;
		if (known) return known;
		const ids = commandIdsUnder(node);
		const categories = new Set(ids.map(id => categoryOf(commandName(this.app, id) ?? '')));
		const [only] = [...categories];
		if (categories.size === 1 && only) return only;
		return `${ids.length} commands`;
	}

	private runCommand(commandId: string) {
		// Run after the key event is done, since the command may switch notes or open a modal.
		window.setTimeout(() => {
			const commands = (this.app as unknown as { commands?: { executeCommandById(id: string): boolean } }).commands;
			if (!commands?.executeCommandById(commandId)) {
				new Notice(`Couldn't run command: ${commandId}`);
			}
		}, 0);
	}

	private writeClipboard(text: string) {
		// The focused window (a pop-out included): clipboard writes need a focused document.
		const win = typeof activeWindow !== 'undefined' ? activeWindow : window;
		win.navigator.clipboard.writeText(text).catch(error => {
			console.error('Crystal: failed to copy the yank to the clipboard', error);
		});
	}
}
