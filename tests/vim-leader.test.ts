import * as fs from 'fs';
import * as path from 'path';
import {
	buildLeaderTree, DEFAULT_LEADER_GROUPS, DEFAULT_LEADER_MAPPINGS, formatLeaderKeys, normalizeLeaderKeys,
	parseKeys, resolveLeaderMappings, VIM_NOP, vimKeyFromEvent,
} from '../src/features/editor/vim/leader-keymap';
import { LeaderSession } from '../src/features/editor/vim/leader-session';

/** Every command id registered anywhere under src/. */
function registeredCommandIds(): Set<string> {
	const ids = new Set<string>();
	const walk = (dir: string) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name.endsWith('.ts')) {
				for (const match of fs.readFileSync(full, 'utf8').matchAll(/id: '(crystal-[^']+)'/g)) ids.add(match[1]);
			}
		}
	};
	walk(path.join(__dirname, '../src'));
	return ids;
}

describe('default leader keymap', () => {
	it('only maps commands Crystal registers', () => {
		const ids = registeredCommandIds();
		for (const { commandId } of DEFAULT_LEADER_MAPPINGS) {
			expect(commandId.startsWith('obsidian-crystal:')).toBe(true);
			expect(ids).toContain(commandId.replace('obsidian-crystal:', ''));
		}
	});

	it('has no duplicate keys and no key that is a prefix of another', () => {
		const keys = DEFAULT_LEADER_MAPPINGS.map(mapping => mapping.keys);
		expect(new Set(keys).size).toBe(keys.length);
		for (const a of keys) for (const b of keys) {
			if (a !== b) expect(b.startsWith(a)).toBe(false);
		}
		// Resolving with no overrides keeps every default.
		expect(resolveLeaderMappings(true, [])).toHaveLength(DEFAULT_LEADER_MAPPINGS.length);
	});

	it('names every group prefix', () => {
		for (const { keys } of DEFAULT_LEADER_MAPPINGS) {
			const tokens = parseKeys(keys);
			for (let i = 1; i < tokens.length; i++) {
				expect(DEFAULT_LEADER_GROUPS[tokens.slice(0, i).join('')]).toBeDefined();
			}
		}
	});

	it('keeps the old vimrc daily keys', () => {
		const byKeys = Object.fromEntries(DEFAULT_LEADER_MAPPINGS.map(m => [m.keys, m.commandId]));
		expect(byKeys.dd).toBe('obsidian-crystal:crystal-open-today');
		expect(byKeys.dh).toBe('obsidian-crystal:crystal-open-yesterday');
		expect(byKeys.dl).toBe('obsidian-crystal:crystal-open-tomorrow');
	});
});

describe('key notation', () => {
	it('parses and normalizes keys', () => {
		expect(parseKeys('dd')).toEqual(['d', 'd']);
		expect(parseKeys('a<Space>b<C-x>')).toEqual(['a', '<Space>', 'b', '<C-x>']);
		expect(normalizeLeaderKeys(' <leader>dl ')).toBe('dl');
		expect(normalizeLeaderKeys('a b')).toBe('a<Space>b');
		expect(formatLeaderKeys('mxd')).toBe('Space m x d');
		// Any casing of Vim's key names matches what vimKeyFromEvent returns.
		expect(normalizeLeaderKeys('a<space>b')).toBe('a<Space>b');
		expect(normalizeLeaderKeys('<cr><c-x><Esc><lt>')).toBe('<CR><C-x><Esc><');
	});

	const ev = (key: string, extra: Partial<KeyboardEvent> = {}) =>
		({ key, code: '', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...extra }) as KeyboardEvent;

	it('turns keydowns into Vim keys', () => {
		expect(vimKeyFromEvent(ev('d'))).toBe('d');
		expect(vimKeyFromEvent(ev('D', { shiftKey: true }))).toBe('D');
		expect(vimKeyFromEvent(ev('>', { shiftKey: true }))).toBe('>');
		expect(vimKeyFromEvent(ev(' '))).toBe('<Space>');
		expect(vimKeyFromEvent(ev('Enter'))).toBe('<CR>');
		expect(vimKeyFromEvent(ev('x', { ctrlKey: true }))).toBe('<C-x>');
		expect(vimKeyFromEvent(ev('Shift'))).toBeNull();
	});

	it('uses the physical key with a Japanese IME on', () => {
		expect(vimKeyFromEvent(ev('Process', { code: 'KeyD' }))).toBe('d');
		expect(vimKeyFromEvent(ev('Process', { code: 'KeyJ', shiftKey: true }))).toBe('J');
		expect(vimKeyFromEvent(ev('ｄ', { code: 'KeyD' }))).toBe('d');
	});
});

