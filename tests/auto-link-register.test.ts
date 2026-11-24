import { TFile } from 'obsidian';
import { registerDailyNoteAutoLink } from '../src/features/daily-notes/auto-link';
import { getDailyNoteFilePath } from '../src/features/daily-notes/paths';
import { DEFAULT_SETTINGS, CrystalPluginSettings } from '../src/settings';

jest.mock('moment', () => () => ({
	format: () => '12:34'
}));

class MockFile extends TFile {
	path: string;
	name: string;
	extension = 'md';
	constructor(path: string) {
		super();
		this.path = path;
		this.name = path.split('/').pop() as string;
	}
}

/** Fire a vault `create` for `path` and return what was written to today's note. */
function runCreate(path: string, excludeFolders: string[]): string {
	const todayPath = getDailyNoteFilePath(new Date()) as string;
	let content = '# Time Line\n';
	const handlers: Record<string, (file: unknown) => void> = {};
	const app: any = {
		workspace: { onLayoutReady: (cb: () => void) => cb() },
		vault: {
			on: (name: string, cb: (file: unknown) => void) => { handlers[name] = cb; return {}; },
			getAbstractFileByPath: (p: string) => (p === todayPath ? new MockFile(p) : null),
			process: (_f: unknown, fn: (c: string) => string) => { content = fn(content); }
		}
	};
	const plugin: any = { registerEvent: () => {} };
	const settings: CrystalPluginSettings = {
		...DEFAULT_SETTINGS,
		dailyNoteAutoLink: true,
		dailyNoteAutoLinkExcludeFolders: excludeFolders
	};
	registerDailyNoteAutoLink(app, plugin, () => settings);
	handlers['create'](new MockFile(path));
	return content;
}

describe('auto link with excluded folders', () => {
	const excluded = ['kaname/logs'];

	test('links a normal note', () => {
		expect(runCreate('kaname/a.md', excluded)).toContain('- 12:34 [[a]]');
	});

	test('does not link a note directly in an excluded folder', () => {
		expect(runCreate('kaname/logs/a.md', excluded)).not.toContain('[[a]]');
	});

	test('does not link a note in a subfolder of an excluded folder', () => {
		expect(runCreate('kaname/logs/sub/b.md', excluded)).not.toContain('[[b]]');
	});

	test('still links a note in a similarly named folder', () => {
		expect(runCreate('kaname/logs2/c.md', excluded)).toContain('- 12:34 [[c]]');
	});

	test('links everything when the exclude list is empty', () => {
		expect(runCreate('kaname/logs/a.md', [])).toContain('- 12:34 [[a]]');
	});
});
