/**
 * The parts of Obsidian's bundled CodeMirror Vim (`window.CodeMirrorAdapter.Vim`)
 * this plugin uses. Not a public API: everything is looked up defensively so
 * a future Obsidian change only disables the Vim extras instead of breaking
 * the plugin.
 */
export interface VimRegisterController {
	pushText(registerName: string | null | undefined, operator: string, text: string, linewise?: boolean, blockwise?: boolean): void;
}

export type VimActionHandler = (cm: unknown, actionArgs: Record<string, unknown>, vim: unknown) => void;

export interface VimApi {
	map(lhs: string, rhs: string, context?: string): void;
	/** Removes the first mapping with exactly these keys and context. */
	unmap(lhs: string, context?: string): boolean | void;
	mapCommand(keys: string, type: string, name: string, args?: Record<string, unknown>, extra?: Record<string, unknown>): void;
	defineAction(name: string, handler: VimActionHandler): void;
	getRegisterController(): VimRegisterController;
}

export function getVimApi(): VimApi | null {
	const vim = (window as unknown as { CodeMirrorAdapter?: { Vim?: Partial<VimApi> } }).CodeMirrorAdapter?.Vim;
	const required: Array<keyof VimApi> = ['map', 'unmap', 'mapCommand', 'defineAction', 'getRegisterController'];
	if (!vim || required.some(name => typeof vim[name] !== 'function')) return null;
	return vim as VimApi;
}