describe('resolveLeaderMappings', () => {
	it('lets user mappings override defaults with the same keys', () => {
		const resolved = resolveLeaderMappings(true, [{ keys: 'dd', commandId: 'other:cmd' }]);
		expect(resolved.filter(m => m.keys === 'dd')).toEqual([{ keys: 'dd', commandId: 'other:cmd' }]);
	});

	it('disables a key, or a whole group, with <Nop>', () => {
		const one = resolveLeaderMappings(true, [{ keys: 'dd', commandId: VIM_NOP }]);
		expect(one.some(m => m.keys === 'dd')).toBe(false);
		expect(one.some(m => m.keys === 'dh')).toBe(true);

		const group = resolveLeaderMappings(true, [{ keys: 'd', commandId: VIM_NOP }]);
		expect(group.some(m => m.keys.startsWith('d'))).toBe(false);
		expect(group.some(m => m.keys === 'aa')).toBe(true);
	});

	it('drops defaults that clash by prefix', () => {
		const resolved = resolveLeaderMappings(true, [{ keys: 'd', commandId: 'x:y' }]);
		expect(resolved.filter(m => m.keys.startsWith('d'))).toEqual([{ keys: 'd', commandId: 'x:y' }]);
	});

	it('skips incomplete rows and works without defaults', () => {
		expect(resolveLeaderMappings(false, [
			{ keys: '', commandId: 'a:b' },
			{ keys: 'x', commandId: '' },
			{ keys: '<leader>dt', commandId: 'daily-notes-timeline-view:daily-notes-timeline-open' },
		])).toEqual([{ keys: 'dt', commandId: 'daily-notes-timeline-view:daily-notes-timeline-open' }]);
	});
});

describe('LeaderSession', () => {
	function fakeWindow() {
		const listeners = new Map<string, Set<(event: any) => void>>();
		const win = {
			addEventListener: (type: string, fn: (event: any) => void) => {
				if (!listeners.has(type)) listeners.set(type, new Set());
				listeners.get(type)!.add(fn);
			},
			removeEventListener: (type: string, fn: (event: any) => void) => listeners.get(type)?.delete(fn),
			setTimeout: () => 0,
			clearTimeout: () => {},
		};
		const press = (key: string, extra: Record<string, unknown> = {}) => {
			const event = {
				key, code: '', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, repeat: false, isComposing: false,
				preventDefault: jest.fn(), stopImmediatePropagation: jest.fn(), ...extra,
			};
			[...(listeners.get('keydown') ?? [])].forEach(fn => fn(event));
			return event;
		};
		const count = () => [...listeners.values()].reduce((n, set) => n + set.size, 0);
		return { win: win as unknown as Window, press, count, fire: (type: string) => [...(listeners.get(type) ?? [])].forEach(fn => fn({})) };
	}

	function start(win: Window) {
		const runCommand = jest.fn();
		const onEnd = jest.fn();
		const session = new LeaderSession(win, {
			root: buildLeaderTree([{ keys: 'dd', commandId: 'today' }, { keys: 'dh', commandId: 'yesterday' }, { keys: 'x', commandId: 'x' }]),
			hostEl: null,
			hintDelayMs: null,
			groupLabel: () => 'group',
			commandLabel: id => id,
			runCommand,
			onEnd,
		});
		session.start();
		return { runCommand, onEnd };
	}

	it('walks the keys and runs the command, swallowing the keys', () => {
		const fake = fakeWindow();
		const { runCommand, onEnd } = start(fake.win);
		const first = fake.press('d');
		expect(first.preventDefault).toHaveBeenCalled();
		expect(first.stopImmediatePropagation).toHaveBeenCalled();
		fake.press('h');
		expect(runCommand).toHaveBeenCalledWith('yesterday');
		expect(onEnd).toHaveBeenCalled();
		expect(fake.count()).toBe(0);
	});

	it('goes back with Backspace', () => {
		const fake = fakeWindow();
		const { runCommand } = start(fake.win);
		fake.press('d');
		fake.press('Backspace');
		fake.press('x');
		expect(runCommand).toHaveBeenCalledWith('x');
	});

	it('cancels on Esc, an unmapped key, or a click', () => {
		for (const cancel of [
			(f: ReturnType<typeof fakeWindow>) => f.press('Escape'),
			(f: ReturnType<typeof fakeWindow>) => f.press('z'),
			(f: ReturnType<typeof fakeWindow>) => f.fire('mousedown'),
		]) {
			const fake = fakeWindow();
			const { runCommand, onEnd } = start(fake.win);
			fake.press('d');
			cancel(fake);
			expect(onEnd).toHaveBeenCalled();
			expect(fake.count()).toBe(0);
			expect(runCommand).not.toHaveBeenCalled();
		}
	});

	it('ignores lone modifiers', () => {
		const fake = fakeWindow();
		const { runCommand } = start(fake.win);
		fake.press('Shift');
		fake.press('x');
		expect(runCommand).toHaveBeenCalledWith('x');
	});

	it('reads keys typed while an IME is composing by their physical key', () => {
		const fake = fakeWindow();
		const { runCommand } = start(fake.win);
		fake.press('Process', { code: 'KeyD' });
		const second = fake.press('Process', { code: 'KeyD', isComposing: true });
		expect(second.preventDefault).toHaveBeenCalled();
		expect(runCommand).toHaveBeenCalledWith('today');
	});
});
