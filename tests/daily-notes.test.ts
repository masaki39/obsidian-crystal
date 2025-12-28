import { DailyNotesManager } from '../src/daily-notes';
import { CrystalPluginSettings, DEFAULT_SETTINGS } from '../src/settings';
import { TFile } from 'obsidian';

jest.mock('moment', () => () => ({
	format: () => '12:34'
}));

class MockFile extends TFile {
	path: string;
	name: string;
	extension: string;

	constructor(path: string) {
		super();
		this.path = path;
		const parts = path.split('/');
		this.name = parts[parts.length - 1];
		this.extension = this.name.split('.').pop() || '';
	}
}

class MockVault {
	files = new Map<string, string>();
	folders = new Set<string>();

	getAbstractFileByPath = (path: string) => {
		if (this.files.has(path)) {
			return new MockFile(path);
		}
		if (this.folders.has(path)) {
			return { path };
		}
		return null;
	};

	createFolder = async (path: string) => {
		this.folders.add(path);
		return { path };
	};

	create = async (path: string, content: string) => {
		this.files.set(path, content);
		return new MockFile(path);
	};

	read = async (file: MockFile) => {
		return this.files.get(file.path) || '';
	};

	modify = async (file: MockFile, content: string) => {
		this.files.set(file.path, content);
	};

	process = async (file: MockFile, fn: (data: string) => string) => {
		const current = await this.read(file);
		const next = fn(current);
		await this.modify(file, next);
	};
}

const createManager = (overrides?: Partial<CrystalPluginSettings>) => {
	const settings: CrystalPluginSettings = {
		...DEFAULT_SETTINGS,
		...overrides
	};
	const vault = new MockVault();
	const app = { vault } as any;
	const plugin = { addCommand: jest.fn(), registerEvent: jest.fn() } as any;
	const manager = new DailyNotesManager(app, settings, plugin);
	return { manager, vault, settings };
};

describe('DailyNotesManager appendToTimeline', () => {
	it('appends into existing timeline without touching content above', async () => {
		const { manager, vault } = createManager();
		const filePath = 'DailyNotes/2024-01-02.md';
		const initial = [
			'# Tasks',
			'- [ ] a',
			'',
			'# Time Line',
			'',
			'> [!timeline] 12:34',
			'> old',
			''
		].join('\n');
		await vault.create(filePath, initial);

		await manager.appendToTimeline('new entry', new Date('2024-01-02T00:00:00Z'));

		const final = vault.files.get(filePath);
		expect(final).toBe(
			[
				'# Tasks',
				'- [ ] a',
				'',
				'# Time Line',
				'',
				'> [!timeline] 12:34',
				'> old',
				'',
				'> [!timeline] 12:34',
				'> new entry',
				''
			].join('\n')
		);
	});

	it('creates timeline section when missing and appends block', async () => {
		const { manager, vault } = createManager();
		const filePath = 'DailyNotes/2024-01-03.md';
		const initial = ['# Tasks', '- [ ] a', ''].join('\n');
		await vault.create(filePath, initial);

		await manager.appendToTimeline('first entry', new Date('2024-01-03T00:00:00Z'));

		const final = vault.files.get(filePath);
		expect(final).toBe(
			[
				'# Tasks',
				'- [ ] a',
				'',
				'# Time Line',
				'',
				'> [!timeline] 12:34',
				'> first entry',
				''
			].join('\n')
		);
	});

	it('prepends timeline block when newest first is enabled', async () => {
		const { manager, vault } = createManager({ dailyNoteNewestFirst: true });
		const filePath = 'DailyNotes/2024-01-04.md';
		const initial = [
			'# Tasks',
			'- [ ] a',
			'',
			'# Time Line',
			'',
			'> [!timeline] 12:34',
			'> old',
			''
		].join('\n');
		await vault.create(filePath, initial);

		await manager.appendToTimeline('new entry', new Date('2024-01-04T00:00:00Z'));

		const final = vault.files.get(filePath);
		expect(final).toBe(
			[
				'# Tasks',
				'- [ ] a',
				'',
				'# Time Line',
				'',
				'> [!timeline] 12:34',
				'> new entry',
				'',
				'> [!timeline] 12:34',
				'> old',
				''
			].join('\n')
		);
	});
});

describe('DailyNotesManager auto sort before timeline', () => {
	it('orders list blocks as done → todo → other bullets', () => {
		const { manager } = createManager();
		const before = [
			'- [ ] todo1',
			'- [x] done1',
			'- bullet1',
			'- [ ] todo2',
			'- [x] done2',
			'- bullet2',
			''
		].join('\n');

		const ordered = (manager as any).orderTaskList(before);

		expect(ordered).toBe(
			[
				'- [x] done1',
				'- [x] done2',
				'- [ ] todo1',
				'- [ ] todo2',
				'- bullet1',
				'- bullet2',
				''
			].join('\n')
		);
	});

	it('orders list blocks as todo → done → other bullets when newest first', () => {
		const { manager } = createManager({ dailyNoteNewestFirst: true });
		const before = [
			'- [ ] todo1',
			'- [x] done1',
			'- bullet1',
			'- [ ] todo2',
			'- [x] done2',
			'- bullet2',
			''
		].join('\n');

		const ordered = (manager as any).orderTaskList(before);

		expect(ordered).toBe(
			[
				'- [ ] todo1',
				'- [ ] todo2',
				'- [x] done1',
				'- [x] done2',
				'- bullet1',
				'- bullet2',
				''
			].join('\n')
		);
	});
});
