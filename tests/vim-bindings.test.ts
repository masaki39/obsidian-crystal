import { VIM_LEADER_ACTION, VimBindings } from '../src/features/editor/vim/bindings';
import type { VimActionHandler, VimApi, VimRegisterController } from '../src/features/editor/vim/vim-api';

interface Entry { keys: string; type: string; context?: string; [key: string]: unknown }

/** Mimics CodeMirror Vim's keymap list: mappings are unshifted, unmap removes the first exact match. */
function createFakeVim() {
	const keymap: Entry[] = [
		{ keys: '<Space>', type: 'keyToKey', toKeys: 'l' },
		{ keys: 'j', type: 'motion', motion: 'moveByLines' },
		{ keys: 'k', type: 'motion', motion: 'moveByLines' },
	];
	const initial = keymap.map(entry => ({ ...entry }));
	const actions: Record<string, VimActionHandler> = {};
	const RegisterControllerProto = {
		pushText(this: { pushed: unknown[] }, ...args: unknown[]) { this.pushed.push(args); },
	};
	const controller = Object.assign(Object.create(RegisterControllerProto), { pushed: [] as unknown[] }) as VimRegisterController & { pushed: unknown[] };

	const vim: VimApi = {
		map(lhs, rhs, context) {
			keymap.unshift({ keys: lhs, type: 'keyToKey', toKeys: rhs, ...(context ? { context } : {}) });
		},
		unmap(lhs, context) {
			const index = keymap.findIndex(entry => entry.keys === lhs && entry.context === context);
			if (index < 0) throw new Error('No such mapping.');
			keymap.splice(index, 1);
			return true;
		},
		mapCommand(keys, type, name, args, extra) {
			keymap.unshift({ keys, type, [type]: name, [`${type}Args`]: args, ...extra });
		},
		defineAction(name, handler) { actions[name] = handler; },
		getRegisterController: () => controller,
	};

	/** The entry Vim would pick for these keys in this context (first full match). */
	const lookup = (keys: string, context: string) =>
		keymap.find(entry => entry.keys === keys && (!entry.context || entry.context === context));
	const normalized = () => keymap.map(entry => JSON.stringify(entry)).sort();
	const initialNormalized = initial.map(entry => JSON.stringify(entry)).sort();

	return { vim, keymap, actions, controller, lookup, normalized, initialNormalized };
}

const none = { displayLineMotion: false, yankToClipboard: false, yankHighlight: false, yankToEndOfLine: false, leader: false };

describe('VimBindings', () => {
	it('maps j/k to display-line motions in normal and visual mode only', () => {
		const fake = createFakeVim();
		new VimBindings(fake.vim, jest.fn(), jest.fn()).apply({ ...none, displayLineMotion: true });

		for (const context of ['normal', 'visual']) {
			expect(fake.lookup('j', context)).toMatchObject({ motion: 'moveByDisplayLines', motionArgs: { forward: true } });
			expect(fake.lookup('k', context)).toMatchObject({ motion: 'moveByDisplayLines', motionArgs: { forward: false } });
		}
		expect(fake.lookup('j', 'operatorPending')).toMatchObject({ motion: 'moveByLines' });
	});

	it('binds Space to the leader action in normal mode only', () => {
		const fake = createFakeVim();
		const onLeader = jest.fn();
		new VimBindings(fake.vim, onLeader, jest.fn()).apply({ ...none, leader: true });

		const entry = fake.lookup('<Space>', 'normal');
		expect(entry).toMatchObject({ type: 'action', action: VIM_LEADER_ACTION, context: 'normal' });
		fake.actions[VIM_LEADER_ACTION](null, {}, null);
		expect(onLeader).toHaveBeenCalledTimes(1);

		expect(fake.lookup('<Space>', 'visual')).toMatchObject({ toKeys: 'l' });
		expect(fake.lookup('<Space>', 'operatorPending')).toMatchObject({ toKeys: 'l' });
	});

	it('signals every yank for the highlight, named registers included, but not deletes', () => {
		const fake = createFakeVim();
		const write = jest.fn();
		const onYank = jest.fn();
		new VimBindings(fake.vim, jest.fn(), write, onYank).apply({ ...none, yankHighlight: true });

		fake.controller.pushText(undefined, 'yank', 'word');
		fake.controller.pushText('a', 'yank', 'named');
		fake.controller.pushText(undefined, 'delete', 'gone');

		expect(onYank).toHaveBeenCalledTimes(2);
		// Highlight alone does not touch the clipboard.
		expect(write).not.toHaveBeenCalled();
	});

	it('makes normal-mode Y yank to the end of the line, like D', () => {
		const fake = createFakeVim();
		new VimBindings(fake.vim, jest.fn(), jest.fn()).apply({ ...none, yankToEndOfLine: true });
		expect(fake.lookup('Y', 'normal')).toMatchObject({
			type: 'operatorMotion', operator: 'yank', motion: 'moveToEol', motionArgs: { inclusive: true },
		});
		expect(fake.lookup('Y', 'visual')).toBeUndefined();
	});

	it('leaves Space alone without the leader', () => {
		const fake = createFakeVim();
		new VimBindings(fake.vim, jest.fn(), jest.fn()).apply({ ...none, displayLineMotion: true });
		expect(fake.lookup('<Space>', 'normal')).toMatchObject({ toKeys: 'l' });
	});

	it('writes unnamed yanks to the clipboard, but not deletes or named registers', () => {
		const fake = createFakeVim();
		const write = jest.fn();
		new VimBindings(fake.vim, jest.fn(), write).apply({ ...none, yankToClipboard: true });

		fake.controller.pushText(undefined, 'yank', 'word');
		fake.controller.pushText('"', 'yank', 'line', true);
		fake.controller.pushText(undefined, 'delete', 'gone');
		fake.controller.pushText('a', 'yank', 'named');

		expect(write.mock.calls).toEqual([['word'], ['line\n']]);
		// The original pushText still runs every time.
		expect(fake.controller.pushed).toHaveLength(4);
	});

	it('restores the keymap and the register controller on revert', () => {
		const fake = createFakeVim();
		const write = jest.fn();
		const bindings = new VimBindings(fake.vim, jest.fn(), write);
		bindings.apply({ displayLineMotion: true, yankToClipboard: true, yankHighlight: true, yankToEndOfLine: true, leader: true });
		bindings.revert();

		expect(fake.normalized()).toEqual(fake.initialNormalized);
		expect(Object.prototype.hasOwnProperty.call(fake.controller, 'pushText')).toBe(false);
		fake.controller.pushText(undefined, 'yank', 'word');
		expect(write).not.toHaveBeenCalled();
	});

	it('re-applying replaces the previous bindings instead of stacking them', () => {
		const fake = createFakeVim();
		const write = jest.fn();
		const bindings = new VimBindings(fake.vim, jest.fn(), write);
		const options = { displayLineMotion: true, yankToClipboard: true, yankHighlight: true, yankToEndOfLine: true, leader: true };
		bindings.apply(options);
		const once = fake.normalized();
		bindings.apply(options);

		expect(fake.normalized()).toEqual(once);
		fake.controller.pushText(undefined, 'yank', 'word');
		expect(write).toHaveBeenCalledTimes(1);
	});
});
