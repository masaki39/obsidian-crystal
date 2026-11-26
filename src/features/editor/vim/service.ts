import { type App, Notice, type Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';
import type { CrystalPluginSettings } from '../../../settings';
import { VimBindings } from './bindings';
import { commandName } from './command-suggest';
import { buildLeaderTree, commandIdsUnder, DEFAULT_LEADER_GROUPS, DEFAULT_LEADER_MAPPINGS, type LeaderNode, resolveLeaderMappings } from './leader-keymap';
import { LeaderSession } from './leader-session';
import { getVimApi } from './vim-api';
import { flashYank, yankHighlightField } from './yank-highlight';

const DEFAULT_COMMAND_IDS = new Set(DEFAULT_LEADER_MAPPINGS.map(mapping => mapping.commandId));

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
	/** The options last applied to the Vim keymap, to skip re-applying the same. */
	private appliedKey: string | null = null;
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
		this.appliedKey = null;
	}

	updateSettings(settings: CrystalPluginSettings) {
		this.settings = settings;
		if (this.ready && !this.unloaded) this.apply();
	}

	private apply() {
		if (!this.bindings) {
			const vim = getVimApi();
			if (!vim) return;
			this.bindings = new VimBindings(vim, cm => this.startLeader(cm), text => this.writeClipboard(text), () => {
				const view = this.focusedEditorView();
				if (view) flashYank(view);
			});
		}
		const mappings = resolveLeaderMappings(this.settings.vimDefaultLeaderMappings, this.settings.vimLeaderMappings);
		this.tree = buildLeaderTree(mappings);
		const options = {
			displayLineMotion: this.settings.vimDisplayLineMotion,
			yankToClipboard: this.settings.vimYankToClipboard,
			yankHighlight: this.settings.vimYankHighlight,
			yankToEndOfLine: this.settings.vimYankToEndOfLine,
			leader: mappings.length > 0,
		};
		// Every settings save lands here; touch the global Vim keymap only when
		// the Vim options really changed (re-applying unmaps and maps again).
		const key = JSON.stringify(options);
		if (key === this.appliedKey) return;
		this.appliedKey = key;
		this.bindings.apply(options);
	}

	private startLeader(cm: unknown) {
		this.session?.end();
		// The editor Space was pressed in (its window may be a pop-out): Vim's
		// adapter holds its view; fall back to the focused editor.
		const view = (cm as { cm6?: EditorView } | null)?.cm6 ?? this.focusedEditorView();
		const editorEl = view?.dom ?? null;
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

	/** CodeMirror view of the focused editor (in a pop-out, a canvas card or a hover preview too). */
	private focusedEditorView(): EditorView | null {
		const win = typeof activeWindow !== 'undefined' ? activeWindow : window;
		const editorEl = win.document.activeElement?.closest<HTMLElement>('.cm-editor');
		return editorEl ? EditorView.findFromDOM(editorEl) : null;
	}

	/** Default group name, else the category the group's commands share, else a count. */
	private groupLabel(keys: string[], node: LeaderNode): string {
		const ids = commandIdsUnder(node);
		const known = DEFAULT_LEADER_GROUPS[keys.join('')];
		// The default name, unless the user's own mappings have replaced the whole group.
		if (known && this.settings.vimDefaultLeaderMappings && ids.some(id => DEFAULT_COMMAND_IDS.has(id))) return known;
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
