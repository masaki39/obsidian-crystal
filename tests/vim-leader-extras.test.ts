import { commandCategory, shortCommandLabel } from '../src/features/editor/vim/command-label';
import { findLeaderConflicts } from '../src/features/editor/vim/leader-conflicts';
import { VIM_NOP } from '../src/features/editor/vim/leader-keymap';

describe('leader hint labels', () => {
	it('drops the plugin name, and for Crystal the feature name too', () => {
		expect(shortCommandLabel('obsidian-crystal:x', 'Crystal: AI: Translate selection')).toBe('Translate selection');
		expect(shortCommandLabel('obsidian-crystal:x', 'Crystal: Open home page')).toBe('Open home page');
		expect(shortCommandLabel('templater:x', 'Templater: Insert: Template')).toBe('Insert: Template');
		expect(shortCommandLabel('editor:toggle-bold', 'Toggle bold')).toBe('Toggle bold');
	});

	it('names the category: feature for Crystal, plugin otherwise', () => {
		expect(commandCategory('obsidian-crystal:x', 'Crystal: Daily: Open today')).toBe('Daily');
		expect(commandCategory('obsidian-crystal:x', 'Crystal: Open home page')).toBeNull();
		expect(commandCategory('templater:x', 'Templater: Insert')).toBe('Templater');
		expect(commandCategory('editor:x', 'Toggle bold')).toBeNull();
	});
});

describe('findLeaderConflicts', () => {
	it('finds nothing for distinct mappings without defaults', () => {
		expect(findLeaderConflicts(false, [{ keys: 'xa', commandId: 'a:b' }, { keys: 'xb', commandId: 'a:c' }])).toEqual([]);
	});

	it('reports clashes between own mappings (equal or prefix)', () => {
		const conflicts = findLeaderConflicts(false, [
			{ keys: 'x', commandId: 'a:b' },
			{ keys: 'xa', commandId: 'a:c' },
			{ keys: '<leader>x', commandId: 'a:d' },
		]);
		expect(conflicts).toEqual([
			{ kind: 'custom', index: 1, keys: 'xa', otherIndex: 0, otherKeys: 'x' },
			{ kind: 'custom', index: 2, keys: 'x', otherIndex: 0, otherKeys: 'x' },
			{ kind: 'custom', index: 2, keys: 'x', otherIndex: 1, otherKeys: 'xa' },
		]);
	});

	it('reports replaced defaults, but not <Nop> and not with defaults off', () => {
		const conflicts = findLeaderConflicts(true, [{ keys: 'dd', commandId: 'a:b' }, { keys: 'm', commandId: VIM_NOP }]);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]).toMatchObject({ kind: 'default', index: 0, otherKeys: 'dd' });
		expect(findLeaderConflicts(false, [{ keys: 'dd', commandId: 'a:b' }])).toEqual([]);
	});

	it('reports incomplete rows', () => {
		expect(findLeaderConflicts(false, [{ keys: '', commandId: 'a:b' }, { keys: 'x', commandId: ' ' }]))
			.toEqual([{ kind: 'incomplete', index: 0 }, { kind: 'incomplete', index: 1 }]);
	});
});
